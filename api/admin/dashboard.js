// Admin dashboard extra data — recent orders, top products, top sellers, charts
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
    const [recentOrdersResult, topProductsResult, topSellersResult, revenueByDayResult, signupsByDayResult, subRevenueByDayResult] = await Promise.all([
      // Recent orders (last 20)
      sql`
        SELECT o.id, o.order_ref, o.product_title, o.sale_price, o.status, o.created_at,
               u.name AS buyer_name, u.email AS buyer_email
        FROM user_orders o
        LEFT JOIN users u ON u.id = o.user_id
        ORDER BY o.created_at DESC
        LIMIT 20
      `.catch(() => ({ rows: [] })),

      // Top products by units sold
      sql`
        SELECT product_title AS name, COUNT(*)::int AS units_sold,
               COALESCE(SUM(sale_price), 0)::numeric AS revenue
        FROM user_orders
        WHERE product_title IS NOT NULL
        GROUP BY product_title
        ORDER BY units_sold DESC
        LIMIT 5
      `.catch(() => ({ rows: [] })),

      // Top sellers by order count
      sql`
        SELECT u.name, u.email, COUNT(o.id)::int AS sales,
               COALESCE(SUM(o.sale_price), 0)::numeric AS revenue
        FROM user_orders o
        JOIN users u ON u.id = o.user_id
        GROUP BY u.id, u.name, u.email
        ORDER BY sales DESC
        LIMIT 5
      `.catch(() => ({ rows: [] })),

      // Revenue by day (last 30 days)
      sql`
        SELECT DATE(created_at) AS date, COALESCE(SUM(sale_price), 0)::numeric AS revenue
        FROM user_orders
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `.catch(() => ({ rows: [] })),

      // Signups by day (last 30 days)
      sql`
        SELECT DATE(created_at) AS date, COUNT(*)::int AS signups
        FROM users
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `.catch(() => ({ rows: [] })),

      // Subscription revenue by day (last 30 days)
      sql`
        SELECT DATE(started_at) AS date, COALESCE(SUM(price_per_month), 0)::numeric AS revenue
        FROM subscriptions
        WHERE started_at >= CURRENT_DATE - INTERVAL '30 days' AND status = 'active'
        GROUP BY DATE(started_at)
        ORDER BY date ASC
      `.catch(() => ({ rows: [] })),
    ])

    // Format time-ago for recent orders
    const recentOrders = recentOrdersResult.rows.map((o) => {
      const mins = Math.floor((Date.now() - new Date(o.created_at).getTime()) / 60000)
      let timeAgo = 'just now'
      if (mins >= 1440) timeAgo = `${Math.floor(mins / 1440)}d ago`
      else if (mins >= 60) timeAgo = `${Math.floor(mins / 60)}h ago`
      else if (mins >= 1) timeAgo = `${mins}m ago`

      return {
        id: `ORD-${o.id}`,
        buyer: o.buyer_name || o.buyer_email?.split('@')[0] || 'Unknown',
        product: o.product_title || 'Unknown product',
        total: parseFloat(o.sale_price) || 0,
        status: o.status || 'pending',
        time: timeAgo,
      }
    })

    // Fill in missing days for charts
    const last30Days = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      last30Days.push(d.toISOString().split('T')[0])
    }

    const orderRevenueMap = Object.fromEntries(revenueByDayResult.rows.map((r) => [r.date?.toISOString?.()?.split('T')[0] || r.date, parseFloat(r.revenue)]))
    const subRevenueMap = Object.fromEntries(subRevenueByDayResult.rows.map((r) => [r.date?.toISOString?.()?.split('T')[0] || r.date, parseFloat(r.revenue)]))
    // Combine order + subscription revenue per day
    const revenueMap = {}
    for (const date of last30Days) {
      revenueMap[date] = (orderRevenueMap[date] || 0) + (subRevenueMap[date] || 0)
    }
    const signupsMap = Object.fromEntries(signupsByDayResult.rows.map((r) => [r.date?.toISOString?.()?.split('T')[0] || r.date, r.signups]))

    const revenueByDay = last30Days.map((date) => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      revenue: revenueMap[date] || 0,
    }))

    const signupsByDay = last30Days.map((date) => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      signups: signupsMap[date] || 0,
    }))

    return res.json({
      recentOrders,
      topProducts: topProductsResult.rows.map((p, i) => ({
        rank: i + 1,
        name: p.name,
        unitsSold: p.units_sold,
        revenue: parseFloat(p.revenue) || 0,
      })),
      topSellers: topSellersResult.rows.map((s) => ({
        name: s.name || s.email?.split('@')[0] || 'Unknown',
        sales: s.sales,
        revenue: parseFloat(s.revenue) || 0,
      })),
      revenueByDay,
      signupsByDay,
    })
  } catch (err) {
    console.error('Failed to load dashboard data:', err)
    return res.json({
      recentOrders: [],
      topProducts: [],
      topSellers: [],
      revenueByDay: [],
      signupsByDay: [],
    })
  }
}
