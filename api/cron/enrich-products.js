// Cron: enrich existing user_products rows with real AE data
//
// Targets products that are missing real metrics — rating = 0 AND
// orders_count = 0 AND shipping_cost = 0 — which typically means they
// were imported before ds.product.get / ds.freight.query were wired,
// or before the phase 2b fixes. Processes in small batches to respect
// Vercel's 60s function timeout and AE API rate limits.
//
// Schedule: every 6 hours, offset from import-products by 30 min so the
// two crons don't compete. Runs the oldest-updated batch first.
//
// Auth: Vercel cron header, CRON_SECRET, or JWT_SECRET (manual trigger).
import { sql, ensureSchema } from '../_lib/db.js'
import { getProductDetails, queryDSFreight } from '../_lib/suppliers.js'

const BATCH_SIZE = 15
const PER_PRODUCT_TIMEOUT_MS = 6000

async function enrichOne(row, usdToAud) {
  const aeId = (row.supplier_product_id || '').replace('ae_', '')
  if (!aeId || aeId.includes('-')) return { skipped: true, reason: 'invalid_ae_id' }

  const details = await Promise.race([
    getProductDetails(aeId),
    new Promise(r => setTimeout(() => r(null), PER_PRODUCT_TIMEOUT_MS)),
  ])
  if (!details) return { skipped: true, reason: 'details_timeout' }

  const firstSkuId = details.variants?.[0]?.skuId || ''
  const freightOptions = await Promise.race([
    queryDSFreight(aeId, 'AU', 1, firstSkuId),
    new Promise(r => setTimeout(() => r(null), PER_PRODUCT_TIMEOUT_MS)),
  ])

  const rating = details.rating || 0
  const ordersCount = details.orders || 0
  const discountPercent = details.discountPercent || 0
  const originalPriceUSD = details.originalPrice || 0
  const originalPriceAUD = originalPriceUSD > 0
    ? Math.round(originalPriceUSD * usdToAud * 100) / 100
    : row.original_price || 0

  let shippingAUD = parseFloat(row.shipping_cost) || 0
  if (freightOptions && freightOptions.length > 0) {
    const cheapest = freightOptions.reduce((min, o) => o.cost < min.cost ? o : min, freightOptions[0])
    shippingAUD = Math.round(cheapest.cost * usdToAud * 100) / 100
  }

  await sql`
    UPDATE user_products
    SET product_rating = ${rating},
        orders_count = ${ordersCount},
        discount_percent = ${discountPercent},
        original_price = ${originalPriceAUD},
        shipping_cost = ${shippingAUD},
        updated_at = NOW()
    WHERE id = ${row.id}
  `

  return { enriched: true, rating, ordersCount, discountPercent, shippingAUD }
}

export default async function handler(req, res) {
  const authHeader = req.headers.authorization
  const cronSecret = process.env.CRON_SECRET
  const querySecret = req.query.secret

  let authorized = false
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) authorized = true
  if (querySecret === process.env.JWT_SECRET) authorized = true
  // Accept signed admin JWT from localStorage (same pattern as import-products)
  if (!authorized && querySecret) {
    try {
      const { verifyToken } = await import('../_lib/auth.js')
      const payload = verifyToken(querySecret)
      if (payload && payload.role === 'admin') authorized = true
    } catch { /* fall through */ }
  }
  if (!authorized) return res.status(401).json({ error: 'Unauthorized' })

  await ensureSchema()

  // Exchange rate for USD→AUD conversion
  let usdToAud = 1.45
  try {
    const { rows } = await sql`SELECT value FROM admin_settings WHERE key = 'usd_to_aud_rate'`
    if (rows[0]) usdToAud = parseFloat(rows[0].value) || 1.45
  } catch { /* default */ }

  // Pick batch: products missing any enrichment field, excluding those we
  // already attempted in the last 6 hours (some AE products genuinely have
  // no rating/orders — we'd otherwise re-process them forever).
  const { rows: batch } = await sql`
    SELECT id, supplier_product_id, shipping_cost, original_price
    FROM user_products
    WHERE is_active = true
      AND supplier_product_id IS NOT NULL
      AND supplier_product_id NOT LIKE '%-%'
      AND (product_rating = 0 OR orders_count = 0 OR shipping_cost = 0)
      AND (updated_at IS NULL OR updated_at < NOW() - INTERVAL '6 hours')
    ORDER BY updated_at ASC NULLS FIRST
    LIMIT ${BATCH_SIZE}
  `

  console.log(`[Cron enrich-products] Batch size: ${batch.length}`)

  if (batch.length === 0) {
    return res.json({ status: 'idle', message: 'No products need enrichment' })
  }

  let enriched = 0
  let skipped = 0
  const errors = []

  for (const row of batch) {
    try {
      const result = await enrichOne(row, usdToAud)
      if (result.enriched) enriched++
      else skipped++
    } catch (err) {
      errors.push({ id: row.id, error: err.message })
    }
  }

  console.log(`[Cron enrich-products] Done: enriched=${enriched}, skipped=${skipped}, errors=${errors.length}`)

  return res.json({
    status: 'ok',
    batchSize: batch.length,
    enriched,
    skipped,
    errors: errors.slice(0, 5),
  })
}
