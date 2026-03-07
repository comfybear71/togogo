import { Router } from 'express'
import Stripe from 'stripe'
import express from 'express'
import { requireAuth, supabase } from '../middleware/auth.js'

const router = Router()

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY)
}

// Create Stripe Connect account for sellers
router.post('/connect/create', requireAuth, async (req, res, next) => {
  try {
    const stripe = getStripe()
    const account = await stripe.accounts.create({
      type: 'express',
      email: req.user.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    })

    // Save to user profile
    await supabase
      .from('users')
      .update({ stripe_account_id: account.id })
      .eq('id', req.user.id)

    // Create onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.FRONTEND_URL}/profile?stripe=refresh`,
      return_url: `${process.env.FRONTEND_URL}/profile?stripe=success`,
      type: 'account_onboarding',
    })

    res.json({ url: accountLink.url })
  } catch (err) {
    next(err)
  }
})

// Create payment intent for checkout
router.post('/payment-intent', requireAuth, async (req, res, next) => {
  try {
    const stripe = getStripe()
    const { items, shippingCost = 0 } = req.body

    // Calculate total from items
    let subtotal = 0
    const lineItems = []

    for (const item of items) {
      const { data: product } = await supabase
        .from('products')
        .select('*, seller:users(stripe_account_id)')
        .eq('id', item.productId)
        .single()

      if (!product) {
        return res.status(400).json({ error: `Product ${item.productId} not found` })
      }

      subtotal += product.price * item.quantity
      lineItems.push({ product, quantity: item.quantity })
    }

    const total = Math.round((subtotal + shippingCost) * 100) // cents
    const platformFee = Math.round(total * 0.08) // 8% platform fee

    const paymentIntent = await stripe.paymentIntents.create({
      amount: total,
      currency: 'aud',
      automatic_payment_methods: { enabled: true },
      metadata: {
        buyer_id: req.user.id,
        items: JSON.stringify(items),
      },
    })

    res.json({
      clientSecret: paymentIntent.client_secret,
      total: total / 100,
      platformFee: platformFee / 100,
    })
  } catch (err) {
    next(err)
  }
})

// Stripe webhook handler
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const stripe = getStripe()
  const sig = req.headers['stripe-signature']

  let event
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const pi = event.data.object
      const items = JSON.parse(pi.metadata.items || '[]')

      // Create orders for each item
      for (const item of items) {
        const { data: product } = await supabase
          .from('products')
          .select('seller_id, price')
          .eq('id', item.productId)
          .single()

        if (product) {
          const totalPrice = product.price * item.quantity
          const platformFee = totalPrice * 0.08
          const sellerPayout = totalPrice - platformFee

          await supabase.from('orders').insert({
            buyer_id: pi.metadata.buyer_id,
            seller_id: product.seller_id,
            product_id: item.productId,
            quantity: item.quantity,
            unit_price: product.price,
            total_price: totalPrice,
            platform_fee: platformFee,
            seller_payout: sellerPayout,
            status: 'paid',
            shipping_address: pi.shipping || {},
          })

          // Decrease stock
          await supabase.rpc('decrement_quantity', {
            p_id: item.productId,
            qty: item.quantity,
          })
        }
      }
      break
    }

    case 'payment_intent.payment_failed':
      console.log('Payment failed:', event.data.object.id)
      break
  }

  res.json({ received: true })
})

// Get Stripe Connect dashboard link
router.get('/connect/dashboard', requireAuth, async (req, res, next) => {
  try {
    const stripe = getStripe()
    const { data: profile } = await supabase
      .from('users')
      .select('stripe_account_id')
      .eq('id', req.user.id)
      .single()

    if (!profile?.stripe_account_id) {
      return res.status(400).json({ error: 'No Stripe account connected' })
    }

    const loginLink = await stripe.accounts.createLoginLink(profile.stripe_account_id)
    res.json({ url: loginLink.url })
  } catch (err) {
    next(err)
  }
})

export default router
