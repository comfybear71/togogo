import { sql } from '../_lib/db.js'
import { getCurrentUser } from '../_lib/auth.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const user = await getCurrentUser(req)
    if (!user) return res.status(401).json({ error: 'Authentication required' })

    const result = await sql`
      SELECT * FROM subscriptions
      WHERE user_id = ${user.id} AND status IN ('active', 'past_due')
      ORDER BY created_at DESC
      LIMIT 1
    `

    return res.json(result.rows[0] || { plan: 'free' })
  } catch (err) {
    console.error('Subscription fetch error:', err)
    return res.json({ plan: 'free' })
  }
}
