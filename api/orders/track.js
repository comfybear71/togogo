// Get order tracking from AliExpress
// GET /api/orders/track?orderId=ORDER_ID (AliExpress order ID)
import { sql, ensureSchema } from '../_lib/db.js'
import { getCurrentUser } from '../_lib/auth.js'
import { getOrderTracking } from '../_lib/suppliers.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  await ensureSchema()

  // Auth
  const setupSecret = req.query.secret
  if (setupSecret && setupSecret === process.env.JWT_SECRET) {
    // OK
  } else {
    const user = await getCurrentUser(req)
    if (!user) return res.status(401).json({ error: 'Auth required' })
  }

  const { orderId } = req.query
  if (!orderId) return res.status(400).json({ error: 'orderId required' })

  try {
    const tracking = await getOrderTracking(orderId)
    if (!tracking) {
      return res.status(404).json({ error: 'Tracking not found' })
    }

    // Update local order if we have a matching supplier_order_id
    if (tracking.trackingNumber) {
      await sql`
        UPDATE user_orders
        SET tracking_number = ${tracking.trackingNumber},
            tracking_url = ${tracking.trackingUrl || ''},
            status = CASE
              WHEN ${tracking.status} ILIKE '%delivered%' THEN 'delivered'
              WHEN ${tracking.status} ILIKE '%shipped%' OR ${tracking.trackingNumber} != '' THEN 'shipped'
              ELSE status
            END,
            updated_at = NOW()
        WHERE supplier_order_id = ${orderId}
      `.catch(err => console.error('[Track] DB update failed:', err.message))
    }

    return res.json(tracking)
  } catch (err) {
    console.error('[Track] Error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
