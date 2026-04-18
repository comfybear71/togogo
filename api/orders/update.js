// Order update endpoint — allows sellers to manually update order status and tracking
// PATCH: update status, tracking_number, tracking_url, notes
import { sql } from '../_lib/db.js'
import { requireAuth } from '../_lib/auth.js'

const VALID_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'PATCH, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    return res.status(200).end()
  }

  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const user = await requireAuth(req)
    const { orderId, status, tracking_number, tracking_url, notes } = req.body || {}

    if (!orderId) {
      return res.status(400).json({ error: 'orderId is required' })
    }

    // Verify the order belongs to this user
    const { rows } = await sql`
      SELECT id, status FROM user_orders WHERE id = ${orderId} AND user_id = ${user.id}
    `
    if (!rows[0]) {
      return res.status(404).json({ error: 'Order not found' })
    }

    // Build update fields
    const updates = []
    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` })
      }
      updates.push({ field: 'status', value: status })
    }
    if (tracking_number !== undefined) {
      updates.push({ field: 'tracking_number', value: tracking_number })
    }
    if (tracking_url !== undefined) {
      updates.push({ field: 'tracking_url', value: tracking_url })
    }
    if (notes !== undefined) {
      updates.push({ field: 'notes', value: notes })
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Nothing to update. Provide status, tracking_number, tracking_url, or notes.' })
    }

    // Update the order (build query dynamically)
    await sql`
      UPDATE user_orders
      SET status = COALESCE(${status || null}, status),
          tracking_number = COALESCE(${tracking_number !== undefined ? tracking_number : null}, tracking_number),
          tracking_url = COALESCE(${tracking_url !== undefined ? tracking_url : null}, tracking_url),
          notes = COALESCE(${notes !== undefined ? notes : null}, notes),
          updated_at = NOW()
      WHERE id = ${orderId} AND user_id = ${user.id}
    `

    return res.json({ success: true, orderId, updated: updates.map(u => u.field) })
  } catch (err) {
    if (err.status === 401) return res.status(401).json({ error: err.message })
    console.error('Order update error:', err)
    return res.status(500).json({ error: 'Failed to update order' })
  }
}
