import Stripe from 'stripe'

export default async function handler(req, res) {
  // Allow GET for easy browser testing
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const results = {
    timestamp: new Date().toISOString(),
    checks: {},
  }

  // 1. Check if STRIPE_SECRET_KEY is set
  const hasKey = !!process.env.STRIPE_SECRET_KEY
  results.checks.stripe_secret_key = {
    status: hasKey ? 'pass' : 'fail',
    message: hasKey
      ? 'STRIPE_SECRET_KEY is configured'
      : 'STRIPE_SECRET_KEY is NOT set in environment variables',
  }

  if (!hasKey) {
    results.checks.stripe_api = {
      status: 'skip',
      message: 'Skipped — no secret key',
    }
    results.overall = 'fail'
    return res.status(200).json(results)
  }

  // 2. Test Stripe API connectivity
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    const balance = await stripe.balance.retrieve()
    results.checks.stripe_api = {
      status: 'pass',
      message: `Connected to Stripe. Available balance: ${balance.available.map(b => `${(b.amount / 100).toFixed(2)} ${b.currency.toUpperCase()}`).join(', ') || '0.00'}`,
      mode: process.env.STRIPE_SECRET_KEY.startsWith('sk_live') ? 'LIVE' : 'TEST',
    }
  } catch (err) {
    results.checks.stripe_api = {
      status: 'fail',
      message: `Stripe API error: ${err.message}`,
    }
    results.overall = 'fail'
    return res.status(200).json(results)
  }

  // 3. Test creating a product + price (list existing ones)
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    const products = await stripe.products.list({ limit: 5, active: true })
    const prices = await stripe.prices.list({ limit: 5, active: true })
    results.checks.products = {
      status: 'pass',
      message: `Found ${products.data.length} active products, ${prices.data.length} active prices`,
      products: products.data.map(p => ({ id: p.id, name: p.name })),
      prices: prices.data.map(p => ({
        id: p.id,
        amount: p.unit_amount,
        currency: p.currency,
        recurring: p.recurring ? `${p.recurring.interval}ly` : 'one-time',
      })),
    }
  } catch (err) {
    results.checks.products = {
      status: 'fail',
      message: `Could not list products: ${err.message}`,
    }
  }

  // 4. Test creating a checkout session (without actually needing auth)
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    const baseUrl = process.env.FRONTEND_URL || `https://${req.headers.host}`

    // Create a simple one-time test product
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'aud',
          product_data: { name: 'ToGoGo Payment Test' },
          unit_amount: 100, // $1.00 test
        },
        quantity: 1,
      }],
      success_url: `${baseUrl}/test-payment?result=success`,
      cancel_url: `${baseUrl}/test-payment?result=cancelled`,
      metadata: { type: 'test', created_by: 'payment_test_page' },
    })

    results.checks.checkout_session = {
      status: 'pass',
      message: 'Successfully created test checkout session',
      session_url: session.url,
      session_id: session.id,
    }
  } catch (err) {
    results.checks.checkout_session = {
      status: 'fail',
      message: `Could not create checkout session: ${err.message}`,
    }
  }

  // 5. Check FRONTEND_URL
  results.checks.frontend_url = {
    status: process.env.FRONTEND_URL ? 'pass' : 'warn',
    message: process.env.FRONTEND_URL
      ? `FRONTEND_URL = ${process.env.FRONTEND_URL}`
      : `FRONTEND_URL not set — using host header: https://${req.headers.host}`,
  }

  // 6. Check webhook secret
  results.checks.webhook_secret = {
    status: process.env.STRIPE_WEBHOOK_SECRET ? 'pass' : 'warn',
    message: process.env.STRIPE_WEBHOOK_SECRET
      ? 'STRIPE_WEBHOOK_SECRET is configured'
      : 'STRIPE_WEBHOOK_SECRET is not set — webhooks will run without signature verification',
  }

  // Overall status
  const statuses = Object.values(results.checks).map(c => c.status)
  results.overall = statuses.includes('fail') ? 'fail' : statuses.includes('warn') ? 'warn' : 'pass'

  return res.status(200).json(results)
}
