// Rebuild orders from Stripe — pulls all completed checkout sessions and recreates order records
import Stripe from 'stripe'
import { sql, ensureSchema } from '../_lib/db.js'

export default async function handler(req, res) {
  const secret = req.query.secret
  if (secret !== process.env.JWT_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  await ensureSchema()

  try {
    // Get all completed checkout sessions from Stripe
    const sessions = []
    let hasMore = true
    let startingAfter = undefined

    while (hasMore) {
      const params = { limit: 100, status: 'complete' }
      if (startingAfter) params.starting_after = startingAfter
      const batch = await stripe.checkout.sessions.list(params)
      sessions.push(...batch.data)
      hasMore = batch.has_more
      if (batch.data.length > 0) startingAfter = batch.data[batch.data.length - 1].id
    }

    let restored = 0
    let skipped = 0
    let errors = 0

    for (const session of sessions) {
      try {
        const meta = session.metadata || {}
        const orderRef = meta.togogo_order_ref
        if (!orderRef) { skipped++; continue }

        // Check if order already exists
        const { rows: existing } = await sql`SELECT id FROM user_orders WHERE platform_order_id = ${orderRef} LIMIT 1`
        if (existing.length > 0) { skipped++; continue }

        // Get store info
        const storeUserId = meta.togogo_store_user_id
        const subdomain = meta.togogo_subdomain
        if (!storeUserId) { skipped++; continue }

        // Parse items from metadata
        let items = []
        try { items = JSON.parse(meta.togogo_items || '[]') } catch { items = [] }

        // Get shipping address from session
        const shipping = session.shipping_details || session.customer_details || {}
        const addr = shipping.address || {}
        const customerName = shipping.name || session.customer_details?.name || ''
        const customerEmail = session.customer_details?.email || session.customer_email || ''
        const phone = session.customer_details?.phone || ''

        // Get payment intent for refund capability
        const paymentIntent = session.payment_intent

        for (const item of items) {
          const salePrice = parseFloat(item.price || 0) * (item.qty || 1)
          const supplierCost = parseFloat(item.cost || 0) * (item.qty || 1)
          const commissionRate = 0.10
          const profit = Math.round((salePrice - supplierCost) * (1 - commissionRate) * 100) / 100
          const commission = Math.round((salePrice - supplierCost) * commissionRate * 100) / 100

          await sql`
            INSERT INTO user_orders (
              user_id, supplier, supplier_product_id, product_title, product_image,
              supplier_cost, sale_price, profit, commission, commission_rate, quantity,
              platform, platform_order_id,
              customer_name, customer_email, shipping_address,
              status, notes, stripe_payment_intent, stripe_checkout_session,
              created_at
            ) VALUES (
              ${storeUserId}, 'AliExpress', ${item.id || ''}, ${item.title || 'Product'}, ${item.image || ''},
              ${supplierCost}, ${salePrice}, ${profit}, ${commission}, ${commissionRate}, ${item.qty || 1},
              'togogo-store', ${orderRef},
              ${customerName}, ${customerEmail},
              ${JSON.stringify({ ...addr, phone, name: customerName })},
              'processing', ${'Rebuilt from Stripe session ' + session.id},
              ${paymentIntent}, ${session.id},
              ${new Date(session.created * 1000).toISOString()}
            )
          `
          restored++
        }

        // If no items in metadata, create a single order from the session total
        if (items.length === 0) {
          const totalAmount = (session.amount_total || 0) / 100
          await sql`
            INSERT INTO user_orders (
              user_id, supplier, supplier_product_id, product_title,
              supplier_cost, sale_price, profit, commission, commission_rate, quantity,
              platform, platform_order_id,
              customer_name, customer_email, shipping_address,
              status, notes, stripe_payment_intent, stripe_checkout_session,
              created_at
            ) VALUES (
              ${storeUserId}, 'AliExpress', '', 'Order ' || ${orderRef},
              0, ${totalAmount}, ${totalAmount * 0.9}, ${totalAmount * 0.1}, 0.10, 1,
              'togogo-store', ${orderRef},
              ${customerName}, ${customerEmail},
              ${JSON.stringify({ ...addr, phone, name: customerName })},
              'processing', ${'Rebuilt from Stripe (no item details) ' + session.id},
              ${paymentIntent}, ${session.id},
              ${new Date(session.created * 1000).toISOString()}
            )
          `
          restored++
        }
      } catch (err) {
        console.error(`[Rebuild] Error processing session:`, err.message)
        errors++
      }
    }

    return res.json({
      success: true,
      stripeSessions: sessions.length,
      restored,
      skipped,
      errors,
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
