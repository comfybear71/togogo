// Enrich product prices with real AliExpress shipping costs
// GET /api/admin/enrich-prices?secret=JWT_SECRET
// Fetches shipping cost per product from ds.product.get, recalculates sale_price
// Run after import to get accurate pricing
import { sql, ensureSchema } from '../_lib/db.js'
import { getProductDetails } from '../_lib/suppliers.js'

export default async function handler(req, res) {
  const secret = req.query.secret
  if (secret !== process.env.JWT_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  await ensureSchema()

  try {
    // Get products that haven't been enriched yet (sale_price still based on estimate)
    // We'll add a flag column, but for now just process the first 20 per run
    const { rows: products } = await sql`
      SELECT DISTINCT ON (supplier_product_id)
        id, supplier_product_id, supplier_cost, sale_price
      FROM user_products
      WHERE supplier_product_id IS NOT NULL
        AND supplier_product_id != ''
      ORDER BY supplier_product_id, created_at DESC
      LIMIT 20
    `

    console.log(`[Enrich] Processing ${products.length} products for accurate pricing`)

    let updated = 0
    let errors = 0

    for (const product of products) {
      const aeId = (product.supplier_product_id || '').replace('ae_', '')
      if (!aeId || aeId.includes('-')) continue

      try {
        const details = await getProductDetails(aeId)
        if (!details) continue

        // Find cheapest shipping to AU (stored for future dynamic shipping pricing)
        const shippingOptions = details.shipping || []
        const cheapestShipping = shippingOptions.length > 0
          ? Math.min(...shippingOptions.map(s => s.shippingFee || 0))
          : 0
        const freeShipping = cheapestShipping === 0

        // Product price = (API cost + 15% tax) × 1.5 markup
        // Shipping is SEPARATE (A$6 flat at checkout, goes to ToGoGo)
        const productCost = details.cost || parseFloat(product.supplier_cost) || 0
        const taxEstimate = productCost * 0.15
        const costWithTax = productCost + taxEstimate
        const newSalePrice = Math.ceil(costWithTax * 1.5 * 100) / 100

        // supplier_cost = real product cost (without shipping, without markup)
        // sale_price = what customer pays for the product (+ A$6 shipping at checkout)
        await sql`
          UPDATE user_products
          SET supplier_cost = ${productCost},
              sale_price = ${newSalePrice},
              updated_at = NOW()
          WHERE supplier_product_id = ${product.supplier_product_id}
        `

        console.log(`[Enrich] ${aeId}: cost=$${productCost.toFixed(2)} + tax=$${taxEstimate.toFixed(2)} = $${costWithTax.toFixed(2)} × 1.5 → sale=$${newSalePrice.toFixed(2)} | AE ship=$${cheapestShipping.toFixed(2)}${freeShipping ? ' (FREE)' : ''}`)
        updated++
      } catch (err) {
        console.error(`[Enrich] Error for ${aeId}:`, err.message)
        errors++
      }
    }

    return res.json({
      success: true,
      processed: products.length,
      updated,
      errors,
      message: `Run again to process more products (20 per run)`
    })
  } catch (err) {
    console.error('[Enrich] Fatal error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
