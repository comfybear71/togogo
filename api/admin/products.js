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
      const page = parseInt(req.query.page) || 1
      const limit = parseInt(req.query.limit) || 50
      const offset = (page - 1) * limit
      const search = req.query.search || ''
      const category = req.query.category || ''

      // Get total count
      let countQuery
      if (search && category) {
        countQuery = await sql`SELECT COUNT(*) as count FROM user_products WHERE title ILIKE ${'%' + search + '%'} AND category = ${category}`
      } else if (search) {
        countQuery = await sql`SELECT COUNT(*) as count FROM user_products WHERE title ILIKE ${'%' + search + '%'}`
      } else if (category) {
        countQuery = await sql`SELECT COUNT(*) as count FROM user_products WHERE category = ${category}`
      } else {
        countQuery = await sql`SELECT COUNT(*) as count FROM user_products`
      }
      const totalProducts = parseInt(countQuery.rows[0].count)
      const totalPages = Math.ceil(totalProducts / limit)

      // Get products with pagination
      let productQuery
      if (search && category) {
        productQuery = await sql`
          SELECT p.id, p.title, p.description, p.image, p.supplier, p.supplier_cost,
                 p.sale_price, p.category, p.is_active, p.total_sold, p.total_revenue,
                 p.created_at, p.updated_at,
                 u.name AS seller_name, u.email AS seller_email
          FROM user_products p
          JOIN users u ON u.id = p.user_id
          WHERE p.title ILIKE ${'%' + search + '%'} AND p.category = ${category}
          ORDER BY p.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `
      } else if (search) {
        productQuery = await sql`
          SELECT p.id, p.title, p.description, p.image, p.supplier, p.supplier_cost,
                 p.sale_price, p.category, p.is_active, p.total_sold, p.total_revenue,
                 p.created_at, p.updated_at,
                 u.name AS seller_name, u.email AS seller_email
          FROM user_products p
          JOIN users u ON u.id = p.user_id
          WHERE p.title ILIKE ${'%' + search + '%'}
          ORDER BY p.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `
      } else if (category) {
        productQuery = await sql`
          SELECT p.id, p.title, p.description, p.image, p.supplier, p.supplier_cost,
                 p.sale_price, p.category, p.is_active, p.total_sold, p.total_revenue,
                 p.created_at, p.updated_at,
                 u.name AS seller_name, u.email AS seller_email
          FROM user_products p
          JOIN users u ON u.id = p.user_id
          WHERE p.category = ${category}
          ORDER BY p.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `
      } else {
        productQuery = await sql`
          SELECT p.id, p.title, p.description, p.image, p.supplier, p.supplier_cost,
                 p.sale_price, p.category, p.is_active, p.total_sold, p.total_revenue,
                 p.created_at, p.updated_at,
                 u.name AS seller_name, u.email AS seller_email
          FROM user_products p
          JOIN users u ON u.id = p.user_id
          ORDER BY p.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `
      }

      // Get all categories for the filter dropdown
      const { rows: catRows } = await sql`SELECT DISTINCT category FROM user_products WHERE category IS NOT NULL AND category != '' ORDER BY category`
      const categories = catRows.map(r => r.category)

      return res.json({
        products: productQuery.rows,
        categories,
        pagination: { page, limit, totalProducts, totalPages },
      })
    } catch (err) {
      console.error('Admin products error:', err)
      return res.json({ products: [], categories: [], pagination: { page: 1, limit: 50, totalProducts: 0, totalPages: 0 } })
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
