// Order fulfillment endpoint — forwards pending orders to suppliers
// POST: fulfill a specific order or all unfulfilled orders
// GET: check fulfillment status of an order
import { sql, ensureSchema } from '../_lib/db.js'
import { requireAuth } from '../_lib/auth.js'
import { placeSupplierOrder } from '../_lib/suppliers.js'

async function fulfillOrder(order) {
  const shippingAddress = typeof order.shipping_address === 'string'
    ? JSON.parse(order.shipping_address || '{}')
    : (order.shipping_address || {})

  // Add customer info to shipping address for supplier
  shippingAddress.name = shippingAddress.name || order.customer_name || ''
  shippingAddress.email = shippingAddress.email || order.customer_email || ''

  const result = await placeSupplierOrder(order.supplier, {
    productId: order.supplier_product_id || order.id,
    quantity: order.quantity || 1,
    shippingAddress,
  })

  if (result.success) {
    await sql`
      UPDATE user_orders
      SET status = 'processing',
          supplier_order_id = ${result.supplier_order_id},
          notes = ${`Forwarded to ${order.supplier} — supplier order: ${result.supplier_order_id}`},
          updated_at = NOW()
      WHERE id = ${order.id}
    `
    return { orderId: order.id, success: true, supplier_order_id: result.supplier_order_id }
  } else {
    // Still mark as processing but note the failure so it can be retried
    await sql`
      UPDATE user_orders
      SET notes = ${`Supplier fulfillment failed: ${result.error}. Manual action required.`},
          updated_at = NOW()
      WHERE id = ${order.id}
    `
    return { orderId: order.id, success: false, error: result.error }
  }
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    return res.status(200).end()
  }

  try {
    await ensureSchema()
    const user = await requireAuth(req)

    if (req.method === 'POST') {
      const { orderId } = req.body || {}

      if (orderId) {
        // Fulfill a specific order
        const { rows } = await sql`
          SELECT o.*, p.supplier_product_id
          FROM user_orders o
          LEFT JOIN user_products p ON p.title = o.product_title AND p.user_id = o.user_id
          WHERE o.id = ${orderId} AND o.user_id = ${user.id}
        `
        if (!rows[0]) return res.status(404).json({ error: 'Order not found' })

        const order = rows[0]
        if (order.supplier_order_id) {
          return res.json({ orderId, success: true, message: 'Already submitted to supplier', supplier_order_id: order.supplier_order_id })
        }

        const result = await fulfillOrder(order)
        return res.json(result)
      }

      // Fulfill all pending/unfulfilled orders for this user
      const { rows: pendingOrders } = await sql`
        SELECT o.*, p.supplier_product_id
        FROM user_orders o
        LEFT JOIN user_products p ON p.title = o.product_title AND p.user_id = o.user_id
        WHERE o.user_id = ${user.id}
          AND o.status IN ('pending', 'processing')
          AND o.supplier_order_id IS NULL
        ORDER BY o.created_at ASC
      `

      if (pendingOrders.length === 0) {
        return res.json({ message: 'No orders to fulfill', results: [] })
      }

      const results = []
      for (const order of pendingOrders) {
        const result = await fulfillOrder(order)
        results.push(result)
      }

      return res.json({
        message: `Processed ${results.length} order(s)`,
        fulfilled: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results,
      })
    }

    if (req.method === 'GET') {
      // Get fulfillment status of all orders
      const { rows } = await sql`
        SELECT id, product_title, supplier, supplier_order_id, status,
               tracking_number, tracking_url, notes, created_at, updated_at
        FROM user_orders
        WHERE user_id = ${user.id}
        ORDER BY created_at DESC
        LIMIT 50
      `
      return res.json({ orders: rows })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    if (err.status === 401) return res.status(401).json({ error: err.message })
    console.error('Fulfill order error:', err)
    return res.status(500).json({ error: 'Failed to fulfill order' })
  }
}
