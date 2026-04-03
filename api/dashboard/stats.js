// Dashboard stats endpoint — returns user's store setup, connections, orders, products
import { sql } from '../_lib/db.js'
import { requireAuth } from '../_lib/auth.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const user = await requireAuth(req)

    // Run all queries in parallel
    const [
      connectionsResult,
      ordersResult,
      productsResult,
      domainsResult,
      recentOrdersResult,
      earningsResult,
    ] = await Promise.all([
      // Platform connections
      sql`
        SELECT platform, status, shop_name, shop_url, products_synced,
               last_sync_at, connected_at
        FROM platform_connections
        WHERE user_id = ${user.id}
        ORDER BY connected_at DESC
      `,
      // Order aggregates — includes full money breakdown
      sql`
        SELECT
          COUNT(*)::int AS total_orders,
          COALESCE(SUM(quantity), COUNT(*))::int AS total_items_sold,
          COALESCE(SUM(sale_price), 0)::float AS total_revenue,
          COALESCE(SUM(supplier_cost), 0)::float AS total_supplier_cost,
          COALESCE(SUM(CASE WHEN commission > 0 THEN commission ELSE sale_price * COALESCE((SELECT value::numeric FROM admin_settings WHERE key = 'platform_fee_percent'), 5) / 100 END), 0)::float AS total_commission,
          COALESCE(SUM(profit), 0)::float AS total_profit,
          COUNT(CASE WHEN status = 'pending' THEN 1 END)::int AS pending_orders,
          COUNT(CASE WHEN status = 'processing' THEN 1 END)::int AS processing_orders,
          COUNT(CASE WHEN status = 'shipped' THEN 1 END)::int AS shipped_orders,
          COUNT(CASE WHEN status = 'delivered' THEN 1 END)::int AS delivered_orders
        FROM user_orders
        WHERE user_id = ${user.id}
      `,
      // Product aggregates
      sql`
        SELECT
          COUNT(*)::int AS total_products,
          COUNT(CASE WHEN is_active THEN 1 END)::int AS active_products,
          COALESCE(SUM(total_sold), 0)::int AS total_sold,
          COALESCE(SUM(total_revenue), 0)::float AS product_revenue
        FROM user_products
        WHERE user_id = ${user.id}
      `,
      // Domains (try, table may not exist yet)
      sql`
        SELECT domain, status, registered_at, expires_at
        FROM user_domains
        WHERE user_id = ${user.id}
        ORDER BY registered_at DESC
      `.catch(() => ({ rows: [] })),
      // Recent orders (last 10)
      sql`
        SELECT id, supplier, product_title, product_image,
               supplier_cost, sale_price, profit, commission, commission_rate, quantity,
               platform, platform_order_id, customer_name, customer_email, status,
               tracking_number, notes, created_at
        FROM user_orders
        WHERE user_id = ${user.id}
        ORDER BY created_at DESC
        LIMIT 10
      `,
      // Earnings by day (last 14 days)
      sql`
        SELECT
          DATE(created_at) AS date,
          COALESCE(SUM(sale_price), 0)::float AS revenue,
          COALESCE(SUM(profit), 0)::float AS profit,
          COUNT(*)::int AS orders
        FROM user_orders
        WHERE user_id = ${user.id}
          AND created_at >= NOW() - INTERVAL '14 days'
          AND status != 'cancelled'
        GROUP BY DATE(created_at)
        ORDER BY date
      `,
    ])

    const orderStats = ordersResult.rows[0] || {}
    const productStats = productsResult.rows[0] || {}

    // Get Stripe Connect status
    let stripeConnectStatus = 'not_connected'
    try {
      const { rows: storeRows } = await sql`
        SELECT stripe_connect_status FROM user_stores WHERE user_id = ${user.id}
      `
      if (storeRows[0]?.stripe_connect_status) {
        stripeConnectStatus = storeRows[0].stripe_connect_status
      }
    } catch { /* */ }

    res.json({
      stripeConnectStatus,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar_url: user.avatar_url,
        created_at: user.created_at,
      },
      connections: connectionsResult.rows,
      domains: domainsResult.rows,
      orders: {
        total: orderStats.total_orders || 0,
        itemsSold: orderStats.total_items_sold || 0,
        revenue: orderStats.total_revenue || 0,
        supplierCost: orderStats.total_supplier_cost || 0,
        commission: orderStats.total_commission || 0,
        profit: orderStats.total_profit || 0,
        pending: orderStats.pending_orders || 0,
        processing: orderStats.processing_orders || 0,
        shipped: orderStats.shipped_orders || 0,
        delivered: orderStats.delivered_orders || 0,
      },
      products: {
        total: productStats.total_products || 0,
        active: productStats.active_products || 0,
        totalSold: productStats.total_sold || 0,
        revenue: productStats.product_revenue || 0,
      },
      recentOrders: recentOrdersResult.rows,
      earnings: earningsResult.rows,
    })
  } catch (err) {
    if (err.status === 401) return res.status(401).json({ error: err.message })
    console.error('Dashboard stats error:', err)
    res.status(500).json({ error: 'Failed to fetch dashboard stats' })
  }
}
