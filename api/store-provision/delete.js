// Delete a provisioned store — used when payment is cancelled
// Removes the pending store record so user can retry
import { sql, ensureSchema } from '../_lib/db.js'
import { requireAuth } from '../_lib/auth.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    await ensureSchema()
    const user = await requireAuth(req)

    // Only delete stores that are still pending (not active/paid)
    const { rowCount } = await sql`
      DELETE FROM user_stores
      WHERE user_id = ${user.id} AND status IN ('pending', 'provisioning')
    `

    // Also clean up any pending subscriptions
    await sql`
      DELETE FROM subscriptions
      WHERE user_id = ${user.id} AND status = 'active' AND stripe_subscription_id IS NULL
        AND created_at > NOW() - INTERVAL '1 hour'
    `.catch(() => {})

    return res.json({ success: true, deleted: rowCount > 0 })
  } catch (err) {
    if (err.status === 401) return res.status(401).json({ error: err.message })
    console.error('Delete provisioned store error:', err)
    return res.status(500).json({ error: 'Failed to delete store' })
  }
}
