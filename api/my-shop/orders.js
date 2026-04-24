// User's own orders API — returns orders placed in the authenticated
// user's store. Ownership enforced via WHERE user_id = caller.id.
//
// GET /api/my-shop/orders?limit=100
//
// Returns columns the Orders page needs: who bought, what, when, how
// much they paid, how much AE billed us, and the store owner's profit.
import { sql } from '../_lib/db.js'
import { requireAuth } from '../_lib/auth.js'

export default async function handler(req, res) {
  let user
  try {
    user = await requireAuth(req)
  } catch (err) {
    return res.status(err?.status || 401).json({ error: err?.message || 'Authentication required' })
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const limit = Math.min(parseInt(req.query.limit) || 100, 500)

  try {
    const { rows: orders } = await sql`
      SELECT
        id,
        platform_order_id,
        product_title,
        product_image,
        sale_price,
        supplier_cost,
        ae_actual_cost_usd,
        commission,
        profit,
        status,
        customer_name,
        created_at,
        supplier_product_id
      FROM user_orders
      WHERE user_id = ${user.id}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `

    return res.json({
      orders: orders.map(o => ({
        id: o.id,
        orderRef: o.platform_order_id || '',
        productTitle: o.product_title,
        productImage: o.product_image,
        customerName: o.customer_name || 'Customer',
        customerPaid: parseFloat(o.sale_price) || 0,
        supplierCost: parseFloat(o.supplier_cost) || 0,
        aeBilled: o.ae_actual_cost_usd != null ? parseFloat(o.ae_actual_cost_usd) : null,
        commission: parseFloat(o.commission) || 0,
        profit: parseFloat(o.profit) || 0,
        status: o.status || 'pending',
        createdAt: o.created_at,
      })),
    })
  } catch (err) {
    console.error('My orders error:', err)
    return res.status(500).json({ error: 'Failed to fetch orders' })
  }
}
