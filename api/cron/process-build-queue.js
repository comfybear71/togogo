// Cron: process pending store_build_queue rows.
//
// For each queued keyword:
//   1. Call AliExpress text.search
//   2. Insert any new products into the shared user_products pool
//   3. Mark the queue row as 'done' with products_found count
//
// Conservative batch (5 keywords/run, 30 products/keyword) to stay under
// Vercel's 60s function timeout. Scheduled every minute so a 100-keyword
// build completes in ~20 minutes. Newly-added products skip the heavy
// freight + product-detail enrichment — the enrich-products cron picks
// those up on its own schedule.
//
// Auth: Vercel cron header, CRON_SECRET, or signed admin JWT.
import { sql, ensureSchema } from '../_lib/db.js'
import { searchAliExpressDirect } from '../_lib/suppliers.js'

const BATCH_SIZE = 5
const PRODUCTS_PER_KEYWORD = 30
const PER_KEYWORD_TIMEOUT_MS = 8000

async function processOne(row, usdToAud, defaultMarkup) {
  const keyword = row.keyword
  let products = []
  try {
    // searchAliExpressDirect returns { products: [...], total: N } (not a bare array).
    // On timeout we default to { products: [] } so the shape stays consistent.
    const searchResult = await Promise.race([
      searchAliExpressDirect(keyword, 1, { pageSize: PRODUCTS_PER_KEYWORD, country: 'AU' }),
      new Promise(r => setTimeout(() => r({ products: [] }), PER_KEYWORD_TIMEOUT_MS)),
    ])
    products = Array.isArray(searchResult?.products) ? searchResult.products : []
  } catch (err) {
    return { error: `search failed: ${err.message}` }
  }

  if (products.length === 0) {
    return { productsFound: 0, tagged: 0 }
  }

  let inserted = 0
  let tagged = 0
  const niche = row.niche || null
  for (const p of products) {
    const aeId = String(p.productId || p.id || '').replace('ae_', '')
    if (!aeId) continue

    // If product already exists, just append this niche to its niches[]
    // so multi-niche products (e.g. phone accessories + electronics) show
    // on every relevant store
    try {
      const { rows: existing } = await sql`
        SELECT id, niches FROM user_products WHERE supplier_product_id = ${aeId} LIMIT 1
      `
      if (existing.length > 0) {
        if (niche) {
          const current = Array.isArray(existing[0].niches) ? existing[0].niches : []
          if (!current.includes(niche)) {
            try {
              await sql`
                UPDATE user_products
                SET niches = array_append(COALESCE(niches, ARRAY[]::TEXT[]), ${niche})
                WHERE id = ${existing[0].id}
              `
              tagged++
            } catch { /* non-critical */ }
          }
        }
        continue
      }
    } catch { continue }

    const productCostUSD = parseFloat(p.cost) || 0
    const productCostAUD = Math.round(productCostUSD * usdToAud * 100) / 100
    const wholesaleCost = productCostAUD
    const salePrice = Math.ceil(wholesaleCost * defaultMarkup * 100) / 100
    if (salePrice > 1000) continue

    const imgArray = Array.isArray(p.images) ? p.images : []
    const nichesArr = niche ? [niche] : []
    try {
      await sql`
        INSERT INTO user_products (
          user_id, title, description, image, images, supplier,
          supplier_product_id, supplier_cost, sale_price,
          api_price, shipping_cost, tax_amount,
          price_currency, category, is_active,
          product_rating, orders_count, original_price, discount_percent,
          niches
        ) VALUES (
          ${row.user_id}, ${p.title}, ${p.title || ''},
          ${p.image || imgArray[0] || ''}, ${imgArray},
          'AliExpress', ${aeId},
          ${wholesaleCost}, ${salePrice},
          ${productCostAUD}, 0, 0,
          'AUD', ${row.category || 'General'}, true,
          ${parseFloat(p.rating) || 0}, ${parseInt(p.orders) || 0},
          0, 0,
          ${nichesArr}
        )
      `
      inserted++
    } catch (err) {
      // Likely duplicate from concurrent insert — fine
    }
  }

  return { productsFound: inserted, tagged }
}

export default async function handler(req, res) {
  const authHeader = req.headers.authorization
  const cronSecret = process.env.CRON_SECRET
  const querySecret = req.query.secret

  let authorized = false
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) authorized = true
  if (querySecret === process.env.JWT_SECRET) authorized = true
  if (!authorized && querySecret) {
    try {
      const { verifyToken } = await import('../_lib/auth.js')
      const payload = verifyToken(querySecret)
      if (payload && payload.role === 'admin') authorized = true
    } catch { /* fall through */ }
  }
  if (!authorized) return res.status(401).json({ error: 'Unauthorized' })

  await ensureSchema()

  // Exchange rate + markup
  let usdToAud = 1.45
  let defaultMarkup = 1.3
  try {
    const { rows } = await sql`SELECT key, value FROM admin_settings WHERE key IN ('usd_to_aud_rate', 'default_markup')`
    for (const r of rows) {
      if (r.key === 'usd_to_aud_rate') usdToAud = parseFloat(r.value) || 1.45
      if (r.key === 'default_markup') defaultMarkup = parseFloat(r.value) || 1.3
    }
  } catch { /* defaults */ }

  // Lock + grab the next batch (oldest pending first)
  const { rows: batch } = await sql`
    SELECT id, store_id, user_id, niche, category, keyword
    FROM store_build_queue
    WHERE status = 'pending'
    ORDER BY created_at ASC
    LIMIT ${BATCH_SIZE}
  `

  if (batch.length === 0) {
    return res.json({ status: 'idle', message: 'Queue empty' })
  }

  // Mark them processing so a parallel cron run doesn't double-fetch
  const ids = batch.map(r => r.id)
  await sql.query(
    `UPDATE store_build_queue SET status = 'processing' WHERE id = ANY($1)`,
    [ids]
  )

  let totalProductsFound = 0
  const results = []
  for (const row of batch) {
    const result = await processOne(row, usdToAud, defaultMarkup)
    if (result.error) {
      await sql`
        UPDATE store_build_queue
        SET status = 'failed', error = ${result.error}, processed_at = NOW()
        WHERE id = ${row.id}
      `
      results.push({ keyword: row.keyword, error: result.error })
    } else {
      // Count BOTH fresh inserts and existing products newly-tagged with
      // this niche — both represent products that just became visible on
      // this niched store
      const combined = (result.productsFound || 0) + (result.tagged || 0)
      await sql`
        UPDATE store_build_queue
        SET status = 'done', products_found = ${combined}, processed_at = NOW()
        WHERE id = ${row.id}
      `
      totalProductsFound += combined
      results.push({
        keyword: row.keyword,
        productsFound: combined,
        newInserts: result.productsFound || 0,
        tagged: result.tagged || 0,
      })
    }
  }

  return res.json({
    status: 'ok',
    processed: batch.length,
    totalProductsFound,
    results,
  })
}
