// User's own earnings summary — month-to-date + lifetime profit plus
// Stripe Connect balance. All ownership-scoped to the caller's user_id.
//
// GET /api/my-shop/earnings
//
// Response shape:
//   {
//     thisMonth: { earnings, orderCount },
//     lifetime:  { earnings, orderCount },
//     stripe: {
//       connected,
//       status,          // 'active' | 'not_connected' | 'pending' | etc.
//       available,       // USD available for withdrawal
//       pending,         // USD in transit
//       dashboardUrl,    // express dashboard link when connected
//     }
//   }
import Stripe from 'stripe'
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

  try {
    // Earnings rollup — profit column is the store owner's share after
    // commission (set by the checkout endpoint at order creation time).
    // Exclude cancelled/refunded so the numbers reflect actual income.
    const { rows: agg } = await sql`
      SELECT
        COALESCE(SUM(profit) FILTER (
          WHERE created_at >= date_trunc('month', NOW())
        ), 0)::numeric AS month_earnings,
        COUNT(*) FILTER (
          WHERE created_at >= date_trunc('month', NOW())
        )::int AS month_count,
        COALESCE(SUM(profit), 0)::numeric AS lifetime_earnings,
        COUNT(*)::int AS lifetime_count
      FROM user_orders
      WHERE user_id = ${user.id}
        AND status NOT IN ('cancelled', 'refunded')
    `
    const a = agg[0] || {}

    // Stripe balance lookup — only if connect is active. Swallow all
    // Stripe errors; earnings rollups should still work if Stripe is
    // temporarily unreachable.
    let stripeBlock = { connected: false, status: 'not_connected', available: 0, pending: 0, dashboardUrl: null }
    try {
      const { rows: stores } = await sql`
        SELECT stripe_connect_id, stripe_connect_status
        FROM user_stores
        WHERE user_id = ${user.id}
        LIMIT 1
      `
      const store = stores[0]
      if (store?.stripe_connect_id) {
        stripeBlock.connected = true
        stripeBlock.status = store.stripe_connect_status || 'pending'

        if (stripeBlock.status === 'active') {
          const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
          const bal = await stripe.balance.retrieve({ stripeAccount: store.stripe_connect_id })
          // balance.available / balance.pending are arrays by currency
          const available = (bal.available || []).reduce((s, b) => s + (b.currency === 'usd' ? b.amount : 0), 0)
          const pending = (bal.pending || []).reduce((s, b) => s + (b.currency === 'usd' ? b.amount : 0), 0)
          stripeBlock.available = available / 100
          stripeBlock.pending = pending / 100
          // Express dashboard link (Stripe hosts it; no login needed from
          // store owner if they're still signed into Stripe, otherwise
          // they'll be prompted).
          try {
            const link = await stripe.accounts.createLoginLink(store.stripe_connect_id)
            stripeBlock.dashboardUrl = link.url
          } catch { /* dashboard link is optional — not fatal */ }
        }
      }
    } catch (stripeErr) {
      console.warn('[my-shop/earnings] Stripe lookup failed:', stripeErr.message)
      // Leave stripeBlock with defaults so the UI can still render.
    }

    return res.json({
      thisMonth: {
        earnings: parseFloat(a.month_earnings) || 0,
        orderCount: a.month_count || 0,
      },
      lifetime: {
        earnings: parseFloat(a.lifetime_earnings) || 0,
        orderCount: a.lifetime_count || 0,
      },
      stripe: stripeBlock,
    })
  } catch (err) {
    console.error('My earnings error:', err)
    return res.status(500).json({ error: 'Failed to fetch earnings' })
  }
}
