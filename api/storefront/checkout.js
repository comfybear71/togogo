// Storefront checkout — creates Stripe Checkout Session with Connect payment split
// Customer pays → Platform takes commission → Store owner gets the rest
import Stripe from 'stripe'
import { sql } from '../_lib/db.js'
import { getCommissionRate } from '../_lib/commission.js'
import { verifyProduct } from '../_lib/suppliers.js'

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
        SELECT id, title, image, supplier, supplier_cost, sale_price, shipping_cost, supplier_product_id,
               variants, min_variant_price_usd
        FROM user_products
        WHERE id = ${item.productId} AND is_active = true
      `
      if (!products[0]) continue

      const product = products[0]
      const qty = item.quantity || 1

      // Resolve the chosen variant from the stored variants JSONB. If the
      // customer didn't pick one, we default to the cheapest variant —
      // same row AE would resolve for us via auto-resolve (better that
      // this code owns the choice explicitly).
      const allVariants = Array.isArray(product.variants) ? product.variants
        : (typeof product.variants === 'string'
            ? (() => { try { return JSON.parse(product.variants) } catch { return [] } })()
            : [])
      let chosenVariant = null
      if (item.skuId) {
        chosenVariant = allVariants.find(v => String(v.skuId) === String(item.skuId)) || null
      }
      if (!chosenVariant && item.skuAttr) {
        chosenVariant = allVariants.find(v => v.skuAttr === item.skuAttr) || null
      }
      if (!chosenVariant && allVariants.length > 0) {
        // Fallback: cheapest variant
        chosenVariant = allVariants.reduce((min, v) => (v.priceUsd || 0) < (min.priceUsd || 0) ? v : min, allVariants[0])
      }

      // SAFETY NET: Verify product on AliExpress before taking payment
      const aeId = (product.supplier_product_id || '').replace('ae_', '')
      if (aeId && !aeId.includes('-')) {
        try {
          const check = await verifyProduct(aeId, '', qty, parseFloat(product.supplier_cost || 0))
          if (!check.available) {
            console.error(`[Checkout] Product ${aeId} failed verification: ${check.reason} — ${check.message}`)
            // Auto-deactivate so other customers don't see it
            if (['product_not_found', 'out_of_stock'].includes(check.reason)) {
              await sql`UPDATE user_products SET is_active = false, updated_at = NOW() WHERE supplier_product_id = ${aeId}`.catch(() => {})
            }
            // Log (don't act on) shipping failures with the customer's address
            // so we can see patterns over time. NEVER auto-deactivate on no_shipping.
            if (check.reason === 'no_shipping') {
              await sql`
                INSERT INTO shipping_failures (product_id, supplier_product_id, country, state, postcode, reason, failure_source)
                VALUES (
                  ${product.id},
                  ${aeId},
                  ${customer?.address?.country || null},
                  ${customer?.address?.state || null},
                  ${customer?.address?.zip || null},
                  ${check.reason},
                  ${'checkout'}
                )
              `.catch(() => {})
            }
            return res.status(400).json({ error: check.message, reason: check.reason })
          }
        } catch (verifyErr) {
          // Verification failed (API timeout etc) — allow checkout rather than block
          console.log(`[Checkout] Verification timeout for ${aeId}, allowing checkout: ${verifyErr.message}`)
        }
      }

      // Per-variant break-even pricing (USD). Same formula as pricing.js:
      //   supplier_cost_usd = variant.priceUsd + shipping + variant.priceUsd × 0.14
      const TAX_RATE = 0.14
      const shippingUsd = parseFloat(product.shipping_cost) || 0
      const variantPriceUsd = chosenVariant?.priceUsd > 0
        ? chosenVariant.priceUsd
        : (parseFloat(product.min_variant_price_usd) || parseFloat(product.sale_price) || 0)
      const variantBreakEvenUsd = Math.round(
        (variantPriceUsd + shippingUsd + variantPriceUsd * TAX_RATE) * 100
      ) / 100
      // Defensive floor — if we have no usable number, fall back to stored
      // sale_price so we don't charge $0. This shouldn't happen once the
      // rebuild cron has fully run.
      const chargePriceUsd = variantBreakEvenUsd > 0 ? variantBreakEvenUsd : parseFloat(product.sale_price) || 0
      const unitPrice = Math.round(chargePriceUsd * 100)

      const variantTitle = chosenVariant?.label
        ? `${product.title.slice(0, 160)} — ${chosenVariant.label.slice(0, 40)}`
        : product.title.slice(0, 200)
      const variantImage = chosenVariant?.colorImage || chosenVariant?.image || product.image

      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: variantTitle,
            ...(variantImage ? { images: [variantImage] } : {}),
          },
          unit_amount: unitPrice,
        },
        quantity: qty,
      })

      orderItems.push({
        productId: product.id,
        title: product.title,
        image: variantImage,
        supplier: product.supplier,
        supplierProductId: product.supplier_product_id,
        // Variant identity flows into the DB + Stripe metadata + webhook
        skuId: chosenVariant?.skuId || null,
        skuAttr: chosenVariant?.skuAttr || null,
        variantLabel: chosenVariant?.label || '',
        variantPriceUsd: variantPriceUsd,
        supplierCost: chargePriceUsd,   // break-even for the chosen variant
        salePrice: chargePriceUsd,       // we charge exactly break-even (no markup yet)
        shippingCost: shippingUsd,
        quantity: qty,
      })

      totalSupplierCost += parseFloat(product.supplier_cost) * qty
    }

    if (lineItems.length === 0) {
      return res.status(400).json({ error: 'No valid products found' })
    }

    // No separate shipping fee — shipping + tax included in product price (Temu model)
    const totalAmount = lineItems.reduce((s, li) => s + li.price_data.unit_amount * li.quantity, 0)

    // Shipping is already included in sale_price via cron's markup formula
    // (wholesale = product_cost + shipping, sale = wholesale × markup).
    // Admin platform flat fee is additive on top if configured (handling fee).
    let platformShippingAUD = 0
    try {
      const { rows: feeRows } = await sql`SELECT value FROM admin_settings WHERE key = 'shipping_fee_aud'`
      if (feeRows[0]) platformShippingAUD = parseFloat(feeRows[0].value) || 0
    } catch { /* default 0 */ }
    const shippingFeeCents = Math.round(platformShippingAUD * 100)
    if (shippingFeeCents > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
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

      // order_data carries the variant identity so the Stripe webhook can
      // hand AE order.create the customer's EXACT skuAttr — no auto-resolve
      // that might land on the wrong SKU and cost us money.
      const orderData = {
        skuId: item.skuId || null,
        skuAttr: item.skuAttr || null,
        variantLabel: item.variantLabel || '',
        variantPriceUsd: item.variantPriceUsd || null,
        shippingUsd: item.shippingCost || 0,
      }

      try {
        await sql`
          INSERT INTO user_orders (
            user_id, supplier, supplier_product_id, product_title, product_image,
            supplier_cost, sale_price, profit, commission, commission_rate, quantity,
            platform, platform_order_id,
            customer_name, customer_email, shipping_address,
            status, notes, stripe_checkout_session, order_data
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
            ${session.id},
            ${JSON.stringify(orderData)}::jsonb
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
