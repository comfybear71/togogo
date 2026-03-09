// Admin dashboard stats API
import { sql } from '../_lib/db.js'
import { requireAdminOrSetup } from '../_lib/auth.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    await requireAdminOrSetup(req)
  } catch (err) {
    return res.status(err?.status || 401).json({ error: err?.message || 'Authentication failed' })
  }

  try {
    const [usersResult, productsResult, ordersResult, revenueResult, disputesResult] = await Promise.all([
      sql`SELECT COUNT(*)::int AS count FROM users`.catch(() => ({ rows: [{ count: 0 }] })),
      sql`SELECT COUNT(*)::int AS count FROM user_products WHERE is_active = true`.catch(() => ({ rows: [{ count: 0 }] })),
      sql`SELECT COUNT(*)::int AS count FROM user_orders WHERE created_at >= CURRENT_DATE`.catch(() => ({ rows: [{ count: 0 }] })),
      sql`SELECT COALESCE(SUM(sale_price), 0)::numeric AS total FROM user_orders WHERE created_at >= CURRENT_DATE`.catch(() => ({ rows: [{ total: 0 }] })),
      sql`SELECT COUNT(*)::int AS count FROM user_orders WHERE status = 'pending'`.catch(() => ({ rows: [{ count: 0 }] })),
    ])

    return res.json({
      totalUsers: usersResult.rows[0]?.count || 0,
      activeListings: productsResult.rows[0]?.count || 0,
      ordersToday: ordersResult.rows[0]?.count || 0,
      revenueToday: parseFloat(revenueResult.rows[0]?.total) || 0,
      openDisputes: disputesResult.rows[0]?.count || 0,
    })
  } catch (err) {
    console.error('Failed to load admin stats:', err)
    // Return zeros instead of erroring — dashboard should still render
    return res.json({
      totalUsers: 0,
      activeListings: 0,
      ordersToday: 0,
      revenueToday: 0,
      openDisputes: 0,
    })
  }
}
