// Fix individual order's supplier_cost with the REAL AliExpress cost
// GET /api/admin/fix-order-cost?secret=JWT&ref=TG-XXXX&cost_usd=5.57
import { sql, ensureSchema } from '../_lib/db.js'

export default async function handler(req, res) {
  const secret = req.query.secret
  if (secret !== process.env.JWT_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  await ensureSchema()

  const orderRef = req.query.ref
  const costUSD = parseFloat(req.query.cost_usd)
  const usdToAud = parseFloat(req.query.rate || '1.45')
  const commissionRate = 0.30

  if (!orderRef || !costUSD) {
    // List active orders with their current costs
    const { rows } = await sql`
      SELECT platform_order_id, product_title, supplier_cost, sale_price, profit, status, supplier_order_id
      FROM user_orders
      WHERE status NOT IN ('cancelled', 'refunded')
      ORDER BY created_at DESC
    `
    return res.json({
      usage: '/api/admin/fix-order-cost?secret=JWT&ref=TG-XXXX&cost_usd=5.57',
      orders: rows.map(o => ({
        ref: o.platform_order_id,
        product: o.product_title?.slice(0, 50),
        currentCost: o.supplier_cost,
        salePrice: o.sale_price,
        currentProfit: o.profit,
        aeOrderId: o.supplier_order_id,
        status: o.status,
      })),
    })
  }

  const realCostAUD = Math.round(costUSD * usdToAud * 100) / 100
  const { rows: orders } = await sql`
    SELECT id, sale_price FROM user_orders WHERE platform_order_id = ${orderRef} AND status NOT IN ('cancelled', 'refunded')
  `

  if (orders.length === 0) {
    return res.status(404).json({ error: `Order ${orderRef} not found or already cancelled` })
  }

  const results = []
  for (const order of orders) {
    const profit = Math.round((order.sale_price - realCostAUD) * (1 - commissionRate) * 100) / 100
    const commission = Math.round((order.sale_price - realCostAUD) * commissionRate * 100) / 100

    await sql`
      UPDATE user_orders
      SET supplier_cost = ${realCostAUD},
          profit = ${profit},
          commission = ${commission},
          notes = ${'Real AE cost: US$' + costUSD.toFixed(2) + ' = A$' + realCostAUD.toFixed(2)},
          updated_at = NOW()
      WHERE id = ${order.id}
    `
    results.push({ ref: orderRef, salePrice: order.sale_price, realCostAUD, profit, commission })
  }

  return res.json({ success: true, fixed: results })
}
