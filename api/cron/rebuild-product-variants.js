// Cron: rebuild variant data + break-even USD pricing for existing products.
//
// Heals the ~7000 products in user_products that were imported under the old
// pricing model (mislabelled USD as AUD, stored cheapest-variant price only,
// no variant data for color/size UX). Processes 10 products per run, 6s per
// product timeout, scheduled every minute — chews through the backlog at
// ~600 products per hour while staying under Vercel's 60s function cap.
//
// Per product:
//   1. Call aliexpress.ds.product.get for full SKU list
//   2. Call aliexpress.ds.freight.query (cheapest SKU) for shipping baseline
//   3. Compute break-even USD: min(sku_price) + shipping + 14% tax
//   4. Overwrite sale_price, supplier_cost, variants JSONB, min/max prices,
//      shipping_usd, price_currency='USD', variants_updated_at=now
//   5. If AE says the product is no longer available → deactivate the row
//
// Auth: Vercel cron header, CRON_SECRET, or signed admin JWT.
//
// Picking order: oldest variants_updated_at first (NULLs first). A product
// freshly touched by this cron is skipped for 24h to prevent replay.
import { sql, ensureSchema } from '../_lib/db.js'
import { getProductDetails, queryDSFreight } from '../_lib/suppliers.js'
import { summarisePricing } from '../_lib/pricing.js'

const BATCH_SIZE = 10
const PER_PRODUCT_TIMEOUT_MS = 6000

async function rebuildOne(row) {
  const aeId = (row.supplier_product_id || '').replace('ae_', '')
  if (!aeId || aeId.includes('-')) return { skipped: true, reason: 'invalid_ae_id' }

  const details = await Promise.race([
    getProductDetails(aeId),
    new Promise(r => setTimeout(() => r(null), PER_PRODUCT_TIMEOUT_MS)),
  ])

  if (!details) {
    // Couldn't fetch — mark attempted so we don't re-pick immediately,
    // but don't deactivate (might be a transient timeout)
    await sql`
      UPDATE user_products SET variants_updated_at = NOW() WHERE id = ${row.id}
    `
    return { skipped: true, reason: 'details_unavailable' }
  }

  if (!Array.isArray(details.variants) || details.variants.length === 0) {
    // No variants returned → product is probably delisted. Deactivate.
    await sql`
      UPDATE user_products
      SET is_active = false, variants_updated_at = NOW()
      WHERE id = ${row.id}
    `
    return { deactivated: true, reason: 'no_variants' }
  }

  // Shipping via cheapest SKU — good enough baseline
  let shippingUsd = 0
  try {
    const firstSkuId = details.variants[0]?.skuId || ''
    const freight = await Promise.race([
      queryDSFreight(aeId, 'AU', 1, firstSkuId),
      new Promise(r => setTimeout(() => r(null), PER_PRODUCT_TIMEOUT_MS)),
    ])
    if (Array.isArray(freight) && freight.length > 0) {
      const cheapest = freight.reduce((m, o) => o.cost < m.cost ? o : m, freight[0])
      shippingUsd = cheapest.cost || 0
    }
  } catch { /* keep 0 */ }

  const summary = summarisePricing(details.variants, shippingUsd)
  const salePriceUsd = summary.breakEvenMinUsd
  if (salePriceUsd <= 0) {
    await sql`
      UPDATE user_products
      SET is_active = false, variants_updated_at = NOW()
      WHERE id = ${row.id}
    `
    return { deactivated: true, reason: 'zero_break_even' }
  }

  // Overwrite pricing fields in USD. Leaves title/images/category alone.
  await sql`
    UPDATE user_products
    SET supplier_cost = ${salePriceUsd},
        sale_price = ${salePriceUsd},
        api_price = ${summary.minUsd},
        shipping_cost = ${shippingUsd},
        shipping_usd = ${shippingUsd},
        tax_amount = 0,
        price_currency = 'USD',
        variants = ${JSON.stringify(details.variants)}::jsonb,
        min_variant_price_usd = ${summary.minUsd},
        max_variant_price_usd = ${summary.maxUsd},
        product_rating = ${details.rating || row.product_rating || 0},
        orders_count = ${details.orders || row.orders_count || 0},
        discount_percent = ${details.discountPercent || 0},
        original_price = ${details.originalPrice || 0},
        variants_updated_at = NOW(),
        updated_at = NOW()
    WHERE id = ${row.id}
  `

  return {
    rebuilt: true,
    priceRangeUsd: [summary.minUsd, summary.maxUsd],
    variantCount: details.variants.length,
    shippingUsd,
  }
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
    } catch { /* */ }
  }
  if (!authorized) return res.status(401).json({ error: 'Unauthorized' })

  await ensureSchema()

  // Pick oldest variants_updated_at first (NULLs first = never rebuilt).
  // Exclude anything we've already touched in the last 24h so we don't
  // rebuild the same rows over and over.
  const { rows: batch } = await sql`
    SELECT id, supplier_product_id, product_rating, orders_count
    FROM user_products
    WHERE is_active = true
      AND supplier_product_id IS NOT NULL
      AND supplier_product_id NOT LIKE '%-%'
      AND (variants_updated_at IS NULL OR variants_updated_at < NOW() - INTERVAL '24 hours')
    ORDER BY variants_updated_at ASC NULLS FIRST
    LIMIT ${BATCH_SIZE}
  `

  if (batch.length === 0) {
    return res.json({ status: 'idle', message: 'All products rebuilt within 24h' })
  }

  let rebuilt = 0
  let deactivated = 0
  let skipped = 0
  const results = []
  for (const row of batch) {
    try {
      const r = await rebuildOne(row)
      if (r.rebuilt) rebuilt++
      else if (r.deactivated) deactivated++
      else if (r.skipped) skipped++
      results.push({ id: row.id, aeId: row.supplier_product_id, ...r })
    } catch (err) {
      results.push({ id: row.id, aeId: row.supplier_product_id, error: err.message })
      skipped++
    }
  }

  // Quick progress metric — how much of the catalog still needs healing?
  const { rows: progressRow } = await sql`
    SELECT
      COUNT(*) FILTER (WHERE is_active = true AND variants_updated_at IS NOT NULL)::int AS healed,
      COUNT(*) FILTER (WHERE is_active = true)::int AS total_active
    FROM user_products
  `
  const progress = progressRow[0] || { healed: 0, total_active: 0 }

  return res.json({
    status: 'ok',
    processed: batch.length,
    rebuilt,
    deactivated,
    skipped,
    progress,
    results: results.slice(0, 3), // keep response small
  })
}
