// Storefront customer lookup — check order status by email + order ref
// GET /api/storefront/customer?email=X&orderRef=X — single order lookup
// GET /api/storefront/customer?email=X&subdomain=X — all orders for this customer at this store
import { sql } from '../_lib/db.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { email, orderRef, subdomain } = req.query

  if (!email) return res.status(400).json({ error: 'Email required' })

  try {
    // Single order lookup by ref
    if (orderRef) {
      const { rows } = await sql`
        SELECT o.id, o.platform_order_id as order_ref, o.product_title, o.product_image,
               o.sale_price, o.quantity, o.status, o.tracking_number, o.tracking_url,
               o.created_at, o.updated_at,
               s.store_name, s.subdomain
        FROM user_orders o
        LEFT JOIN user_stores s ON s.user_id = o.user_id
        WHERE o.customer_email = ${email} AND o.platform_order_id = ${orderRef}
        ORDER BY o.created_at DESC
      `

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Order not found. Check your email and order reference.' })
      }

      return res.json({ orders: rows })
    }

    // All orders for a customer at a specific store
    if (subdomain) {
      const { rows: storeRows } = await sql`
        SELECT id, user_id, store_name FROM user_stores WHERE subdomain = ${subdomain}
      `
      if (!storeRows[0]) return res.status(404).json({ error: 'Store not found' })

      const store = storeRows[0]

      const { rows: orders } = await sql`
        SELECT id, platform_order_id as order_ref, product_title, product_image,
               sale_price, quantity, status, tracking_number, tracking_url,
               created_at, updated_at
        FROM user_orders
        WHERE user_id = ${store.user_id} AND customer_email = ${email}
          AND status != 'pending_payment'
        ORDER BY created_at DESC
        LIMIT 50
      `

      // Get customer profile
      const { rows: custRows } = await sql`
        SELECT name, order_count, total_spent, last_order_at, created_at
        FROM store_customers
        WHERE store_id = ${store.id} AND email = ${email}
      `

      return res.json({
        customer: custRows[0] || null,
        orders,
        store: { name: store.store_name, subdomain },
      })
    }

    return res.status(400).json({ error: 'Provide either orderRef or subdomain' })

  } catch (err) {
    console.error('Customer lookup error:', err.message)
    return res.status(500).json({ error: 'Failed to look up order' })
  }
}
