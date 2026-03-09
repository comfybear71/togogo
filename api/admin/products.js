// Admin products API — fetches real products from database
import { sql, ensureSchema } from '../_lib/db.js'
import { requireAdminOrSetup } from '../_lib/auth.js'

export default async function handler(req, res) {
  try {
    await requireAdminOrSetup(req)
  } catch (err) {
    return res.status(err?.status || 401).json({ error: err?.message || 'Authentication failed' })
  }

  await ensureSchema()

  if (req.method === 'GET') {
    try {
      const { rows: products } = await sql`
        SELECT p.id, p.title, p.description, p.image, p.supplier, p.supplier_cost,
               p.sale_price, p.category, p.is_active, p.total_sold, p.total_revenue,
               p.created_at, p.updated_at,
               u.name AS seller_name, u.email AS seller_email
        FROM user_products p
        JOIN users u ON u.id = p.user_id
        ORDER BY p.created_at DESC
        LIMIT 200
      `

      // Get categories from actual products
      const categories = [...new Set(products.map(p => p.category).filter(Boolean))]

      return res.json({ products, categories })
    } catch (err) {
      console.error('Admin products error:', err)
      return res.json({ products: [], categories: [] })
    }
  }

  if (req.method === 'PATCH') {
    const { id, action } = req.body
    if (!id) return res.status(400).json({ error: 'Product ID required' })

    try {
      if (action === 'deactivate') {
        await sql`UPDATE user_products SET is_active = false, updated_at = NOW() WHERE id = ${id}`
      } else if (action === 'activate') {
        await sql`UPDATE user_products SET is_active = true, updated_at = NOW() WHERE id = ${id}`
      } else if (action === 'delete') {
        await sql`DELETE FROM user_products WHERE id = ${id}`
      }
      return res.json({ success: true })
    } catch (err) {
      console.error('Admin product action error:', err)
      return res.status(500).json({ error: 'Failed to update product' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
