// Force-refetch variant data + break-even USD pricing for products,
// bypassing the rebuild-product-variants cron's 1-hour cooldown. Use
// after changing the pricing API source (e.g. v1.2.9 swap to
// ds.product.wholesale.get) to heal the catalog in minutes instead of
// waiting ~14h for natural cron progression.
//
// Strategy:
//   - Process products oldest variants_updated_at first (NULLs first)
//   - Parallel batches of 20 concurrent AE calls per wave
//   - Loop internally until Vercel function timeout approaches
//   - Returns progress + hasMore flag; caller re-runs until hasMore=false
//
// One call heals ~100-200 products. Full 8264-row catalog: ~40-80 URL
// hits, or one admin-UI auto-loop (not built here).
//
// GET /api/admin/force-refetch-variants?secret=JWT&limit=200
//
// Auth: JWT_SECRET via ?secret= query param (same pattern as other
// admin endpoints).

import { sql } from '../_lib/db.js'
import { getProductDetails, queryDSFreight } from '../_lib/suppliers.js'
import { summarisePricing } from '../_lib/pricing.js'

const PARALLEL_BATCH = 20
const PER_PRODUCT_TIMEOUT_MS = 6000
const SOFT_DEADLINE_MS = 50000  // leave 10s of Vercel's 60s cap for response

async function refetchOne(row) {
  const aeId = (row.supplier_product_id || '').replace('ae_', '')
  if (!aeId || aeId.includes('-')) {
    return { id: row.id, skipped: true, reason: 'invalid_ae_id' }
  }

  const details = await Promise.race([
    getProductDetails(aeId),
    new Promise(r => setTimeout(() => r(null), PER_PRODUCT_TIMEOUT_MS)),
  ])

  if (!details) {
    // Back off 1h like the cron does so we don't spin on rate-limited rows.
    await sql`
      UPDATE user_products
      SET variants_updated_at = NOW() - INTERVAL '23 hours'
      WHERE id = ${row.id}
    `
    return { id: row.id, skipped: true, reason: 'details_unavailable' }
  }

  if (!Array.isArray(details.variants) || details.variants.length === 0) {
    await sql`
      UPDATE user_products
      SET is_active = false, variants_updated_at = NOW()
      WHERE id = ${row.id}
    `
    return { id: row.id, deactivated: true, reason: 'no_variants' }
  }

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
    return { id: row.id, deactivated: true, reason: 'zero_break_even' }
  }

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

  return { id: row.id, rebuilt: true, priceUsd: salePriceUsd }
}

export default async function handler(req, res) {
  const secret = req.query.secret
  if (secret !== process.env.JWT_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const startedAt = Date.now()
  const limit = Math.min(parseInt(req.query.limit) || 200, 500)

  let rebuilt = 0
  let deactivated = 0
  let skipped = 0
  let processed = 0

  try {
    // Loop through batches until we hit our soft deadline or run out of
    // eligible rows. Ignores the cron's 1-hour cooldown — that's the point.
    while (processed < limit && Date.now() - startedAt < SOFT_DEADLINE_MS) {
      const remaining = limit - processed
      const batchSize = Math.min(PARALLEL_BATCH, remaining)

      const { rows: batch } = await sql`
        SELECT id, supplier_product_id, product_rating, orders_count
        FROM user_products
        WHERE is_active = true
          AND supplier_product_id IS NOT NULL
          AND supplier_product_id NOT LIKE '%-%'
        ORDER BY variants_updated_at ASC NULLS FIRST
        LIMIT ${batchSize}
      `

      if (batch.length === 0) break

      const settled = await Promise.all(batch.map(row => refetchOne(row).catch(err => ({
        id: row.id,
        skipped: true,
        error: err.message,
      }))))

      for (const r of settled) {
        if (r.rebuilt) rebuilt++
        else if (r.deactivated) deactivated++
        else skipped++
        processed++
      }
    }

    // Progress snapshot
    const { rows: progressRow } = await sql`
      SELECT
        COUNT(*) FILTER (WHERE is_active = true AND variants_updated_at > NOW() - INTERVAL '30 minutes')::int AS recently_rebuilt,
        COUNT(*) FILTER (WHERE is_active = true)::int AS total_active
      FROM user_products
    `
    const progress = progressRow[0] || { recently_rebuilt: 0, total_active: 0 }
    const hasMore = progress.recently_rebuilt < progress.total_active

    console.log(`[Force Refetch] ${processed} processed (${rebuilt} rebuilt, ${deactivated} deactivated, ${skipped} skipped) in ${Date.now() - startedAt}ms. hasMore=${hasMore}`)

    return res.json({
      success: true,
      processed,
      rebuilt,
      deactivated,
      skipped,
      elapsedMs: Date.now() - startedAt,
      progress,
      hasMore,
      nextStep: hasMore
        ? 'Re-run this URL to continue — hasMore=true means not all products have been refetched yet.'
        : 'Done. All active products refetched within the last 30 minutes.',
    })
  } catch (err) {
    console.error('[Force Refetch] Error:', err)
    return res.status(500).json({ error: err.message })
  }
}
