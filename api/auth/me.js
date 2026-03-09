import { getCurrentUser } from '../_lib/auth.js'
import { sql } from '../_lib/db.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const user = await getCurrentUser(req)

    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    // Check if user has an active store
    let hasStore = false
    try {
      const { rows } = await sql`
        SELECT id FROM user_stores
        WHERE user_id = ${user.id} AND status IN ('active', 'provisioned')
        LIMIT 1
      `
      hasStore = rows.length > 0
    } catch {
      // user_stores table may not exist yet
    }

    return res.status(200).json({ user: { ...user, has_store: hasStore } })
  } catch (error) {
    console.error('Auth me error:', error)
    return res.status(500).json({ error: 'Failed to get user' })
  }
}
