// Stripe webhook handler — processes completed payments
// Handles: domain purchases, subscription changes, invoice events
import { sql, ensureSchema } from '../_lib/db.js'
import Stripe from 'stripe'
import { registerDomain } from '../domains/register.js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

export const config = {
  api: { bodyParser: false }, // Stripe needs raw body for signature verification
}

async function getRawBody(req) {
  const chunks = []
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  return Buffer.concat(chunks)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  let event

  try {
    const rawBody = await getRawBody(req)

    // [Improvement 5] Enforce signature verification in production
    if (endpointSecret) {
      const sig = req.headers['stripe-signature']
      event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret)
    } else if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
      console.error('STRIPE_WEBHOOK_SECRET is not configured in production — rejecting webhook')
      return res.status(500).json({ error: 'Webhook secret not configured' })
    } else {
      // Dev mode only — no signature verification
      console.warn('⚠ Dev mode: Stripe webhook signature verification bypassed')
      event = JSON.parse(rawBody.toString())
    }
  } catch (err) {
    console.error('Stripe webhook signature error:', err.message)
    return res.status(400).json({ error: 'Invalid signature' })
  }

  try {
    await ensureSchema()

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const { user_id, domain, type, store_name, subdomain } = session.metadata || {}

        if (type === 'store_subscription' && user_id && subdomain) {
          // Store subscription payment completed — activate the store
          console.log(`Store subscription paid: ${store_name} (${subdomain}.togogo.me) for user ${user_id}`)

          const fullDomain = `${subdomain}.togogo.me`
          const paymentData = JSON.stringify({ payment_confirmed: true, paid_at: new Date().toISOString(), checkout_session_id: session.id })

          // Ensure store record exists and is active (CREATE if missing, UPDATE if exists)
          try {
            await sql`
              INSERT INTO user_stores (user_id, subdomain, full_domain, store_name, status, provision_data)
              VALUES (${user_id}, ${subdomain}, ${fullDomain}, ${store_name || subdomain + "'s Store"}, 'active', ${paymentData})
              ON CONFLICT (user_id) DO UPDATE
              SET status = 'active', subdomain = ${subdomain}, full_domain = ${fullDomain},
                  store_name = COALESCE(NULLIF(${store_name || ''}, ''), user_stores.store_name),
                  updated_at = NOW()
            `
          } catch (storeErr) {
            console.error('Store activation failed, retrying simple update:', storeErr.message)
            await sql`
              UPDATE user_stores SET status = 'active', updated_at = NOW()
              WHERE user_id = ${user_id} AND subdomain = ${subdomain}
            `.catch(e => console.error('Store activation retry also failed:', e.message))
          }

          // Fallback: create subscription record if customer.subscription.created webhook doesn't fire
          try {
            const stripeSubId = session.subscription
            const priceAmount = (session.amount_total || 1999) / 100
            if (stripeSubId) {
              const { rows: existingSub } = await sql`
                SELECT id FROM subscriptions WHERE stripe_subscription_id = ${stripeSubId}
              `
              if (existingSub.length === 0) {
                await sql`
                  INSERT INTO subscriptions (user_id, plan, status, stripe_subscription_id, price_per_month, started_at, expires_at)
                  VALUES (${user_id}, 'premium', 'active', ${stripeSubId}, ${priceAmount}, NOW(), NOW() + INTERVAL '1 month')
                `
                console.log(`Subscription fallback created for user ${user_id}`)
              }
            } else {
              // No Stripe subscription ID — create a record anyway so we have a trail
              const { rows: anySub } = await sql`
                SELECT id FROM subscriptions WHERE user_id = ${user_id} AND status IN ('active', 'past_due')
              `
              if (anySub.length === 0) {
                await sql`
                  INSERT INTO subscriptions (user_id, plan, status, price_per_month, started_at, expires_at)
                  VALUES (${user_id}, 'premium', 'active', ${(session.amount_total || 1999) / 100}, NOW(), NOW() + INTERVAL '1 month')
                `
                console.log(`Subscription record created (no stripe sub ID) for user ${user_id}`)
              }
            }
          } catch (subErr) {
            console.error('Subscription fallback creation failed:', subErr.message)
          }

          // Upgrade user role
          await sql`
            UPDATE users SET role = CASE WHEN role = 'buyer' THEN 'subscriber' WHEN role = 'both' THEN 'both' ELSE role END, updated_at = NOW()
            WHERE id = ${user_id}
          `.catch(e => console.error('User role upgrade failed:', e.message))

        } else if (type === 'domain_purchase' && domain && user_id) {
          await sql`
            UPDATE user_orders
            SET status = 'processing', notes = ${'Payment confirmed. Registering domain...'}
            WHERE platform_order_id = ${session.id} AND user_id = ${user_id}
          `

          const { rows } = await sql`SELECT email, name FROM users WHERE id = ${user_id}`
          const user = rows[0]

          try {
            const result = await registerDomain(domain, {
              email: user?.email,
              firstName: user?.name?.split(' ')[0] || 'ToGoGo',
              lastName: user?.name?.split(' ').slice(1).join(' ') || 'Customer',
            })

            await sql`
              UPDATE user_orders
              SET status = 'delivered',
                  notes = ${'Domain registered successfully. WhoisGuard enabled.'},
                  updated_at = NOW()
              WHERE platform_order_id = ${session.id} AND user_id = ${user_id}
            `

            await sql`
              INSERT INTO user_domains (user_id, domain, status, registered_at, expires_at)
              VALUES (${user_id}, ${domain}, 'active', NOW(), NOW() + INTERVAL '1 year')
              ON CONFLICT (user_id, domain) DO UPDATE SET status = 'active', updated_at = NOW()
            `

            console.log(`Domain registered: ${domain} for user ${user_id}`)
          } catch (regErr) {
            console.error('Domain registration failed:', regErr.message)
            await sql`
              UPDATE user_orders
              SET status = 'pending',
                  notes = ${'Payment received but domain registration failed: ' + regErr.message + '. Our team will register it manually.'},
                  updated_at = NOW()
              WHERE platform_order_id = ${session.id} AND user_id = ${user_id}
            `
          }
        }
        break
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object
        const userId = subscription.metadata?.user_id
        if (userId) {
          const plan = subscription.metadata?.plan || 'basic'
          const priceAmount = (subscription.items?.data?.[0]?.price?.unit_amount || 0) / 100
          const expiresAt = subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null
          const { rows: existing } = await sql`
            SELECT id FROM subscriptions WHERE stripe_subscription_id = ${subscription.id}
          `
          if (existing.length > 0) {
            await sql`
              UPDATE subscriptions SET status = 'active', plan = ${plan}, expires_at = ${expiresAt}
              WHERE stripe_subscription_id = ${subscription.id}
            `
          } else {
            await sql`
              INSERT INTO subscriptions (user_id, plan, status, stripe_subscription_id, price_per_month, started_at, expires_at)
              VALUES (${userId}, ${plan}, 'active', ${subscription.id}, ${priceAmount}, NOW(), ${expiresAt})
            `
          }
          // Upgrade user role
          await sql`
            UPDATE users SET role = CASE WHEN role = 'buyer' THEN 'subscriber' WHEN role = 'both' THEN 'both' ELSE role END, updated_at = NOW()
            WHERE id = ${userId}
          `
          console.log(`Subscription created: ${subscription.id} for user ${userId} (${plan})`)
        }
        break
      }

      // [Improvement 4] Handle proration and richer status mapping on plan changes
      case 'customer.subscription.updated': {
        const subscription = event.data.object
        const userId = subscription.metadata?.user_id
        if (userId) {
          // Map Stripe subscription status to our DB status
          let status
          if (subscription.cancel_at_period_end) {
            status = 'cancelled'
          } else if (subscription.status === 'active' || subscription.status === 'trialing') {
            status = 'active'
          } else if (subscription.status === 'past_due') {
            status = 'past_due'
          } else if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
            status = 'expired'
          } else {
            status = 'active'
          }

          const plan = subscription.metadata?.plan || 'basic'
          const priceAmount = (subscription.items?.data?.[0]?.price?.unit_amount || 0) / 100
          const expiresAt = subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null

          await sql`
            UPDATE subscriptions
            SET status = ${status}, plan = ${plan}, price_per_month = ${priceAmount},
                expires_at = ${expiresAt}
            WHERE stripe_subscription_id = ${subscription.id}
          `
          console.log(`Subscription updated: ${subscription.id} status=${status} plan=${plan} price=${priceAmount}`)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        const userId = subscription.metadata?.user_id
        await sql`
          UPDATE subscriptions SET status = 'expired' WHERE stripe_subscription_id = ${subscription.id}
        `
        if (userId) {
          const { rows } = await sql`
            SELECT COUNT(*) as count FROM subscriptions WHERE user_id = ${userId} AND status = 'active'
          `
          if (parseInt(rows[0]?.count) === 0) {
            await sql`
              UPDATE users SET role = CASE WHEN role = 'subscriber' THEN 'buyer' WHEN role = 'both' THEN 'buyer' ELSE role END, updated_at = NOW()
              WHERE id = ${userId}
            `
          }
        }
        console.log(`Subscription deleted: ${subscription.id}`)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object
        if (invoice.subscription) {
          // Renew subscription period — also clears any past_due status
          await sql`
            UPDATE subscriptions
            SET status = 'active',
                expires_at = ${invoice.lines?.data?.[0]?.period?.end ? new Date(invoice.lines.data[0].period.end * 1000).toISOString() : null}
            WHERE stripe_subscription_id = ${invoice.subscription}
          `
          console.log(`Invoice paid for subscription: ${invoice.subscription}`)
        }
        break
      }

      // [Improvement 1] Use 'past_due' instead of immediate cancellation on first failure
      case 'invoice.payment_failed': {
        const invoice = event.data.object
        if (invoice.subscription) {
          const attemptCount = invoice.attempt_count || 1

          if (attemptCount >= 4) {
            // All retries exhausted — cancel the subscription
            await sql`
              UPDATE subscriptions SET status = 'cancelled' WHERE stripe_subscription_id = ${invoice.subscription}
            `
            console.log(`Invoice payment failed (final attempt ${attemptCount}) — subscription cancelled: ${invoice.subscription}`)
          } else {
            // Mark as past_due — Stripe will retry automatically
            await sql`
              UPDATE subscriptions SET status = 'past_due' WHERE stripe_subscription_id = ${invoice.subscription}
            `
            console.log(`Invoice payment failed (attempt ${attemptCount}/4) — subscription past_due: ${invoice.subscription}`)
          }
        }
        break
      }

      // Dispute handling — customer filed a chargeback
      case 'charge.dispute.created': {
        const dispute = event.data.object
        const chargeId = dispute.charge
        const amount = (dispute.amount || 0) / 100
        const reason = dispute.reason || 'unknown'

        // Find the subscription or order linked to this charge
        try {
          await sql`
            INSERT INTO disputes (stripe_dispute_id, stripe_charge_id, amount, currency, reason, status, evidence_due_by)
            VALUES (${dispute.id}, ${chargeId}, ${amount}, ${dispute.currency || 'aud'}, ${reason}, 'open',
                    ${dispute.evidence_details?.due_by ? new Date(dispute.evidence_details.due_by * 1000).toISOString() : null})
            ON CONFLICT (stripe_dispute_id) DO UPDATE SET status = 'open', updated_at = NOW()
          `
        } catch (err) {
          console.error('Failed to record dispute:', err.message)
        }
        console.log(`Dispute created: ${dispute.id} amount=${amount} reason=${reason}`)
        break
      }

      case 'charge.dispute.updated': {
        const dispute = event.data.object
        const status = dispute.status === 'won' ? 'won' : dispute.status === 'lost' ? 'lost' : 'under_review'
        try {
          await sql`
            UPDATE disputes SET status = ${status}, updated_at = NOW()
            WHERE stripe_dispute_id = ${dispute.id}
          `
        } catch (err) {
          console.error('Failed to update dispute:', err.message)
        }
        console.log(`Dispute updated: ${dispute.id} status=${status}`)
        break
      }

      case 'charge.dispute.closed': {
        const dispute = event.data.object
        const status = dispute.status === 'won' ? 'won' : 'lost'
        try {
          await sql`
            UPDATE disputes SET status = ${status}, resolved_at = NOW(), updated_at = NOW()
            WHERE stripe_dispute_id = ${dispute.id}
          `
        } catch (err) {
          console.error('Failed to close dispute:', err.message)
        }
        console.log(`Dispute closed: ${dispute.id} status=${status}`)
        break
      }

      // Refund handling
      case 'charge.refunded': {
        const charge = event.data.object
        const refundAmount = (charge.amount_refunded || 0) / 100
        try {
          await sql`
            INSERT INTO refunds (stripe_charge_id, amount, currency, status)
            VALUES (${charge.id}, ${refundAmount}, ${charge.currency || 'aud'}, 'completed')
            ON CONFLICT (stripe_charge_id) DO UPDATE SET amount = ${refundAmount}, status = 'completed', updated_at = NOW()
          `
        } catch (err) {
          console.error('Failed to record refund:', err.message)
        }
        console.log(`Charge refunded: ${charge.id} amount=${refundAmount}`)
        break
      }

      // Stripe Connect — account status changed
      case 'account.updated': {
        const account = event.data.object
        const status = account.charges_enabled && account.payouts_enabled
          ? 'active'
          : account.details_submitted
            ? 'pending_verification'
            : 'onboarding_incomplete'

        try {
          await sql`
            UPDATE user_stores
            SET stripe_connect_status = ${status}, updated_at = NOW()
            WHERE stripe_connect_id = ${account.id}
          `
          console.log(`Connect account ${account.id} status updated to: ${status}`)
        } catch (err) {
          console.error('Failed to update connect status:', err.message)
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
        break
    }

    res.json({ received: true })
  } catch (err) {
    console.error('Stripe webhook processing error:', err)
    res.status(500).json({ error: 'Webhook processing failed' })
  }
}
