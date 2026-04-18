// Stripe Connect — Create Custom account + embedded onboarding session
// POST /api/connect/onboard — creates account and returns client_secret for embedded onboarding
import Stripe from 'stripe'
import { sql } from '../_lib/db.js'
import { getCurrentUser } from '../_lib/auth.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

  // Auth
  const user = await getCurrentUser(req)
  if (!user) return res.status(401).json({ error: 'Authentication required' })

  try {
    // Check if user has a store
    const { rows: stores } = await sql`
      SELECT id, user_id, subdomain, store_name, stripe_connect_id, stripe_connect_status
      FROM user_stores WHERE user_id = ${user.id}
    `
    if (!stores[0]) {
      return res.status(400).json({ error: 'You need a store first' })
    }
    const store = stores[0]

    let accountId = store.stripe_connect_id

    // Create a new Custom connected account if none exists
    if (!accountId) {
      console.log(`[Connect] Creating Custom account for ${user.email} (store: ${store.subdomain})`)

      const account = await stripe.accounts.create({
        type: 'custom',
        country: 'AU',
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
        business_profile: {
          name: store.store_name || store.subdomain,
          url: `https://${store.subdomain}.togogo.me`,
          mcc: '5969', // Direct Marketing
        },
        settings: {
          payouts: {
            schedule: { interval: 'manual' }, // Hold funds until order delivered
          },
        },
        metadata: {
          togogo_user_id: user.id,
          togogo_store: store.subdomain,
        },
      })

      accountId = account.id
      console.log(`[Connect] Created account ${accountId} for ${user.email}`)

      // Save to database
      await sql`
        UPDATE user_stores
        SET stripe_connect_id = ${accountId},
            stripe_connect_status = 'pending',
            updated_at = NOW()
        WHERE id = ${store.id}
      `
    }

    // Create an Account Session for embedded onboarding
    console.log(`[Connect] Creating account session for ${accountId}`)
    const accountSession = await stripe.accountSessions.create({
      account: accountId,
      components: {
        account_onboarding: { enabled: true },
      },
    })

    return res.json({
      success: true,
      clientSecret: accountSession.client_secret,
      accountId,
      status: store.stripe_connect_status || 'pending',
    })
  } catch (err) {
    console.error('[Connect] Onboard error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
