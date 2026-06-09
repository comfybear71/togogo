// Admin products API — fetches real products from database
import { sql } from '../_lib/db.js'
import { requireAdminLite } from '../_lib/auth.js'
import { getAudRate } from '../_lib/pricing.js'
import { getCommissionRate } from '../_lib/commission.js'

export default async function handler(req, res) {
  try {
    await requireAdminLite(req)
  } catch (err) {
    return res.status(err?.status || 500).json({ error: err?.message || 'Auth error' })
  }

  if (req.method === 'GET') {
    try {
      const page = parseInt(req.query.page) || 1
      const limit = parseInt(req.query.limit) || 50
      const offset = (page - 1) * limit
      const search = req.query.search || ''
      const category = req.query.category || ''
      const storeUserId = req.query.store || ''
      const unique = req.query.unique === 'true'

      // Build WHERE conditions
      const conditions = []
      const params = []
      if (search) conditions.push(`p.title ILIKE '%' || $${params.push(search)} || '%'`)
      if (category) conditions.push(`p.category = $${params.push(category)}`)
      if (storeUserId) conditions.push(`p.user_id = $${params.push(storeUserId)}::uuid`)

      const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''

      // For unique mode (no store filter): deduplicate by supplier_product_id
      let countResult, productResult
      if (unique && !storeUserId) {
        countResult = await sql.query(
          `SELECT COUNT(DISTINCT supplier_product_id) as count FROM user_products p ${whereClause}`,
          params
        )
        productResult = await sql.query(
          `SELECT DISTINCT ON (p.supplier_product_id)
            p.id, p.title, p.description, p.image, p.supplier, p.supplier_cost,
            p.sale_price, p.api_price, p.shipping_cost, p.tax_amount,
            p.supplier_product_id,
            p.category, p.is_active, p.total_sold, p.total_revenue,
            p.created_at, p.updated_at,
            u.name AS seller_name, u.email AS seller_email,
            (SELECT st.markup_percent FROM user_stores st WHERE st.user_id = p.user_id LIMIT 1) AS markup_percent
          FROM user_products p
          JOIN users u ON u.id = p.user_id
          ${whereClause}
          ORDER BY p.supplier_product_id, p.created_at DESC
          LIMIT $${params.push(limit)} OFFSET $${params.push(offset)}`,
          params
        )
      } else {
        countResult = await sql.query(
          `SELECT COUNT(*) as count FROM user_products p ${whereClause}`,
          params
        )
        const countParams = [...params]
        productResult = await sql.query(
          `SELECT p.id, p.title, p.description, p.image, p.supplier, p.supplier_cost,
            p.sale_price, p.api_price, p.shipping_cost, p.tax_amount,
            p.supplier_product_id,
            p.category, p.is_active, p.total_sold, p.total_revenue,
            p.created_at, p.updated_at,
            u.name AS seller_name, u.email AS seller_email,
            (SELECT st.markup_percent FROM user_stores st WHERE st.user_id = p.user_id LIMIT 1) AS markup_percent
          FROM user_products p
          JOIN users u ON u.id = p.user_id
          ${whereClause}
          ORDER BY p.created_at DESC
          LIMIT $${countParams.push(limit)} OFFSET $${countParams.push(offset)}`,
          countParams
        )
      }

      const totalProducts = parseInt(countResult.rows[0].count)
      const totalPages = Math.ceil(totalProducts / limit)

      // Get categories + stores for filter dropdowns
      const { rows: catRows } = await sql`SELECT DISTINCT category FROM user_products WHERE category IS NOT NULL AND category != '' ORDER BY category`
      const categories = catRows.map(r => r.category)

      const { rows: storeRows } = await sql`
        SELECT s.user_id, s.store_name, s.subdomain
        FROM user_stores s WHERE s.status = 'active' ORDER BY s.store_name
      `

      // Real profit needs the same inputs the storefront uses: USD->AUD rate
      // and the platform commission rate. supplier_cost/sale_price are stored
      // in break-even USD; the customer price = sale_price x (1 + markup/100),
      // converted to AUD. Profit/commission are zero without the markup.
      let audRate = 1.45
      let commissionRate = 0.30
      try { audRate = await getAudRate() } catch { /* default */ }
      try { commissionRate = await getCommissionRate() } catch { /* default */ }

      return res.json({
        products: productResult.rows,
        categories,
        stores: storeRows,
        audRate,
        commissionRate,
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
