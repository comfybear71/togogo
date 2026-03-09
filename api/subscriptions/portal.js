// [Improvement 3] Stripe Customer Portal — lets users manage their subscription
// (update payment method, cancel, view invoices)
import { requireAuth } from '../_lib/auth.js'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const user = await requireAuth(req)

    // Find the Stripe customer by email
    const customers = await stripe.customers.list({ email: user.email, limit: 1 })
    if (customers.data.length === 0) {
      return res.status(404).json({ error: 'No billing account found. Subscribe first.' })
    }

    const baseUrl = process.env.FRONTEND_URL || `https://${req.headers.host}`

    const session = await stripe.billingPortal.sessions.create({
      customer: customers.data[0].id,
      return_url: `${baseUrl}/dashboard?tab=billing`,
    })

    return res.json({ url: session.url })
  } catch (err) {
    if (err.status === 401) return res.status(401).json({ error: err.message })
    console.error('Customer portal error:', err)
    return res.status(500).json({ error: 'Failed to create portal session' })
  }
}
