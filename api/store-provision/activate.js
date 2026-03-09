// Activate store after payment — ensures store, subscription, and user role are all correct
// Called by frontend after returning from successful Stripe payment
// Also serves as a recovery mechanism when webhooks fail or sessionStorage is lost
import { sql, ensureSchema } from '../_lib/db.js'
import { requireAuth } from '../_lib/auth.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    await ensureSchema()
    const user = await requireAuth(req)

    // 1. Activate the user's store
    const { rowCount } = await sql`
      UPDATE user_stores
      SET status = 'active', updated_at = NOW()
      WHERE user_id = ${user.id} AND status != 'deleted'
    `

    if (!rowCount) {
      return res.status(404).json({ error: 'No store found' })
    }

    // 2. Get the activated store info
    const { rows: storeRows } = await sql`
      SELECT subdomain, full_domain, store_name FROM user_stores WHERE user_id = ${user.id}
    `

    // 3. Ensure the user has an active subscription (webhook may not have fired)
    const { rows: existingSubs } = await sql`
      SELECT id FROM subscriptions
      WHERE user_id = ${user.id} AND status IN ('active', 'past_due')
    `

    if (existingSubs.length === 0) {
      // No active subscription — create one as a safety net
      // The webhook should have done this, but if STRIPE_WEBHOOK_SECRET isn't configured
      // or the webhook failed, we need to ensure the subscription exists
      await sql`
        INSERT INTO subscriptions (user_id, plan, status, price_per_month, started_at, expires_at)
        VALUES (${user.id}, 'premium', 'active', 19.99, NOW(), NOW() + INTERVAL '1 month')
      `
      console.log(`Activate: created fallback subscription for user ${user.id}`)
    }

    // 4. Upgrade user role from 'buyer' to 'subscriber' if needed
    await sql`
      UPDATE users
      SET role = CASE
        WHEN role = 'buyer' THEN 'subscriber'
        WHEN role = 'both' THEN 'both'
        ELSE role
      END,
      updated_at = NOW()
      WHERE id = ${user.id} AND role = 'buyer'
    `

    // 5. Ensure platform connection record exists for the storefront
    const store = storeRows[0]
    if (store) {
      try {
        await sql`
          INSERT INTO platform_connections (user_id, platform, status, shop_name, shop_url, connected_at)
          VALUES (${user.id}, 'togogo-store', 'active', ${store.store_name}, ${'https://' + store.full_domain}, NOW())
          ON CONFLICT (user_id, platform) DO UPDATE
          SET status = 'active', shop_name = ${store.store_name}, shop_url = ${'https://' + store.full_domain},
              connected_at = NOW(), updated_at = NOW()
        `
      } catch {
        // Silent — connection record is optional
      }
    }

    return res.json({
      success: true,
      store: store || null,
    })
  } catch (err) {
    if (err.status === 401) return res.status(401).json({ error: err.message })
    console.error('Store activation error:', err)
    return res.status(500).json({ error: 'Failed to activate store' })
  }
}
