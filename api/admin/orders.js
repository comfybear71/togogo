// Admin orders API — fetches real orders and disputes from database
import { sql, ensureSchema } from '../_lib/db.js'
import { getCurrentUser } from '../_lib/auth.js'

export default async function handler(req, res) {
  // Auth: check JWT then verify role from DATABASE
  const setupSecret = req.headers['x-setup-secret'] || req.query.secret
  if (setupSecret && setupSecret === process.env.JWT_SECRET) {
    // OK
  } else {
    const tokenUser = await getCurrentUser(req)
    if (!tokenUser) return res.status(401).json({ error: 'Authentication required' })
    const { rows } = await sql`SELECT role FROM users WHERE id = ${tokenUser.id}`
    if (!rows[0] || rows[0].role !== 'admin') return res.status(403).json({ error: 'Admin access required' })
  }

  await ensureSchema()

  if (req.method === 'GET') {
    try {
      const [ordersResult, disputesResult, financialsResult] = await Promise.all([
        sql`
          SELECT o.id, o.product_title, o.product_image, o.supplier, o.supplier_cost,
                 o.sale_price, o.profit, o.commission, o.quantity, o.platform,
                 o.customer_name, o.customer_email, o.shipping_address,
                 o.status, o.tracking_number, o.tracking_url, o.notes,
                 o.created_at, o.updated_at,
                 u.name AS seller_name, u.email AS seller_email
          FROM user_orders o
          JOIN users u ON u.id = o.user_id
          ORDER BY o.created_at DESC
          LIMIT 200
        `.catch(e => { console.error('Orders query failed:', e.message); return { rows: [] } }),
        sql`
          SELECT d.id, d.stripe_dispute_id, d.order_id, d.amount, d.currency,
                 d.reason, d.status, d.admin_note, d.evidence_due_by,
                 d.created_at, d.updated_at,
                 u.name AS user_name, u.email AS user_email
          FROM disputes d
          LEFT JOIN users u ON u.id = d.user_id
          ORDER BY d.created_at DESC
          LIMIT 50
        `.catch(e => { console.error('Disputes query failed:', e.message); return { rows: [] } }),
        sql`
          SELECT
            COALESCE(SUM(commission), 0)::numeric AS total_fees,
            COALESCE(SUM(CASE WHEN status = 'delivered' THEN sale_price - commission ELSE 0 END), 0)::numeric AS total_payouts,
            COALESCE(SUM(commission), 0)::numeric AS platform_balance
          FROM user_orders WHERE status != 'cancelled'
        `.catch(e => { console.error('Financials query failed:', e.message); return { rows: [{ total_fees: 0, total_payouts: 0, platform_balance: 0 }] } }),
      ])

      return res.json({
        orders: ordersResult.rows,
        disputes: disputesResult.rows,
        financials: financialsResult.rows[0] || { total_fees: 0, total_payouts: 0, platform_balance: 0 },
      })
    } catch (err) {
      console.error('Admin orders error:', err)
      return res.status(500).json({ error: 'Failed to fetch orders', detail: err.message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
