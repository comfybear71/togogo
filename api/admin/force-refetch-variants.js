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

const PARALLEL_BATCH = 2             // AE DS AppApiCallLimit hits hard above ~1-2 req/s
const PER_PRODUCT_TIMEOUT_MS = 6000
const SOFT_DEADLINE_MS = 50000        // leave 10s of Vercel's 60s cap for response
const INTER_BATCH_SLEEP_MS = 1500     // ~60 req/min sustained — below empirical ban threshold

async function refetchOne(row) {
  const aeId = (row.supplier_product_id || '').replace('ae_', '')
  if (!aeId || aeId.includes('-')) {
    return { id: row.id, skipped: true, reason: 'invalid_ae_id' }
  }

  // getProductDetails throws on AppApiCallLimit — let it propagate up so
  // the caller can bail the whole run. On other errors it returns null or
  // a { _productRemoved: true } marker.
  const details = await Promise.race([
    getProductDetails(aeId),
    new Promise(r => setTimeout(() => r(null), PER_PRODUCT_TIMEOUT_MS)),
  ])

  // AE told us this product no longer exists or has no sellable SKUs.
  // Deactivate rather than back off — retrying won't help.
  if (details?._productRemoved) {
    await sql`
      UPDATE user_products
      SET is_active = false,
          variants_updated_at = NOW(),
          notes = COALESCE(notes, '') || ${' | AE: ' + details.reason},
          updated_at = NOW()
      WHERE id = ${row.id}
    `
    return { id: row.id, deactivated: true, reason: details.reason }
  }

  if (!details) {
    // Transient failure (timeout / network / unknown). Back off 1h.
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
  let rateLimitHit = false

  try {
    // Loop through batches until we hit our soft deadline or run out of
    // eligible rows. Ignores the cron's 1-hour cooldown — that's the point.
    // Respects AE's AppApiCallLimit by keeping parallelism low and pacing
    // between batches. If rate limits cascade (MAX_CONSECUTIVE_SKIPS), we
    // bail early and tell the caller to wait out the ban before retrying.
    while (processed < limit && Date.now() - startedAt < SOFT_DEADLINE_MS) {
      const remaining = limit - processed
      const batchSize = Math.min(PARALLEL_BATCH, remaining)

      // Refetch endpoint previously set variants_updated_at = NOW() - 23h
      // on every skip during the 20-parallel rate-limit cascade, so all
      // ~8264 products look "recently touched" now. We can't filter by
      // cooldown — sort oldest-first and let the SQL pick whatever needs
      // real rebuild data (anything not actually healed will come out of
      // the UPDATE with fresh variants).
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

      const settled = await Promise.all(batch.map(row => refetchOne(row).catch(err => {
        // Distinguish rate limits from other errors — rate limits pause the
        // whole run, other errors just skip the single product.
        const msg = err.message || ''
        if (msg.includes('AppApiCallLimit') || msg.includes('frequency of app access')) {
          return { id: row.id, rateLimit: true, error: err.message }
        }
        return { id: row.id, skipped: true, error: err.message }
      })))

      for (const r of settled) {
        if (r.rebuilt) rebuilt++
        else if (r.deactivated) deactivated++
        else if (r.rateLimit) rateLimitHit = true
        else skipped++
        processed++
      }

      // Real rate-limit detected — bail out, don't deepen the ban.
      if (rateLimitHit) break

      // Pace next wave. Match AE's observed steady-state tolerance
      // (background cron runs 10 products/minute without bans).
      await new Promise(r => setTimeout(r, INTER_BATCH_SLEEP_MS))
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

    console.log(`[Force Refetch] ${processed} processed (${rebuilt} rebuilt, ${deactivated} deactivated, ${skipped} skipped, rateLimitHit=${rateLimitHit}) in ${Date.now() - startedAt}ms. hasMore=${hasMore}`)

    const nextStep = rateLimitHit
      ? `AE rate-limit (AppApiCallLimit) hit after ${rebuilt} rebuild${rebuilt === 1 ? '' : 's'}. Wait ~60 seconds for the ban to clear, then re-run. Consider re-running with &limit=50 to reduce impact per call.`
      : hasMore
        ? 'Re-run this URL to continue — hasMore=true means not all products have been refetched yet.'
        : 'Done. All active products refetched within the last 30 minutes.'

    return res.json({
      success: true,
      processed,
      rebuilt,
      deactivated,
      skipped,
      rateLimitHit,
      elapsedMs: Date.now() - startedAt,
      progress,
      hasMore,
      nextStep,
    })
  } catch (err) {
    console.error('[Force Refetch] Error:', err)
    return res.status(500).json({ error: err.message })
  }
}
