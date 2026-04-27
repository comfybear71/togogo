// One-shot retroactive reprice for products imported before the
// min-shipping floor existed. Walks user_products where shipping
// data is 0 or NULL and bumps sale_price + supplier_cost + shipping
// fields by the configured min-shipping floor (in USD), so future
// orders include shipping in the customer-facing price instead of
// us eating it at AE order time.
//
// GET /api/admin/reprice-zero-shipping?secret=JWT              (dry run)
// GET /api/admin/reprice-zero-shipping?secret=JWT&apply=1      (writes)
//
// Idempotent — only touches rows with shipping_usd <= 0 or NULL.
// After this runs once, any subsequent product imports already
// include the floor via the cron change in this same release.
import { sql, ensureSchema } from '../_lib/db.js'
import { getAudRate, getMinShippingUsd, estimateTax } from '../_lib/pricing.js'

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

  await ensureSchema()
  const apply = req.query.apply === '1'

  try {
    const audRate = await getAudRate()
    const minShippingUsd = await getMinShippingUsd(audRate)

    // Find every product with no shipping cached. Limit to active ones
    // so cancelled / inactive listings aren't touched.
    const { rows: products } = await sql`
      SELECT id, supplier_product_id, title,
             supplier_cost, sale_price, shipping_usd, shipping_cost,
             min_variant_price_usd
      FROM user_products
      WHERE is_active = true
        AND (shipping_usd IS NULL OR shipping_usd <= 0)
      ORDER BY created_at DESC
    `

    const toUpdate = []
    let skipped = 0

    for (const p of products) {
      const oldSalePriceUsd = parseFloat(p.sale_price) || 0
      const oldSupplierCostUsd = parseFloat(p.supplier_cost) || 0
      const minVariantUsd = parseFloat(p.min_variant_price_usd) || 0
      // Backfill the supplier-cost / sale-price fields by adding the
      // missing shipping. We assume the existing sale_price is
      // (variantPrice + tax_on_variant) since shipping was 0; we
      // recompute (variantPrice + minShipping + tax_on_variant_plus_shipping)
      // to land on the new break-even.
      //
      // Best signal for the variant price is min_variant_price_usd
      // (that's what the cron uses for breakEvenMinUsd). Fall back
      // to the existing supplier_cost stripped of its old tax estimate.
      const variantPriceUsd = minVariantUsd > 0
        ? minVariantUsd
        : (oldSupplierCostUsd > 0 ? oldSupplierCostUsd / 1.10 : oldSalePriceUsd / 1.10)
      const newBreakEvenUsd = Math.round(
        (variantPriceUsd + minShippingUsd + estimateTax(variantPriceUsd + minShippingUsd)) * 100
      ) / 100

      if (newBreakEvenUsd <= oldSalePriceUsd) { skipped++; continue }

      toUpdate.push({
        id: p.id,
        supplier_product_id: p.supplier_product_id,
        title: p.title?.slice(0, 70),
        oldSalePriceUsd,
        oldSupplierCostUsd,
        oldShippingUsd: parseFloat(p.shipping_usd) || 0,
        newSalePriceUsd: newBreakEvenUsd,
        newSupplierCostUsd: newBreakEvenUsd,
        newShippingUsd: minShippingUsd,
      })
    }

    let applied = 0
    if (apply) {
      for (const u of toUpdate) {
        try {
          await sql`
            UPDATE user_products
            SET sale_price = ${u.newSalePriceUsd},
                supplier_cost = ${u.newSupplierCostUsd},
                shipping_usd = ${u.newShippingUsd},
                shipping_cost = ${u.newShippingUsd},
                updated_at = NOW()
            WHERE id = ${u.id}
          `
          applied++
        } catch (err) {
          console.error(`[reprice] DB update failed for ${u.id}:`, err.message)
        }
      }
    }

    return res.json({
      success: true,
      audRate,
      minShippingUsd,
      candidates: toUpdate.length,
      skipped,
      applied: apply ? applied : null,
      dryRun: !apply,
      sample: toUpdate.slice(0, 10),
      nextStep: apply
        ? `Repriced ${applied} of ${toUpdate.length} zero-shipping products.`
        : `${toUpdate.length} products would be repriced (sample shown). Re-run with &apply=1 to write.`,
    })
  } catch (err) {
    console.error('[reprice-zero-shipping] Error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
