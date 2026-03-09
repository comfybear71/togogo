import { sql } from '../_lib/db.js'
import { requireAuth } from '../_lib/auth.js'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// Domain pricing must match search.js
const DOMAIN_PRICING = {
  '.com': 18.99, '.store': 4.99, '.shop': 4.99, '.co': 14.99,
  '.net': 16.99, '.io': 49.99, '.com.au': 14.99, '.online': 4.99,
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const user = await requireAuth(req)
    const { domain } = req.body

    if (!domain || !domain.includes('.')) {
      return res.status(400).json({ error: 'Valid domain name is required' })
    }

    // Extract extension
    const dotIndex = domain.indexOf('.')
    const extension = domain.slice(dotIndex)
    const price = DOMAIN_PRICING[extension]

    if (!price) {
      return res.status(400).json({ error: `Extension ${extension} is not supported` })
    }

    // Create Stripe checkout session for domain purchase
    const checkoutConfig = {
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'aud',
          product_data: {
            name: `Domain: ${domain}`,
            description: `1 year domain registration for ${domain}. Includes free DNS management.`,
            metadata: { domain, extension, type: 'domain_registration' },
          },
          unit_amount: Math.round(price * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL || 'https://togogo.me'}/setup?domain_purchased=${encodeURIComponent(domain)}`,
      cancel_url: `${process.env.FRONTEND_URL || 'https://togogo.me'}/setup?domain_cancelled=true`,
      metadata: {
        user_id: user.id,
        domain,
        type: 'domain_purchase',
      },
    }

    // Enable Stripe Tax for automatic GST calculation if configured
    if (process.env.STRIPE_TAX_ENABLED === 'true') {
      checkoutConfig.automatic_tax = { enabled: true }
    }

    const session = await stripe.checkout.sessions.create(checkoutConfig)

    // Record the pending purchase
    await sql`
      INSERT INTO user_orders (
        user_id, supplier, product_title, product_image,
        supplier_cost, sale_price, profit,
        platform, platform_order_id,
        status, notes
      ) VALUES (
        ${user.id},
        'togogo-domains',
        ${`Domain: ${domain}`},
        NULL,
        ${price * 0.6},
        ${price},
        ${price * 0.4},
        'togogo',
        ${session.id},
        'pending',
        ${`Domain registration for ${domain}. Stripe session: ${session.id}`}
      )
    `

    res.json({
      success: true,
      checkout_url: session.url,
      session_id: session.id,
      domain,
      price,
      currency: 'AUD',
    })
  } catch (err) {
    if (err.status === 401) return res.status(401).json({ error: err.message })
    console.error('Domain purchase error:', err)
    res.status(500).json({ error: 'Failed to create purchase' })
  }
}
