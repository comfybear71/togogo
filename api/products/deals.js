import { sql } from '../_lib/db.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { type, category, limit } = req.query
    const max = Math.min(parseInt(limit) || 20, 100)

    // Query user_products sorted by total_sold (trending) or newest
    let result
    if (type === 'daily' || type === 'trending') {
      result = await sql`
        SELECT * FROM user_products
        WHERE is_active = true
        ORDER BY total_sold DESC, created_at DESC
        LIMIT ${max}
      `
    } else if (type === 'category' && category) {
      result = await sql`
        SELECT * FROM user_products
        WHERE is_active = true AND category = ${category}
        ORDER BY total_sold DESC
        LIMIT ${max}
      `
    } else {
      result = await sql`
        SELECT * FROM user_products
        WHERE is_active = true
        ORDER BY created_at DESC
        LIMIT ${max}
      `
    }

    return res.json(result.rows || [])
  } catch (err) {
    console.error('Deals endpoint error:', err)
    return res.json([])
  }
}
