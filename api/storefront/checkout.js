// Storefront checkout — creates Stripe Checkout Session with Connect payment split
// Customer pays → Platform takes commission → Store owner gets the rest
import Stripe from 'stripe'
import { sql, ensureSchema } from '../_lib/db.js'
import { getCommissionRate } from '../_lib/commission.js'

export default async function handler(req, res) {
  // CORS
  const origin = req.headers.origin || ''
  const allowedOrigin = origin.endsWith('.togogo.me') || origin.includes('togogo.vercel.app') || origin.includes('localhost')
    ? origin : 'https://togogo.me'
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin)
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  await ensureSchema()

  // Clean up stale pending_payment orders (older than 1 hour)
  try {
    await sql`UPDATE user_orders SET status = 'cancelled', notes = 'Auto-cancelled: payment not completed within 1 hour' WHERE status = 'pending_payment' AND created_at < NOW() - INTERVAL '1 hour'`
  } catch { /* non-critical */ }

  try {
    const { subdomain, items, customer } = req.body

    if (!subdomain || !items?.length || !customer?.name || !customer?.email) {
      return res.status(400).json({ error: 'subdomain, items, and customer (name, email) required' })
    }

    // Get store + connect account
    const { rows: stores } = await sql`
      SELECT s.id, s.user_id, s.store_name, s.subdomain, s.stripe_connect_id, s.stripe_connect_status
      FROM user_stores s
      WHERE s.subdomain = ${subdomain} AND s.status = 'active'
    `
    if (!stores[0]) return res.status(404).json({ error: 'Store not found' })

    const store = stores[0]

    // Build line items from cart
    const lineItems = []
    const orderItems = []
    const commissionRate = await getCommissionRate()
    let totalSupplierCost = 0

    for (const item of items) {
      const { rows: products } = await sql`
        SELECT id, title, image, supplier, supplier_cost, sale_price, supplier_product_id
        FROM user_products
        WHERE id = ${item.productId} AND is_active = true
      `
      if (!products[0]) continue

      const product = products[0]
      const qty = item.quantity || 1
      const unitPrice = Math.round(parseFloat(product.sale_price) * 100) // cents

      lineItems.push({
        price_data: {
          currency: 'aud',
          product_data: {
            name: product.title.slice(0, 200),
            ...(product.image ? { images: [product.image] } : {}),
          },
          unit_amount: unitPrice,
        },
        quantity: qty,
      })

      orderItems.push({
        productId: product.id,
        title: product.title,
        image: product.image,
        supplier: product.supplier,
        supplierProductId: product.supplier_product_id,
        supplierCost: parseFloat(product.supplier_cost),
        salePrice: parseFloat(product.sale_price),
        quantity: qty,
      })

      totalSupplierCost += parseFloat(product.supplier_cost) * qty
    }

    if (lineItems.length === 0) {
      return res.status(400).json({ error: 'No valid products found' })
    }

    // No separate shipping fee — shipping + tax included in product price (Temu model)
    const totalAmount = lineItems.reduce((s, li) => s + li.price_data.unit_amount * li.quantity, 0)

    // Shipping fee — configurable from admin settings (default A$6, set to 0 to remove)
    let shippingFeeAUD = 6.00
    try {
      const { rows: feeRows } = await sql`SELECT value FROM admin_settings WHERE key = 'shipping_fee_aud'`
      if (feeRows[0]) shippingFeeAUD = parseFloat(feeRows[0].value) || 0
    } catch { /* use default */ }
    const shippingFeeCents = Math.round(shippingFeeAUD * 100)
    if (shippingFeeCents > 0) {
      lineItems.push({
        price_data: {
          currency: 'aud',
          product_data: { name: 'Shipping' },
          unit_amount: shippingFeeCents,
        },
        quantity: 1,
      })
    }
    const totalWithShipping = totalAmount + shippingFeeCents

    const totalSupplierCostCents = Math.round(totalSupplierCost * 100)
    // Commission on PROFIT (sale minus cost), not on total sale
    const profitCents = totalAmount - totalSupplierCostCents
    // Platform gets: 30% of profit + ALL of the shipping fee
    const applicationFee = Math.round(Math.max(profitCents, 0) * commissionRate) + shippingFeeCents

    const orderRef = `TG-${Date.now().toString(36).toUpperCase()}`

    // Build Stripe Checkout session options
    const sessionParams = {
      mode: 'payment',
      line_items: lineItems,
      customer_email: customer.email,
      phone_number_collection: { enabled: true },
      shipping_address_collection: {
        allowed_countries: ['AU', 'US', 'GB', 'NZ', 'CA'],
      },
      metadata: {
        togogo_order_ref: orderRef,
        togogo_subdomain: subdomain,
        togogo_store_user_id: store.user_id,
        togogo_items: JSON.stringify(orderItems.map(i => ({
          id: i.productId,
          qty: i.quantity,
          cost: i.supplierCost,
          price: i.salePrice,
        }))).slice(0, 490), // Stripe 500 char limit
      },
      success_url: `https://${subdomain}.togogo.me?checkout=success&ref=${orderRef}`,
      cancel_url: `https://${subdomain}.togogo.me?checkout=cancelled`,
    }

    // If store has Stripe Connect, use destination charges (money goes to store owner)
    if (store.stripe_connect_id && store.stripe_connect_status === 'active') {
      sessionParams.payment_intent_data = {
        application_fee_amount: applicationFee,
        transfer_data: {
          destination: store.stripe_connect_id,
        },
      }
      console.log(`[Checkout] Connect payment: ${totalAmount}c -> ${store.stripe_connect_id} (fee: ${applicationFee}c)`)
    } else {
      // No Connect account — all money goes to platform
      console.log(`[Checkout] Direct payment: ${totalAmount}c (no Connect account for ${subdomain})`)
    }

    const session = await stripe.checkout.sessions.create(sessionParams)

    // Save pending order to database
    for (const item of orderItems) {
      const qty = item.quantity
      const salePrice = item.salePrice * qty
      const supplierCost = item.supplierCost * qty
      const commission = Math.round((salePrice - supplierCost) * commissionRate * 100) / 100

      try {
        await sql`
          INSERT INTO user_orders (
            user_id, supplier, supplier_product_id, product_title, product_image,
            supplier_cost, sale_price, profit, commission, commission_rate, quantity,
            platform, platform_order_id,
            customer_name, customer_email, shipping_address,
            status, notes, stripe_checkout_session
          ) VALUES (
            ${store.user_id}, ${item.supplier || 'AliExpress'}, ${item.supplierProductId || ''}, ${item.title}, ${item.image},
            ${supplierCost}, ${salePrice},
            ${Math.round((salePrice - supplierCost - commission) * 100) / 100},
            ${commission}, ${commissionRate}, ${qty},
            'togogo-store', ${orderRef},
            ${customer.name}, ${customer.email},
            ${JSON.stringify({ ...customer.address, phone: customer.phone || '' })},
            'pending_payment',
            ${`Stripe session: ${session.id}`},
            ${session.id}
          )
        `
      } catch (err) {
        console.error(`[Checkout] Failed to save order item:`, err.message)
      }
    }

    console.log(`[Checkout] Session ${session.id} created for ${orderRef} (${lineItems.length} items, $${(totalAmount / 100).toFixed(2)} AUD)`)

    return res.json({
      success: true,
      sessionId: session.id,
      url: session.url,
      orderRef,
    })
  } catch (err) {
    console.error('[Checkout] Error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
