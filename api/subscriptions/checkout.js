import { sql } from '../_lib/db.js'
import { requireAuth } from '../_lib/auth.js'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// Store plan product/price ID — created on first use, cached in admin_settings
async function getOrCreatePrice() {
  // Check if we already have a stored price ID
  try {
    const { rows } = await sql`
      SELECT value FROM admin_settings WHERE key = 'stripe_store_price_id'
    `
    if (rows[0]?.value) {
      // Verify it still exists in Stripe
      try {
        const price = await stripe.prices.retrieve(rows[0].value)
        if (price && price.active) return price.id
      } catch {
        // Price deleted or invalid — recreate
      }
    }
  } catch {
    // admin_settings table may not exist yet
  }

  // Create the product + price in Stripe
  const product = await stripe.products.create({
    name: 'ToGoGo Store',
    description: 'Your own .togogo.me storefront with hosting, SSL, auto product sync, and payment processing.',
    metadata: { plan: 'store' },
  })

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: 1999, // $19.99
    currency: 'aud',
    recurring: { interval: 'month' },
    metadata: { plan: 'store' },
  })

  // Cache the price ID
  try {
    await sql`
      INSERT INTO admin_settings (key, value, category, label)
      VALUES ('stripe_store_price_id', ${price.id}, 'stripe', 'Store subscription price ID')
      ON CONFLICT (key) DO UPDATE SET value = ${price.id}, updated_at = NOW()
    `
  } catch {
    // Silent — caching is optional
  }

  return price.id
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const user = await requireAuth(req)
    const { storeName, subdomain } = req.body

    if (!storeName || !subdomain) {
      return res.status(400).json({ error: 'Store name and subdomain are required' })
    }

    // Check if user already has an active subscription
    const { rows: existing } = await sql`
      SELECT id FROM subscriptions
      WHERE user_id = ${user.id} AND status = 'active'
    `
    if (existing.length > 0) {
      // Already subscribed — skip payment, go straight to provisioning
      return res.json({ alreadySubscribed: true })
    }

    const priceId = await getOrCreatePrice()

    // Find or create Stripe customer
    let customerId
    const customers = await stripe.customers.list({ email: user.email, limit: 1 })
    if (customers.data.length > 0) {
      customerId = customers.data[0].id
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name || undefined,
        metadata: { user_id: user.id },
      })
      customerId = customer.id
    }

    const baseUrl = process.env.FRONTEND_URL || `https://${req.headers.host}`

    // [Improvement 7] Build checkout config with optional Stripe Tax for GST
    const checkoutConfig = {
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: {
        user_id: user.id,
        type: 'store_subscription',
        store_name: storeName,
        subdomain: subdomain,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan: 'store',
          store_name: storeName,
          subdomain: subdomain,
        },
      },
      success_url: `${baseUrl}/create-store?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/create-store?payment=cancelled`,
      allow_promotion_codes: true,
    }

    // Enable Stripe Tax for automatic GST calculation if configured
    // To enable: activate Stripe Tax in Dashboard → Settings → Tax
    if (process.env.STRIPE_TAX_ENABLED === 'true') {
      checkoutConfig.automatic_tax = { enabled: true }
      // Collect customer address for tax calculation
      checkoutConfig.customer_update = { address: 'auto' }
    }

    const session = await stripe.checkout.sessions.create(checkoutConfig)

    // Save checkout session ID to existing store record (don't overwrite status if already provisioning/active)
    try {
      const checkoutData = JSON.stringify({ checkout_session_id: session.id, awaiting_payment: true })
      // Only update provision_data, don't reset status — provision API already set it
      const { rowCount } = await sql`
        UPDATE user_stores
        SET provision_data = provision_data::jsonb || ${checkoutData}::jsonb, updated_at = NOW()
        WHERE user_id = ${user.id}
      `
      if (!rowCount) {
        // No existing store record — create one
        await sql`
          INSERT INTO user_stores (user_id, subdomain, full_domain, store_name, status, provision_data)
          VALUES (
            ${user.id}, ${subdomain}, ${subdomain + '.togogo.me'}, ${storeName}, 'pending',
            ${checkoutData}
          )
        `
      }
    } catch {
      // Silent — store record creation is best-effort at this stage
    }

    return res.json({ url: session.url, sessionId: session.id })
  } catch (err) {
    if (err.status === 401) return res.status(401).json({ error: err.message })
    console.error('Checkout error:', err)
    return res.status(500).json({ error: 'Failed to create checkout session' })
  }
}
