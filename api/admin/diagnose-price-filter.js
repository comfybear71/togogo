// Price-filter diagnostic. Returns the exact numbers a storefront
// uses to bucket products into Under $10 / $10-$20 / $20-$50 / Over
// $50, plus a 10-product sample for the requested bucket showing
// stored sale_price vs computed displayed price. Used to nail down
// why customers see A$8.11 cards in the "$10–$20" bucket on Annie's
// shop — somewhere stored values disagree with the formula and this
// endpoint exposes which side is wrong.
//
// GET /api/admin/diagnose-price-filter?secret=JWT&subdomain=annies-shop&bucket=10to20
//
// Response shape:
//   {
//     audRate, markupPercent, markupMultiplier,
//     thresholds: { t10s, t20s, t50s },
//     bucket: { name, sqlClause, count },
//     sample: [{ id, title, sale_price, displayed_aud, in_bucket_per_sql, in_bucket_per_displayed }]
//   }
import { sql } from '../_lib/db.js'
import { getAudRate, usdToAud } from '../_lib/pricing.js'

export default async function handler(req, res) {
  const secret = req.query.secret
  let authorized = secret === process.env.JWT_SECRET
  if (!authorized && secret) {
    try {
      const { verifyToken } = await import('../_lib/auth.js')
      const payload = verifyToken(secret)
      if (payload && payload.role === 'admin') authorized = true
    } catch {}
  }
  if (!authorized) return res.status(401).json({ error: 'Unauthorized' })

  const subdomain = req.query.subdomain
  const bucket = req.query.bucket || '10to20'
  if (!subdomain) return res.status(400).json({ error: 'subdomain query param required' })

  try {
    const { rows: stores } = await sql`
      SELECT s.id, s.subdomain, s.markup_percent, s.niche, s.niches, u.id AS owner_id
      FROM user_stores s JOIN users u ON u.id = s.user_id
      WHERE s.subdomain = ${subdomain} AND s.status = 'active'
    `
    if (!stores[0]) return res.status(404).json({ error: 'Store not found' })
    const store = stores[0]

    const audRate = await getAudRate()
    const markupPercent = parseFloat(store.markup_percent ?? 40) || 0
    const markupMultiplier = 1 + markupPercent / 100

    // Replicate the storefront's threshold math exactly. If anything
    // looks off here, the bug is at this layer.
    const t10s = (10 / audRate / markupMultiplier).toFixed(4)
    const t20s = (20 / audRate / markupMultiplier).toFixed(4)
    const t50s = (50 / audRate / markupMultiplier).toFixed(4)

    const buckets = {
      under10: { name: 'Under $10', sqlClause: `sale_price < ${t10s}` },
      '10to20': { name: '$10–$20', sqlClause: `sale_price >= ${t10s} AND sale_price < ${t20s}` },
      '20to50': { name: '$20–$50', sqlClause: `sale_price >= ${t20s} AND sale_price < ${t50s}` },
      over50:  { name: 'Over $50', sqlClause: `sale_price >= ${t50s}` },
    }
    const bk = buckets[bucket]
    if (!bk) return res.status(400).json({ error: `Unknown bucket "${bucket}". Use under10|10to20|20to50|over50` })

    const storeNiches = Array.isArray(store.niches) && store.niches.length > 0
      ? store.niches
      : (store.niche ? [store.niche] : [])
    const nicheWhere = storeNiches.length > 0
      ? ` AND niches && ARRAY[${storeNiches.map(n => `'${String(n).replace(/'/g, "''")}'`).join(',')}]::TEXT[]`
      : ''
    const ownerWhere = ` AND user_id = '${store.owner_id}'`
    const pricedWhere = ` AND variants_updated_at IS NOT NULL AND price_currency = 'USD' AND COALESCE(min_variant_price_usd, 0) > 0`

    const baseInner = `
      SELECT DISTINCT ON (supplier_product_id) id, title, sale_price, supplier_product_id
      FROM user_products
      WHERE is_active = true${ownerWhere}${nicheWhere}${pricedWhere}
      ORDER BY supplier_product_id, created_at DESC
    `

    const countResult = await sql.query(
      `SELECT COUNT(*)::int AS total FROM (${baseInner}) p WHERE ${bk.sqlClause}`,
      []
    )
    const count = countResult.rows[0]?.total || 0

    const sampleResult = await sql.query(
      `SELECT id, title, sale_price FROM (${baseInner}) p
       WHERE ${bk.sqlClause}
       ORDER BY sale_price DESC LIMIT 10`,
      []
    )

    const sample = sampleResult.rows.map(p => {
      const salePriceUsd = parseFloat(p.sale_price) || 0
      const markedUsd = Math.round(salePriceUsd * markupMultiplier * 100) / 100
      const displayedAud = usdToAud(markedUsd, audRate)
      // Reverse-check: would this displayed price actually fall in
      // the requested bucket if a customer used the customer-facing
      // boundaries directly (10/20/50)?
      let inBucketPerDisplayed
      if (bucket === 'under10') inBucketPerDisplayed = displayedAud < 10
      else if (bucket === '10to20') inBucketPerDisplayed = displayedAud >= 10 && displayedAud < 20
      else if (bucket === '20to50') inBucketPerDisplayed = displayedAud >= 20 && displayedAud < 50
      else inBucketPerDisplayed = displayedAud >= 50
      return {
        id: p.id,
        title: (p.title || '').slice(0, 70),
        sale_price_usd: salePriceUsd,
        displayed_aud: displayedAud,
        in_bucket_per_sql: true, // it survived the SQL filter
        in_bucket_per_displayed: inBucketPerDisplayed,
      }
    })

    const mismatches = sample.filter(s => !s.in_bucket_per_displayed)

    return res.json({
      subdomain,
      audRate,
      markupPercent,
      markupMultiplier,
      thresholds: { t10s, t20s, t50s },
      bucket: { ...bk, count, key: bucket },
      mismatches: mismatches.length,
      verdict: mismatches.length === 0
        ? 'OK — every sample product satisfies both the SQL filter and the customer-facing bucket boundary.'
        : 'BUG — sample products satisfy the SQL filter but fall outside the bucket when the displayed price is computed. See the sample for which side disagrees.',
      sample,
    })
  } catch (err) {
    console.error('[diagnose-price-filter] Error:', err)
    return res.status(500).json({ error: err.message })
  }
}
