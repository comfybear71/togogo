import { sql } from '../_lib/db.js'
import { requireAuth } from '../_lib/auth.js'

export default async function handler(req, res) {
  let user
  try {
    user = await requireAuth(req)
  } catch (err) {
    return res.status(err?.status || 401).json({ error: err?.message || 'Authentication required' })
  }

  if (req.method === 'GET') {
    try {
      // Watchlist table may not exist yet — return empty gracefully
      const result = await sql`
        SELECT w.*, p.title, p.image, p.sale_price
        FROM watchlist w
        LEFT JOIN user_products p ON p.id = w.product_id
        WHERE w.user_id = ${user.id}
        ORDER BY w.created_at DESC
      `
      return res.json(result.rows || [])
    } catch {
      return res.json([])
    }
  }

  if (req.method === 'POST') {
    try {
      const { product_id, target_price } = req.body
      if (!product_id) return res.status(400).json({ error: 'product_id required' })

      const result = await sql`
        INSERT INTO watchlist (user_id, product_id, target_price)
        VALUES (${user.id}, ${product_id}, ${target_price || null})
        RETURNING *
      `
      return res.json(result.rows[0])
    } catch (err) {
      console.error('Watchlist add error:', err)
      return res.status(500).json({ error: 'Failed to add to watchlist' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
