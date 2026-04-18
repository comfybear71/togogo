// Stripe Connect — Create embedded dashboard session for store owner
// POST /api/connect/dashboard — returns client_secret for embedded dashboard components
import Stripe from 'stripe'
import { sql } from '../_lib/db.js'
import { getCurrentUser } from '../_lib/auth.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

  const user = await getCurrentUser(req)
  if (!user) return res.status(401).json({ error: 'Authentication required' })

  try {
    const { rows: stores } = await sql`
      SELECT stripe_connect_id FROM user_stores WHERE user_id = ${user.id}
    `
    if (!stores[0]?.stripe_connect_id) {
      return res.status(400).json({ error: 'No Stripe Connect account found' })
    }

    const accountSession = await stripe.accountSessions.create({
      account: stores[0].stripe_connect_id,
      components: {
        payments: { enabled: true },
        payouts: { enabled: true },
        balances: { enabled: true },
      },
    })

    return res.json({ clientSecret: accountSession.client_secret })
  } catch (err) {
    console.error('[Connect] Dashboard error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
