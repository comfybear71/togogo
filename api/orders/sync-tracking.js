// Tracking sync endpoint — polls suppliers for order status & tracking updates
// POST: sync tracking for a specific order or all processing orders
import { sql } from '../_lib/db.js'
import { requireAuth } from '../_lib/auth.js'
import { getSupplierOrderTracking } from '../_lib/suppliers.js'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const user = await requireAuth(req)
    const { orderId } = req.body || {}

    // Get orders that need tracking updates
    let query
    if (orderId) {
      query = sql`
        SELECT id, supplier, supplier_order_id, status, tracking_number
        FROM user_orders
        WHERE id = ${orderId} AND user_id = ${user.id} AND supplier_order_id IS NOT NULL
      `
    } else {
      query = sql`
        SELECT id, supplier, supplier_order_id, status, tracking_number
        FROM user_orders
        WHERE user_id = ${user.id}
          AND status IN ('processing', 'shipped')
          AND supplier_order_id IS NOT NULL
        ORDER BY updated_at ASC
        LIMIT 20
      `
    }

    const { rows: orders } = await query

    if (orders.length === 0) {
      return res.json({ message: 'No orders to sync', updated: 0, results: [] })
    }

    const results = []
    for (const order of orders) {
      const tracking = await getSupplierOrderTracking(order.supplier, order.supplier_order_id)

      if (!tracking.success) {
        results.push({ orderId: order.id, success: false, error: tracking.error })
        continue
      }

      // Only update if something changed
      const statusChanged = tracking.status && tracking.status !== order.status
      const trackingChanged = tracking.tracking_number && tracking.tracking_number !== order.tracking_number

      if (statusChanged || trackingChanged) {
        const updates = []
        const values = { updated_at: 'NOW()' }

        if (statusChanged) {
          await sql`
            UPDATE user_orders
            SET status = ${tracking.status},
                tracking_number = COALESCE(${tracking.tracking_number}, tracking_number),
                tracking_url = COALESCE(${tracking.tracking_url}, tracking_url),
                notes = ${`Supplier status: ${tracking.supplier_status || tracking.status}${tracking.tracking_number ? ' — tracking: ' + tracking.tracking_number : ''}`},
                updated_at = NOW()
            WHERE id = ${order.id}
          `
        } else if (trackingChanged) {
          await sql`
            UPDATE user_orders
            SET tracking_number = ${tracking.tracking_number},
                tracking_url = COALESCE(${tracking.tracking_url}, tracking_url),
                notes = ${`Tracking updated: ${tracking.tracking_number}`},
                updated_at = NOW()
            WHERE id = ${order.id}
          `
        }

        results.push({
          orderId: order.id,
          success: true,
          status: tracking.status,
          tracking_number: tracking.tracking_number,
          tracking_url: tracking.tracking_url,
          changed: true,
        })
      } else {
        results.push({ orderId: order.id, success: true, changed: false })
      }
    }

    return res.json({
      message: `Synced ${orders.length} order(s)`,
      updated: results.filter(r => r.changed).length,
      results,
    })
  } catch (err) {
    if (err.status === 401) return res.status(401).json({ error: err.message })
    console.error('Sync tracking error:', err)
    return res.status(500).json({ error: 'Failed to sync tracking' })
  }
}
