import { sql } from '../_lib/db.js'
import { requireAuth } from '../_lib/auth.js'

export default async function handler(req, res) {
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' })

  let user
  try {
    user = await requireAuth(req)
  } catch (err) {
    return res.status(err?.status || 401).json({ error: err?.message || 'Authentication required' })
  }

  const { id } = req.query
  try {
    await sql`DELETE FROM watchlist WHERE id = ${id} AND user_id = ${user.id}`
    return res.json({ success: true })
  } catch (err) {
    console.error('Watchlist delete error:', err)
    return res.status(500).json({ error: 'Failed to remove from watchlist' })
  }
}
