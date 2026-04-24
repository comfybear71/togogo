// Recompute sale_price / supplier_cost for all active USD-priced products
// using the current pricing formula, without re-fetching from AliExpress.
//
// Use after changing the pricing formula (e.g. tax base moving from
// product-only → product + shipping in v1.2.7). The rebuild-product-variants
// cron has a 1-hour cooldown per row and heals the catalog over ~14 hours,
// which is too slow when you just deployed a formula change and want the
// storefront list-card prices to match the new math immediately.
//
// This endpoint runs a single SQL UPDATE using already-stored values:
//   sale_price = ROUND((min_variant_price_usd + shipping_usd) * 1.10, 2)
//
// No AE API calls. No touching variants JSONB. No touching
// variants_updated_at (storefront price-integrity gate stays intact).
// Idempotent — safe to re-run; re-running with the same formula produces
// the same values.
//
// GET /api/admin/recompute-sale-prices?secret=JWT

import { sql } from '../_lib/db.js'
import { TAX_RATE } from '../_lib/pricing.js'

export default async function handler(req, res) {
  const secret = req.query.secret
  if (secret !== process.env.JWT_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    // Count how many rows are eligible before we update — useful for the user.
    const { rows: beforeRows } = await sql`
      SELECT COUNT(*)::int AS eligible
      FROM user_products
      WHERE is_active = true
        AND price_currency = 'USD'
        AND min_variant_price_usd > 0
    `
    const eligible = beforeRows[0]?.eligible || 0

    const multiplier = 1 + TAX_RATE  // 1.10

    const { rowCount } = await sql`
      UPDATE user_products
      SET sale_price    = ROUND(((min_variant_price_usd + COALESCE(shipping_usd, 0)) * ${multiplier})::numeric, 2),
          supplier_cost = ROUND(((min_variant_price_usd + COALESCE(shipping_usd, 0)) * ${multiplier})::numeric, 2),
          updated_at = NOW()
      WHERE is_active = true
        AND price_currency = 'USD'
        AND min_variant_price_usd > 0
    `

    console.log(`[Recompute] Updated ${rowCount} of ${eligible} eligible products`)

    return res.json({
      success: true,
      eligible,
      updated: rowCount,
      formula: `sale_price = (min_variant_price_usd + shipping_usd) * ${multiplier}`,
      nextStep: 'Refresh /admin/products or any storefront — list-card prices now match the new tax-base formula.',
    })
  } catch (err) {
    console.error('[Recompute Sale Prices] Error:', err)
    return res.status(500).json({ error: err.message })
  }
}
