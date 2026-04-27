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
    // Earnings + sales rollup — two numbers per window:
    //   sales    = SUM(sale_price)  (what customers paid — "revenue")
    //   earnings = SUM(profit)      (owner's net share after commission)
    // Both exclude cancelled/refunded so the numbers reflect actual
    // completed transactions. The Orders page handles per-row display;
    // this endpoint is pure aggregate.
    const { rows: agg } = await sql`
      SELECT
        COALESCE(SUM(profit) FILTER (
          WHERE created_at >= date_trunc('month', NOW())
        ), 0)::numeric AS month_earnings,
        COALESCE(SUM(sale_price) FILTER (
          WHERE created_at >= date_trunc('month', NOW())
        ), 0)::numeric AS month_sales,
        COUNT(*) FILTER (
          WHERE created_at >= date_trunc('month', NOW())
        )::int AS month_count,
        COALESCE(SUM(profit), 0)::numeric AS lifetime_earnings,
        COALESCE(SUM(sale_price), 0)::numeric AS lifetime_sales,
        COUNT(*)::int AS lifetime_count
      FROM user_orders
      WHERE user_id = ${user.id}
        AND status NOT IN ('cancelled', 'refunded')
    `
    const a = agg[0] || {}

    // Stripe balance lookup — only if connect is active. Swallow all
    // Stripe errors; earnings rollups should still work if Stripe is
    // temporarily unreachable.
    //
    // Three states:
    //   - not_connected:  no stripe_connect_id at all → show "Set up payouts"
    //   - pending:        account created but onboarding not complete →
    //                     show "Continue Stripe setup". This is the state
    //                     Michael got into when he opened the onboarding
    //                     once and closed the tab without finishing.
    //   - active:         fully onboarded → show balances + dashboard link.
    //
    // `connected` is only true when status === 'active' so the
    // earnings UI doesn't render a balance for an account that
    // isn't ready to receive funds yet.
    let stripeBlock = { connected: false, pendingSetup: false, status: 'not_connected', available: 0, pending: 0, dashboardUrl: null }
    try {
      const { rows: stores } = await sql`
        SELECT stripe_connect_id, stripe_connect_status
        FROM user_stores
        WHERE user_id = ${user.id}
        LIMIT 1
      `
      const store = stores[0]
      if (store?.stripe_connect_id) {
        stripeBlock.status = store.stripe_connect_status || 'pending'
        if (stripeBlock.status === 'active') {
          stripeBlock.connected = true
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
        } else {
          // Account exists but onboarding incomplete — flag for the UI.
          stripeBlock.pendingSetup = true
        }
      }
    } catch (stripeErr) {
      console.warn('[my-shop/earnings] Stripe lookup failed:', stripeErr.message)
      // Leave stripeBlock with defaults so the UI can still render.
    }

    return res.json({
      thisMonth: {
        sales: parseFloat(a.month_sales) || 0,
        earnings: parseFloat(a.month_earnings) || 0,
        orderCount: a.month_count || 0,
      },
      lifetime: {
        sales: parseFloat(a.lifetime_sales) || 0,
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
