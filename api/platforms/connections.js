import { sql } from '../_lib/db.js'
import { requireAuth } from '../_lib/auth.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const user = await requireAuth(req)

    const { rows } = await sql`
      SELECT id, platform, status, shop_name, shop_url,
             products_synced, last_sync_at, connected_at
      FROM platform_connections
      WHERE user_id = ${user.id}
      ORDER BY connected_at DESC
    `

    res.json({ connections: rows })
  } catch (err) {
    if (err.status === 401) return res.status(401).json({ error: err.message })
    console.error('Platform connections error:', err)
    res.status(500).json({ error: 'Failed to fetch connections' })
  }
}
