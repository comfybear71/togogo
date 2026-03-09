import { sql } from '../_lib/db.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { id } = req.query
  if (!id) return res.status(400).json({ error: 'Product ID required' })

  try {
    const result = await sql`
      SELECT * FROM user_products WHERE id = ${id}
    `
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Product not found' })
    }
    return res.json(result.rows[0])
  } catch (err) {
    console.error('Product fetch error:', err)
    return res.status(500).json({ error: 'Failed to fetch product' })
  }
}
