// Admin users API — list, search, update users
import { sql } from '../_lib/db.js'
import { requireAdminOrSetup } from '../_lib/auth.js'

export default async function handler(req, res) {
  try {
    await requireAdminOrSetup(req)
  } catch (err) {
    return res.status(err?.status || 401).json({ error: err?.message || 'Authentication failed' })
  }

  // GET — list users with search/filter
  if (req.method === 'GET') {
    try {
      const { search, role, status, sort, limit: lim } = req.query
      const limit = Math.min(parseInt(lim) || 50, 200)

      let query = `
        SELECT u.id, u.email, u.name, u.avatar_url, u.role, u.verification_level,
               u.created_at, u.phone, u.location_suburb, u.location_country, u.bio,
               u.wallet_balance,
               (SELECT COUNT(*)::int FROM user_orders WHERE user_id = u.id) AS total_orders,
               (SELECT COALESCE(SUM(sale_price), 0)::numeric FROM user_orders WHERE user_id = u.id) AS total_revenue,
               (SELECT COUNT(*)::int FROM user_stores WHERE user_id = u.id AND status != 'deleted') AS store_count
        FROM users u
        WHERE 1=1
      `
      const params = []

      if (search) {
        params.push(`%${search}%`)
        query += ` AND (u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`
      }
      if (role && role !== 'all') {
        params.push(role)
        query += ` AND u.role = $${params.length}`
      }
      if (status === 'suspended') {
        query += ` AND u.verification_level = 'suspended'`
      } else if (status === 'active') {
        query += ` AND u.verification_level != 'suspended'`
      }

      // Sort
      if (sort === 'name') query += ` ORDER BY u.name ASC`
      else if (sort === 'revenue') query += ` ORDER BY total_revenue DESC`
      else query += ` ORDER BY u.created_at DESC`

      params.push(limit)
      query += ` LIMIT $${params.length}`

      const { rows } = await sql.query(query, params)

      return res.json(rows.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name || u.email.split('@')[0],
        avatarUrl: u.avatar_url,
        role: u.role || 'buyer',
        verificationLevel: u.verification_level || 'none',
        createdAt: u.created_at,
        phone: u.phone,
        location: [u.location_suburb, u.location_country].filter(Boolean).join(', ') || null,
        bio: u.bio,
        walletBalance: parseFloat(u.wallet_balance) || 0,
        totalOrders: u.total_orders || 0,
        totalRevenue: parseFloat(u.total_revenue) || 0,
        storeCount: u.store_count || 0,
      })))
    } catch (err) {
      console.error('Failed to list users:', err)
      return res.status(500).json({ error: 'Failed to load users' })
    }
  }

  // PATCH — update user role or status
  if (req.method === 'PATCH') {
    try {
      const { userId, role, verificationLevel } = req.body
      if (!userId) return res.status(400).json({ error: 'userId required' })

      const updates = []
      const params = []

      if (role && ['buyer', 'seller', 'admin'].includes(role)) {
        params.push(role)
        updates.push(`role = $${params.length}`)
      }
      if (verificationLevel && ['none', 'basic', 'pending', 'verified', 'suspended'].includes(verificationLevel)) {
        params.push(verificationLevel)
        updates.push(`verification_level = $${params.length}`)
      }

      if (updates.length === 0) return res.status(400).json({ error: 'Nothing to update' })

      params.push(userId)
      const { rows } = await sql.query(
        `UPDATE users SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING id, email, name, role, verification_level`,
        params
      )

      if (!rows[0]) return res.status(404).json({ error: 'User not found' })
      return res.json(rows[0])
    } catch (err) {
      console.error('Failed to update user:', err)
      return res.status(500).json({ error: 'Failed to update user' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
