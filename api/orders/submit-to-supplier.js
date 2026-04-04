// Submit order to AliExpress supplier
// POST /api/orders/submit-to-supplier
// Body: { orderId } — looks up order in DB and submits to AliExpress
import { sql, ensureSchema } from '../_lib/db.js'
import { getCurrentUser } from '../_lib/auth.js'
import { submitOrder } from '../_lib/suppliers.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  await ensureSchema()

  // Auth: admin or setup secret
  const setupSecret = req.headers['x-setup-secret'] || req.query.secret
  if (setupSecret && setupSecret === process.env.JWT_SECRET) {
    // OK
  } else {
    const user = await getCurrentUser(req)
    if (!user) return res.status(401).json({ error: 'Auth required' })
    const { rows } = await sql`SELECT role FROM users WHERE id = ${user.id}`
    if (!rows[0] || rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' })
    }
  }

  const { orderId } = req.body
  if (!orderId) return res.status(400).json({ error: 'orderId required' })

  try {
    // Get order from DB
    const { rows: orders } = await sql`
      SELECT o.id, o.product_title, o.customer_name, o.customer_email,
             o.shipping_address, o.status, o.supplier_order_id,
             p.supplier_product_id, p.id as product_id
      FROM user_orders o
      LEFT JOIN user_products p ON p.title = o.product_title AND p.user_id = o.user_id
      WHERE o.id = ${orderId}
    `

    if (!orders[0]) return res.status(404).json({ error: 'Order not found' })

    const order = orders[0]

    if (order.supplier_order_id) {
      return res.json({ success: false, message: 'Order already submitted to supplier', supplierOrderId: order.supplier_order_id })
    }

    // Parse shipping address
    let address = {}
    try { address = typeof order.shipping_address === 'string' ? JSON.parse(order.shipping_address) : (order.shipping_address || {}) } catch { /* */ }

    // Get the AliExpress product ID
    const aeProductId = order.supplier_product_id?.replace('ae_', '') || ''
    if (!aeProductId) {
      return res.status(400).json({ error: 'No AliExpress product ID found for this order' })
    }

    console.log(`[OrderSubmit] Submitting order ${orderId} to AliExpress (product: ${aeProductId})`)

    const result = await submitOrder({
      productId: aeProductId,
      quantity: 1,
      shippingAddress: {
        name: order.customer_name,
        country: address.country || 'AU',
        state: address.state || '',
        city: address.city || '',
        line1: address.line1 || address.address || '',
        zip: address.zip || address.postcode || '',
        phone: address.phone || '',
      },
    })

    if (result.success) {
      // Update order with supplier order ID
      await sql`
        UPDATE user_orders
        SET supplier_order_id = ${result.orderId},
            status = 'processing',
            notes = ${'Submitted to AliExpress'},
            updated_at = NOW()
        WHERE id = ${orderId}
      `
      console.log(`[OrderSubmit] Order ${orderId} -> AliExpress order ${result.orderId}`)
    }

    return res.json(result)
  } catch (err) {
    console.error('[OrderSubmit] Error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
