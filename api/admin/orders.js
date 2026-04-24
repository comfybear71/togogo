// Admin orders API — fetches real orders and disputes from database
import { sql } from '../_lib/db.js'
import { requireAdminLite } from '../_lib/auth.js'

export default async function handler(req, res) {
  try {
    await requireAdminLite(req)
  } catch (err) {
    return res.status(err?.status || 500).json({ error: err?.message || 'Auth error' })
  }

  if (req.method === 'GET') {
    try {
      const [ordersResult, disputesResult, financialsResult, subsResult] = await Promise.all([
        sql`
          SELECT o.id, o.product_title, o.product_image, o.supplier, o.supplier_cost,
                 o.sale_price, o.profit, o.commission, o.quantity, o.platform,
                 o.customer_name, o.customer_email, o.shipping_address,
                 o.status, o.tracking_number, o.tracking_url, o.notes,
                 o.created_at, o.updated_at,
                 o.ae_actual_cost_usd, o.ae_actual_fetched_at, o.supplier_order_id,
                 u.name AS seller_name, u.email AS seller_email
          FROM user_orders o
          LEFT JOIN users u ON u.id = o.user_id
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
        // Subscription MRR — sum price_per_month across active subscriptions.
        // Fallback to count × $19.99 if price_per_month is null/zero on any row.
        sql`
          SELECT
            COUNT(*)::int AS active_count,
            COALESCE(SUM(NULLIF(price_per_month, 0)), 0)::numeric AS mrr_sum,
            COUNT(*) FILTER (WHERE COALESCE(price_per_month, 0) = 0)::int AS zero_price_count
          FROM subscriptions
          WHERE status = 'active'
        `.catch(e => { console.error('Subs query failed:', e.message); return { rows: [{ active_count: 0, mrr_sum: 0, zero_price_count: 0 }] } }),
      ])

      const subsRow = subsResult.rows[0] || { active_count: 0, mrr_sum: 0, zero_price_count: 0 }
      const activeCount = parseInt(subsRow.active_count) || 0
      const mrrFromRows = parseFloat(subsRow.mrr_sum) || 0
      const zeroPriced = parseInt(subsRow.zero_price_count) || 0
      // If some rows had no price_per_month set, top up at the default $19.99
      const mrr = mrrFromRows + (zeroPriced * 19.99)

      return res.json({
        orders: ordersResult.rows,
        disputes: disputesResult.rows,
        financials: financialsResult.rows[0] || { total_fees: 0, total_payouts: 0, platform_balance: 0 },
        subscriptions: {
          activeCount,
          mrr: Math.round(mrr * 100) / 100,
        },
      })
    } catch (err) {
      console.error('Admin orders error:', err)
      return res.status(500).json({ error: 'Failed to fetch orders', detail: err.message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
