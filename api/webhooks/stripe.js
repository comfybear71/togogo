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
        const { user_id, domain, type } = session.metadata || {}

        if (type === 'domain_purchase' && domain && user_id) {
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

      default:
        // Unhandled event type
        break
    }

    res.json({ received: true })
  } catch (err) {
    console.error('Stripe webhook processing error:', err)
    res.status(500).json({ error: 'Webhook processing failed' })
  }
}
