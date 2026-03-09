// [Improvement 6] Subscription state sync — reconciles DB with Stripe
// Call this to fix any missed webhooks or state drift
import { sql } from '../_lib/db.js'
import { requireAuth } from '../_lib/auth.js'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const user = await requireAuth(req)

    // Get all subscriptions for this user from our DB
    const { rows: dbSubs } = await sql`
      SELECT id, stripe_subscription_id, status, plan, expires_at
      FROM subscriptions
      WHERE user_id = ${user.id} AND stripe_subscription_id IS NOT NULL
    `

    if (dbSubs.length === 0) {
      return res.json({ synced: 0, message: 'No subscriptions to sync' })
    }

    let synced = 0
    const changes = []

    for (const dbSub of dbSubs) {
      try {
        const stripeSub = await stripe.subscriptions.retrieve(dbSub.stripe_subscription_id)

        // Map Stripe status to our status
        let correctStatus
        if (stripeSub.cancel_at_period_end) {
          correctStatus = 'cancelled'
        } else if (stripeSub.status === 'active' || stripeSub.status === 'trialing') {
          correctStatus = 'active'
        } else if (stripeSub.status === 'past_due') {
          correctStatus = 'past_due'
        } else if (stripeSub.status === 'canceled' || stripeSub.status === 'unpaid') {
          correctStatus = 'expired'
        } else {
          correctStatus = 'active'
        }

        const correctExpiresAt = stripeSub.current_period_end
          ? new Date(stripeSub.current_period_end * 1000).toISOString()
          : null
        const correctPrice = (stripeSub.items?.data?.[0]?.price?.unit_amount || 0) / 100

        // Check if anything is out of sync
        if (dbSub.status !== correctStatus || dbSub.expires_at?.toISOString() !== correctExpiresAt) {
          await sql`
            UPDATE subscriptions
            SET status = ${correctStatus}, expires_at = ${correctExpiresAt}, price_per_month = ${correctPrice}
            WHERE id = ${dbSub.id}
          `
          changes.push({
            subscription_id: dbSub.stripe_subscription_id,
            old_status: dbSub.status,
            new_status: correctStatus,
          })
          synced++
        }
      } catch (err) {
        // Subscription no longer exists in Stripe — mark as expired
        if (err.code === 'resource_missing') {
          await sql`
            UPDATE subscriptions SET status = 'expired' WHERE id = ${dbSub.id}
          `
          changes.push({
            subscription_id: dbSub.stripe_subscription_id,
            old_status: dbSub.status,
            new_status: 'expired (not found in Stripe)',
          })
          synced++
        }
      }
    }

    // Update user role based on synced state
    const { rows: activeSubs } = await sql`
      SELECT COUNT(*) as count FROM subscriptions WHERE user_id = ${user.id} AND status = 'active'
    `
    const hasActive = parseInt(activeSubs[0]?.count) > 0
    if (hasActive) {
      await sql`
        UPDATE users SET role = CASE WHEN role = 'buyer' THEN 'subscriber' ELSE role END, updated_at = NOW()
        WHERE id = ${user.id}
      `
    } else {
      await sql`
        UPDATE users SET role = CASE WHEN role = 'subscriber' THEN 'buyer' ELSE role END, updated_at = NOW()
        WHERE id = ${user.id}
      `
    }

    return res.json({ synced, changes, total: dbSubs.length })
  } catch (err) {
    if (err.status === 401) return res.status(401).json({ error: err.message })
    console.error('Subscription sync error:', err)
    return res.status(500).json({ error: 'Sync failed' })
  }
}
