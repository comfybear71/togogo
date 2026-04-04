// Show pricing breakdown for a product — API price, shipping, tax, wholesale, sale
// GET /api/admin/price-check?id=PRODUCT_ID&secret=JWT_SECRET
// Also works with DB product ID or supplier_product_id
import { sql, ensureSchema } from '../_lib/db.js'
import { getProductDetails } from '../_lib/suppliers.js'

export default async function handler(req, res) {
  const secret = req.query.secret
  if (secret !== process.env.JWT_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { id } = req.query
  if (!id) return res.status(400).json({ error: 'id required — AliExpress product ID or DB product ID' })

  await ensureSchema()

  try {
    // Check if it's a DB product ID
    let aeId = id
    let dbProduct = null
    const { rows } = await sql`
      SELECT id, title, supplier_product_id, supplier_cost, sale_price
      FROM user_products WHERE id::text LIKE ${id + '%'} OR supplier_product_id = ${id}
      LIMIT 1
    `
    if (rows[0]) {
      dbProduct = rows[0]
      aeId = (rows[0].supplier_product_id || '').replace('ae_', '')
    }

    // Fetch real details from AliExpress
    const details = await getProductDetails(aeId)
    if (!details) {
      return res.status(404).json({ error: 'Product not found on AliExpress' })
    }

    // Calculate shipping
    const shippingOptions = details.shipping || []
    const cheapestShipping = shippingOptions.length > 0
      ? Math.min(...shippingOptions.map(s => s.shippingFee || 999))
      : 0
    const freeShipping = cheapestShipping === 0 || cheapestShipping === 999
    const shippingCost = freeShipping ? 0 : cheapestShipping

    // Calculate pricing
    const apiPrice = details.cost || 0
    const taxEstimate = apiPrice * 0.18
    const wholesaleCost = apiPrice + shippingCost + taxEstimate
    const salePrice = Math.ceil(wholesaleCost * 1.5 * 100) / 100
    const profit = salePrice - wholesaleCost
    const togogoCommission = Math.round(profit * 0.30 * 100) / 100
    const storeOwnerProfit = Math.round(profit * 0.70 * 100) / 100

    return res.json({
      product: {
        aliexpressId: aeId,
        title: details.title?.slice(0, 100),
        currency: details.currency || 'AUD',
      },
      pricing: {
        apiPrice: `$${apiPrice.toFixed(2)}`,
        shipping: freeShipping ? 'FREE' : `$${shippingCost.toFixed(2)}`,
        tax18pct: `$${taxEstimate.toFixed(2)}`,
        wholesaleCost: `$${wholesaleCost.toFixed(2)}`,
        salePrice_1_5x: `$${salePrice.toFixed(2)}`,
        checkoutShipping: '$6.00 (flat, goes to ToGoGo)',
        customerPays: `$${(salePrice + 6).toFixed(2)}`,
      },
      profitSplit: {
        profit: `$${profit.toFixed(2)}`,
        togogo30pct: `$${togogoCommission.toFixed(2)} + $6.00 shipping = $${(togogoCommission + 6).toFixed(2)}`,
        storeOwner70pct: `$${storeOwnerProfit.toFixed(2)}`,
      },
      shippingOptions: shippingOptions.map(s => ({
        method: s.serviceName || s.company,
        cost: s.shippingFee > 0 ? `$${s.shippingFee.toFixed(2)}` : 'FREE',
        days: s.estimatedDays || 'N/A',
      })),
      dbRecord: dbProduct ? {
        id: dbProduct.id,
        currentSupplierCost: `$${parseFloat(dbProduct.supplier_cost).toFixed(2)}`,
        currentSalePrice: `$${parseFloat(dbProduct.sale_price).toFixed(2)}`,
      } : null,
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
