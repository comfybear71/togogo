// User's own store info API — returns the authenticated user's store details
// No admin access required — scoped to the logged-in user
import { sql, ensureSchema } from '../_lib/db.js'
import { requireAuth } from '../_lib/auth.js'

export default async function handler(req, res) {
  let user
  try {
    user = await requireAuth(req)
  } catch (err) {
    return res.status(err?.status || 401).json({ error: err?.message || 'Authentication required' })
  }

  await ensureSchema()

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { rows } = await sql`
      SELECT id, subdomain, full_domain, store_name, status, tier, created_at, updated_at
      FROM user_stores
      WHERE user_id = ${user.id}
      LIMIT 1
    `

    if (!rows[0]) {
      return res.json({ store: null })
    }

    return res.json({ store: rows[0] })
  } catch (err) {
    console.error('My store info error:', err)
    return res.json({ store: null })
  }
}
