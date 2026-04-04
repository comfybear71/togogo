// One-time: set all existing Connect accounts to manual payouts
// GET /api/admin/set-manual-payouts?secret=JWT_SECRET
import Stripe from 'stripe'
import { sql, ensureSchema } from '../_lib/db.js'

export default async function handler(req, res) {
  const secret = req.query.secret || req.headers['x-setup-secret']
  if (!secret || secret !== process.env.JWT_SECRET) {
    return res.status(403).json({ error: 'Secret required' })
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  await ensureSchema()

  const { rows: stores } = await sql`
    SELECT subdomain, store_name, stripe_connect_id, stripe_connect_status
    FROM user_stores WHERE stripe_connect_id IS NOT NULL
  `

  const results = []

  for (const store of stores) {
    try {
      await stripe.accounts.update(store.stripe_connect_id, {
        settings: {
          payouts: {
            schedule: { interval: 'manual' },
          },
        },
      })
      results.push({ store: store.subdomain, account: store.stripe_connect_id, status: 'set to manual' })
      console.log(`[Payouts] ${store.subdomain} (${store.stripe_connect_id}) set to manual payouts`)
    } catch (err) {
      results.push({ store: store.subdomain, account: store.stripe_connect_id, error: err.message })
      console.error(`[Payouts] Failed for ${store.subdomain}:`, err.message)
    }
  }

  return res.json({ success: true, results })
}
