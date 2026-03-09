// Activate store after payment — ensures store status is 'active'
// Called by frontend after returning from successful Stripe payment
import { sql } from '../_lib/db.js'
import { requireAuth } from '../_lib/auth.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const user = await requireAuth(req)

    // Activate the user's store regardless of current status
    const { rowCount } = await sql`
      UPDATE user_stores
      SET status = 'active', updated_at = NOW()
      WHERE user_id = ${user.id} AND status != 'deleted'
    `

    if (!rowCount) {
      return res.status(404).json({ error: 'No store found' })
    }

    // Get the activated store info
    const { rows } = await sql`
      SELECT subdomain, full_domain, store_name FROM user_stores WHERE user_id = ${user.id}
    `

    return res.json({
      success: true,
      store: rows[0] || null,
    })
  } catch (err) {
    if (err.status === 401) return res.status(401).json({ error: err.message })
    console.error('Store activation error:', err)
    return res.status(500).json({ error: 'Failed to activate store' })
  }
}
