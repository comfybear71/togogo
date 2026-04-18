// Stripe Connect — Get account status
// GET /api/connect/status — returns connect account status, balance, payouts
import Stripe from 'stripe'
import { sql } from '../_lib/db.js'
import { getCurrentUser } from '../_lib/auth.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

  const user = await getCurrentUser(req)
  if (!user) return res.status(401).json({ error: 'Authentication required' })

  try {
    const { rows: stores } = await sql`
      SELECT stripe_connect_id, stripe_connect_status, subdomain, store_name
      FROM user_stores WHERE user_id = ${user.id}
    `
    if (!stores[0]) {
      return res.json({ connected: false, status: 'no_store' })
    }

    const store = stores[0]
    if (!store.stripe_connect_id) {
      return res.json({ connected: false, status: 'not_connected' })
    }

    // Get account details from Stripe
    const account = await stripe.accounts.retrieve(store.stripe_connect_id)

    const status = account.charges_enabled && account.payouts_enabled
      ? 'active'
      : account.details_submitted
        ? 'pending_verification'
        : 'onboarding_incomplete'

    // Update status in DB if changed
    if (status !== store.stripe_connect_status) {
      await sql`
        UPDATE user_stores
        SET stripe_connect_status = ${status}, updated_at = NOW()
        WHERE stripe_connect_id = ${store.stripe_connect_id}
      `
    }

    // Get balance if active
    let balance = null
    if (account.charges_enabled) {
      try {
        const bal = await stripe.balance.retrieve({ stripeAccount: store.stripe_connect_id })
        balance = {
          available: bal.available?.reduce((s, b) => s + b.amount, 0) / 100 || 0,
          pending: bal.pending?.reduce((s, b) => s + b.amount, 0) / 100 || 0,
          currency: 'AUD',
        }
      } catch { /* balance not available */ }
    }

    return res.json({
      connected: true,
      accountId: store.stripe_connect_id,
      status,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      balance,
      store: { subdomain: store.subdomain, name: store.store_name },
    })
  } catch (err) {
    console.error('[Connect] Status error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
