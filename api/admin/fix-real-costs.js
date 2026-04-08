// Fix ALL product supplier_costs by querying AliExpress for real prices
// GET /api/admin/fix-real-costs?secret=JWT&limit=50
// Processes in batches to avoid timeout. Run multiple times until done.
import { sql, ensureSchema } from '../_lib/db.js'
import { getProductDetails, queryDSFreight } from '../_lib/suppliers.js'

export default async function handler(req, res) {
  const secret = req.query.secret
  if (secret !== process.env.JWT_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  await ensureSchema()

  const batchSize = parseInt(req.query.limit) || 30
  const usdToAud = parseFloat(req.query.rate || '1.45')
  const minShipping = 3.00

  try {
    // Get unique products that haven't been price-verified yet
    // Use a flag: notes column or a new column to track
    const { rows: products } = await sql`
      SELECT DISTINCT ON (supplier_product_id)
        id, supplier_product_id, supplier_cost, sale_price, api_price, shipping_cost
      FROM user_products
      WHERE is_active = true
        AND supplier_product_id IS NOT NULL
        AND supplier_product_id != ''
        AND sale_price > 0
        AND (price_verified IS NULL OR price_verified = false)
      ORDER BY supplier_product_id, created_at DESC
      LIMIT ${batchSize}
    `

    if (products.length === 0) {
      // Check how many are left
      const { rows: remaining } = await sql`
        SELECT COUNT(DISTINCT supplier_product_id) as count
        FROM user_products WHERE is_active = true AND sale_price > 0
          AND (price_verified IS NULL OR price_verified = false)
      `
      return res.json({
        success: true,
        message: 'All products verified!',
        remaining: remaining[0]?.count || 0,
      })
    }

    let fixed = 0
    let failed = 0
    let skipped = 0
    const samples = []

    for (const product of products) {
      try {
        const aeId = product.supplier_product_id.replace('ae_', '')
        if (!aeId || aeId.includes('-')) { skipped++; continue }

        const details = await getProductDetails(aeId)
        if (!details || !details.cost) {
          // Mark as verified even if we can't get details (product may be removed)
          await sql`UPDATE user_products SET price_verified = true WHERE supplier_product_id = ${product.supplier_product_id}`
          skipped++
          continue
        }

        // Real cost from AliExpress (in USD — the API lies about currency)
        const realProductUSD = details.cost
        const realProductAUD = realProductUSD * usdToAud

        // Get real shipping
        let realShippingAUD = minShipping
        if (details.shipping?.length > 0) {
          const cheapest = details.shipping.reduce((min, s) => s.shippingFee < min.shippingFee ? s : min, details.shipping[0])
          realShippingAUD = Math.max(cheapest.shippingFee * usdToAud, minShipping)
        }

        // NO separate tax — AliExpress includes tax at their checkout
        const taxAUD = 0
        const realSupplierCost = Math.round((realProductAUD + realShippingAUD) * 100) / 100

        // Read default markup from admin settings
        let markup = 1.3
        try {
          const { rows: markupRows } = await sql`SELECT value FROM admin_settings WHERE key = 'default_markup'`
          if (markupRows[0]) markup = parseFloat(markupRows[0].value) || 1.3
        } catch {}

        const newSalePrice = Math.ceil(realSupplierCost * markup * 100) / 100

        // Update ALL copies of this product across all stores
        await sql`
          UPDATE user_products
          SET supplier_cost = ${realSupplierCost},
              sale_price = ${newSalePrice},
              api_price = ${realProductAUD},
              shipping_cost = ${realShippingAUD},
              tax_amount = ${taxAUD},
              price_verified = true,
              updated_at = NOW()
          WHERE supplier_product_id = ${product.supplier_product_id}
        `

        fixed++
        if (samples.length < 5) {
          samples.push({
            aeId,
            oldCost: product.supplier_cost,
            newCost: realSupplierCost,
            oldSale: product.sale_price,
            newSale: newSalePrice,
            realPriceUSD: realProductUSD,
          })
        }
      } catch (err) {
        failed++
        // Mark as verified so we don't keep retrying failures
        await sql`UPDATE user_products SET price_verified = true WHERE supplier_product_id = ${product.supplier_product_id}`.catch(() => {})
      }
    }

    // Count remaining
    const { rows: remaining } = await sql`
      SELECT COUNT(DISTINCT supplier_product_id) as count
      FROM user_products WHERE is_active = true AND sale_price > 0
        AND (price_verified IS NULL OR price_verified = false)
    `

    return res.json({
      success: true,
      processed: products.length,
      fixed,
      failed,
      skipped,
      remaining: remaining[0]?.count || 0,
      note: remaining[0]?.count > 0 ? 'Run again to process more products' : 'All done!',
      samples,
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
