import { sql } from '../_lib/db.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { q, category, sort, limit } = req.query
    const max = Math.min(parseInt(limit) || 50, 100)

    let result
    if (q) {
      const pattern = `%${q}%`
      result = await sql`
        SELECT * FROM user_products
        WHERE is_active = true
          AND (title ILIKE ${pattern} OR description ILIKE ${pattern})
        ORDER BY created_at DESC
        LIMIT ${max}
      `
    } else if (category) {
      result = await sql`
        SELECT * FROM user_products
        WHERE is_active = true AND category = ${category}
        ORDER BY created_at DESC
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
    console.error('Product search error:', err)
    return res.json([])
  }
}
