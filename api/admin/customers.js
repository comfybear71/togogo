// Admin customers API — view all store customers across all stores
import { sql, ensureSchema } from '../_lib/db.js'
import { requireAdminLite } from '../_lib/auth.js'

export default async function handler(req, res) {
  try {
    await requireAdminLite(req)
  } catch (err) {
    return res.status(err?.status || 500).json({ error: err?.message || 'Auth error' })
  }

  await ensureSchema()

  if (req.method === 'GET') {
    const { search, storeId } = req.query

    try {
      let customers
      if (search && storeId) {
        customers = await sql`
          SELECT c.*, s.store_name, s.subdomain
          FROM store_customers c
          JOIN user_stores s ON s.id = c.store_id
          WHERE c.store_id = ${storeId}
            AND (c.email ILIKE ${'%' + search + '%'} OR c.name ILIKE ${'%' + search + '%'})
          ORDER BY c.last_order_at DESC NULLS LAST
          LIMIT 200
        `
      } else if (search) {
        customers = await sql`
          SELECT c.*, s.store_name, s.subdomain
          FROM store_customers c
          JOIN user_stores s ON s.id = c.store_id
          WHERE c.email ILIKE ${'%' + search + '%'} OR c.name ILIKE ${'%' + search + '%'}
          ORDER BY c.last_order_at DESC NULLS LAST
          LIMIT 200
        `
      } else if (storeId) {
        customers = await sql`
          SELECT c.*, s.store_name, s.subdomain
          FROM store_customers c
          JOIN user_stores s ON s.id = c.store_id
          WHERE c.store_id = ${storeId}
          ORDER BY c.last_order_at DESC NULLS LAST
          LIMIT 200
        `
      } else {
        customers = await sql`
          SELECT c.*, s.store_name, s.subdomain
          FROM store_customers c
          JOIN user_stores s ON s.id = c.store_id
          ORDER BY c.last_order_at DESC NULLS LAST
          LIMIT 200
        `
      }

      // Get total count and stats
      const { rows: stats } = await sql`
        SELECT COUNT(*)::int as total_customers,
               COALESCE(SUM(total_spent), 0)::numeric as total_revenue,
               COALESCE(SUM(order_count), 0)::int as total_orders
        FROM store_customers
      `

      // Get stores for filter dropdown
      const { rows: stores } = await sql`
        SELECT id, store_name, subdomain FROM user_stores ORDER BY store_name
      `

      return res.json({
        customers: customers.rows,
        stats: stats[0] || { total_customers: 0, total_revenue: 0, total_orders: 0 },
        stores,
      })
    } catch (err) {
      console.error('Admin customers error:', err.message)
      return res.status(500).json({ error: 'Failed to fetch customers' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
