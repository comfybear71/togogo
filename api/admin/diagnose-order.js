// Admin: inspect one of our orders to see what we stored vs. what it
// actually cost on AliExpress. For pricing forensics.
//
// GET /api/admin/diagnose-order?orderRef=TG-XXXX&secret=<JWT>
// GET /api/admin/diagnose-order?aeOrderId=8211184453659621&secret=<JWT>
import { sql, ensureSchema } from '../_lib/db.js'
import { verifyToken, requireAdminOrSetup } from '../_lib/auth.js'

export default async function handler(req, res) {
  let authorized = false
  const querySecret = req.query.secret
  if (querySecret && querySecret === process.env.JWT_SECRET) authorized = true
  if (!authorized && querySecret) {
    try {
      const payload = verifyToken(querySecret)
      if (payload && payload.role === 'admin') authorized = true
    } catch { /* */ }
  }
  if (!authorized) {
    try { await requireAdminOrSetup(req); authorized = true }
    catch (err) { return res.status(err?.status || 401).json({ error: err?.message || 'Authentication required' }) }
  }

  await ensureSchema()

  const { orderRef, aeOrderId } = req.query
  if (!orderRef && !aeOrderId) {
    return res.status(400).json({ error: 'orderRef or aeOrderId required' })
  }

  const { rows: orders } = orderRef
    ? await sql`SELECT * FROM user_orders WHERE platform_order_id = ${orderRef} ORDER BY created_at DESC LIMIT 5`
    : await sql`SELECT * FROM user_orders WHERE supplier_order_id = ${aeOrderId} ORDER BY created_at DESC LIMIT 5`

  if (orders.length === 0) {
    return res.status(404).json({ error: 'Order not found' })
  }

  // Also fetch the product row so we can see stored price/cost
  const order = orders[0]
  let product = null
  if (order.supplier_product_id) {
    const { rows: prods } = await sql`
      SELECT id, title, supplier_cost, sale_price, api_price, shipping_cost,
             tax_amount, price_currency, original_price, discount_percent, niches,
             created_at, updated_at
      FROM user_products
      WHERE supplier_product_id = ${order.supplier_product_id}
      ORDER BY created_at DESC LIMIT 1
    `
    product = prods[0] || null
  }

  return res.json({
    order,
    currentProductRecord: product,
    diagnosis: {
      whatCustomerPaid_AUD: parseFloat(order.sale_price) || 0,
      whatWeStoredAsCost_AUD: parseFloat(order.supplier_cost) || 0,
      storedCommission_AUD: parseFloat(order.commission) || 0,
      storedProfit_AUD: parseFloat(order.profit) || 0,
      productStillExistsInCatalog: !!product,
      productImportedAt: product?.created_at || null,
      productLastUpdatedAt: product?.updated_at || null,
    },
  })
}
