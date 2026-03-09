// Stripe webhook handler — processes completed payments
// Handles: domain purchases, subscription changes
import { sql } from '../_lib/db.js'
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

    if (endpointSecret) {
      const sig = req.headers['stripe-signature']
      event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret)
    } else {
      // Dev mode — no signature verification
      event = JSON.parse(rawBody.toString())
    }
  } catch (err) {
    console.error('Stripe webhook signature error:', err.message)
    return res.status(400).json({ error: 'Invalid signature' })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const { user_id, domain, type, store_name, subdomain } = session.metadata || {}

        if (type === 'store_subscription' && user_id && subdomain) {
          // Store subscription payment completed — mark store as ready for provisioning
          console.log(`Store subscription paid: ${store_name} (${subdomain}.togogo.me) for user ${user_id}`)

          // Update store status to provisioning (frontend will detect this and start polling)
          try {
            await sql`
              UPDATE user_stores
              SET status = 'paid',
                  provision_data = provision_data::jsonb || ${JSON.stringify({ payment_confirmed: true, paid_at: new Date().toISOString() })}::jsonb,
                  updated_at = NOW()
              WHERE user_id = ${user_id} AND subdomain = ${subdomain}
            `
          } catch {
            // Fallback: try without jsonb concat
            await sql`
              UPDATE user_stores
              SET status = 'paid', updated_at = NOW()
              WHERE user_id = ${user_id} AND subdomain = ${subdomain}
            `
          }
        } else if (type === 'domain_purchase' && domain && user_id) {
          // Update order status
          await sql`
            UPDATE user_orders
            SET status = 'processing', notes = ${'Payment confirmed. Registering domain...'}
            WHERE platform_order_id = ${session.id} AND user_id = ${user_id}
          `

          // Get user email for domain contact info
          const { rows } = await sql`SELECT email, name FROM users WHERE id = ${user_id}`
          const user = rows[0]

          // Register the domain via Namecheap
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

            // Save domain to user profile for easy access
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
          // Check if subscription already exists
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

      case 'customer.subscription.updated': {
        const subscription = event.data.object
        const userId = subscription.metadata?.user_id
        if (userId) {
          const status = subscription.cancel_at_period_end ? 'cancelled' : (subscription.status === 'active' ? 'active' : 'cancelled')
          const plan = subscription.metadata?.plan || 'basic'
          await sql`
            UPDATE subscriptions
            SET status = ${status}, plan = ${plan},
                expires_at = ${subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null}
            WHERE stripe_subscription_id = ${subscription.id}
          `
          console.log(`Subscription updated: ${subscription.id} status=${status}`)
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
          // Check if user has any other active subscriptions
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
          // Renew subscription period
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

      case 'invoice.payment_failed': {
        const invoice = event.data.object
        if (invoice.subscription) {
          await sql`
            UPDATE subscriptions SET status = 'cancelled' WHERE stripe_subscription_id = ${invoice.subscription}
          `
          console.log(`Invoice payment failed for subscription: ${invoice.subscription}`)
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
