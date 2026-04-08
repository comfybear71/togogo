// Fix individual order status
// GET /api/admin/fix-order-status?secret=JWT&order_id=XXX&status=cancelled
import { sql, ensureSchema } from '../_lib/db.js'

export default async function handler(req, res) {
  const secret = req.query.secret
  if (secret !== process.env.JWT_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  await ensureSchema()

  const orderId = req.query.order_id
  const newStatus = req.query.status

  if (!orderId) {
    // List orders that might be wrong — "delivered" with no tracking, or very low profit
    const { rows } = await sql`
      SELECT id, platform_order_id, product_title, supplier_order_id, status, profit,
             tracking_number, sale_price, supplier_cost, created_at
      FROM user_orders
      WHERE (status = 'delivered' AND (tracking_number IS NULL OR tracking_number = ''))
         OR (status = 'delivered' AND profit < 1)
      ORDER BY created_at DESC
    `
    return res.json({
      suspiciousOrders: rows.length,
      orders: rows.map(o => ({
        id: o.id,
        ref: o.platform_order_id,
        product: o.product_title?.slice(0, 60),
        aeOrderId: o.supplier_order_id,
        status: o.status,
        profit: o.profit,
        tracking: o.tracking_number || 'NONE',
        salePrice: o.sale_price,
        supplierCost: o.supplier_cost,
      })),
      usage: 'Add ?order_id=UUID&status=cancelled to fix a specific order',
    })
  }

  const validStatuses = ['processing', 'shipped', 'delivered', 'cancelled', 'refunded']
  if (!validStatuses.includes(newStatus)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` })
  }

  try {
    const { rowCount } = await sql`
      UPDATE user_orders
      SET status = ${newStatus},
          notes = COALESCE(notes, '') || ${` | Manual status fix to ${newStatus} on ${new Date().toISOString().slice(0, 10)}`},
          profit = CASE WHEN ${newStatus} = 'cancelled' THEN 0 ELSE profit END,
          updated_at = NOW()
      WHERE id = ${orderId}
    `

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Order not found' })
    }

    return res.json({ success: true, orderId, newStatus, note: newStatus === 'cancelled' ? 'Profit set to $0' : 'Status updated' })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
