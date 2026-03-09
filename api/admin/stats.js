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
    const [usersResult, productsResult, ordersResult, revenueResult, disputesResult, subRevenueResult, storesResult, commissionResult, allTimeResult] = await Promise.all([
      sql`SELECT COUNT(*)::int AS count FROM users`.catch(() => ({ rows: [{ count: 0 }] })),
      sql`SELECT COUNT(*)::int AS count FROM user_products WHERE is_active = true`.catch(() => ({ rows: [{ count: 0 }] })),
      sql`SELECT COUNT(*)::int AS count FROM user_orders WHERE created_at >= CURRENT_DATE`.catch(() => ({ rows: [{ count: 0 }] })),
      sql`SELECT COALESCE(SUM(sale_price), 0)::numeric AS total FROM user_orders WHERE created_at >= CURRENT_DATE`.catch(() => ({ rows: [{ total: 0 }] })),
      sql`SELECT COUNT(*)::int AS count FROM user_orders WHERE status = 'pending'`.catch(() => ({ rows: [{ count: 0 }] })),
      // Total active subscription revenue (monthly recurring)
      sql`SELECT COALESCE(SUM(price_per_month), 0)::numeric AS total FROM subscriptions WHERE status = 'active'`.catch(() => ({ rows: [{ total: 0 }] })),
      // Total stores (all statuses except deleted)
      sql`SELECT COUNT(*)::int AS count FROM user_stores WHERE status != 'deleted'`.catch(() => ({ rows: [{ count: 0 }] })),
      // ToGoGo commission earned today (5% of each sale)
      sql`SELECT COALESCE(SUM(commission), 0)::numeric AS today, COALESCE(SUM(CASE WHEN commission = 0 THEN sale_price * 0.05 ELSE commission END), 0)::numeric AS today_with_fallback FROM user_orders WHERE created_at >= CURRENT_DATE AND status != 'cancelled'`.catch(() => ({ rows: [{ today: 0, today_with_fallback: 0 }] })),
      // All-time totals for ToGoGo
      sql`
        SELECT
          COALESCE(SUM(sale_price), 0)::numeric AS total_sales,
          COALESCE(SUM(CASE WHEN commission > 0 THEN commission ELSE sale_price * 0.05 END), 0)::numeric AS total_commission,
          COALESCE(SUM(profit), 0)::numeric AS total_client_profit,
          COUNT(*)::int AS total_orders
        FROM user_orders WHERE status != 'cancelled'
      `.catch(() => ({ rows: [{ total_sales: 0, total_commission: 0, total_client_profit: 0, total_orders: 0 }] })),
    ])

    const orderRevenue = parseFloat(revenueResult.rows[0]?.total) || 0
    const subscriptionRevenue = parseFloat(subRevenueResult.rows[0]?.total) || 0
    const commissionToday = parseFloat(commissionResult.rows[0]?.today_with_fallback) || 0
    const allTime = allTimeResult.rows[0] || {}

    return res.json({
      totalUsers: usersResult.rows[0]?.count || 0,
      activeListings: productsResult.rows[0]?.count || 0,
      ordersToday: ordersResult.rows[0]?.count || 0,
      revenueToday: orderRevenue + subscriptionRevenue,
      subscriptionRevenue,
      activeStores: storesResult.rows[0]?.count || 0,
      openDisputes: disputesResult.rows[0]?.count || 0,
      // ToGoGo's cut
      commissionToday,
      togogoRevenue: {
        commissionsToday: commissionToday,
        subscriptionsMonthly: subscriptionRevenue,
        totalToday: commissionToday + subscriptionRevenue,
      },
      // All-time breakdown
      allTime: {
        totalSales: parseFloat(allTime.total_sales) || 0,
        totalCommission: parseFloat(allTime.total_commission) || 0,
        totalClientProfit: parseFloat(allTime.total_client_profit) || 0,
        totalOrders: allTime.total_orders || 0,
      },
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
