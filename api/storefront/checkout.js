// Storefront checkout — creates Stripe Checkout Session with Connect payment split
// Customer pays → Platform takes commission → Store owner gets the rest
import Stripe from 'stripe'
import { sql } from '../_lib/db.js'
import { getCommissionRate } from '../_lib/commission.js'
import { getAudRate, usdToAud, usdToAudCents, getMinShippingUsd } from '../_lib/pricing.js'
import { verifyProduct, getProductDetails, queryDSFreight } from '../_lib/suppliers.js'

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
    const { subdomain, items, customer, acknowledgedDriftTotal } = req.body

    if (!subdomain || !items?.length || !customer?.name || !customer?.email) {
      return res.status(400).json({ error: 'subdomain, items, and customer (name, email) required' })
    }

    // Get store + connect account + markup
    const { rows: stores } = await sql`
      SELECT s.id, s.user_id, s.store_name, s.subdomain, s.stripe_connect_id, s.stripe_connect_status, s.markup_percent
      FROM user_stores s
      WHERE s.subdomain = ${subdomain} AND s.status = 'active'
    `
    if (!stores[0]) return res.status(404).json({ error: 'Store not found' })

    const store = stores[0]
    // Per-store markup applied on top of break-even. Stripe charges the
    // marked-up amount; the delta (profit) funds both the store owner's
    // margin and ToGoGo's commission via Stripe Connect application_fee.
    const markupPercent = parseFloat(store.markup_percent ?? 40) || 0
    const markupMultiplier = 1 + markupPercent / 100

    // Build line items from cart. Internal pricing math stays USD (AE's
    // native currency); convert once to AUD when we hand to Stripe so
    // customers are charged in AUD on their statement, not USD.
    const lineItems = []
    const orderItems = []
    const commissionRate = await getCommissionRate()
    const audRate = await getAudRate()
    // Min shipping floor in USD — applied whenever AE's freight query
    // returns 0/null for the chosen SKU. Without this we'd cache a
    // sale_price below AE's actual bill (the order #906de9ee
    // root cause) and eat the shipping ourselves.
    const minShippingUsd = await getMinShippingUsd(audRate)
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

      // FRESH PRICE AT CHECKOUT TIME — no stale stored data.
      // Call ds.product.get + ds.freight.query live for this exact SKU.
      // Fall back to stored data only if the live call fails (network/timeout).
      let livePriceUsd = null
      let liveShippingUsd = null
      if (aeId && !aeId.includes('-')) {
        try {
          const details = await Promise.race([
            getProductDetails(aeId),
            new Promise(r => setTimeout(() => r(null), 5000)),
          ])
          if (details?.variants?.length > 0) {
            const match = chosenVariant?.skuId
              ? details.variants.find(v => String(v.skuId) === String(chosenVariant.skuId))
              : null
            livePriceUsd = match?.priceUsd || details.variants[0].priceUsd || null
          }
          // Fresh shipping for this exact SKU
          const skuForFreight = chosenVariant?.skuId || details?.variants?.[0]?.skuId || ''
          if (skuForFreight) {
            const freight = await Promise.race([
              queryDSFreight(aeId, customer?.address?.country || 'AU', qty, skuForFreight),
              new Promise(r => setTimeout(() => r(null), 5000)),
            ])
            if (Array.isArray(freight) && freight.length > 0) {
              liveShippingUsd = freight.reduce((m, o) => o.cost < m.cost ? o : m, freight[0]).cost || 0
            }
          }
        } catch (err) {
          console.log(`[Checkout] Live pricing fetch failed for ${aeId}: ${err.message}`)
        }
      }

      // Product price — live if we got it, else the stored variant price
      const variantPriceUsd = livePriceUsd != null ? livePriceUsd
        : (chosenVariant?.priceUsd > 0
            ? chosenVariant.priceUsd
            : (parseFloat(product.min_variant_price_usd) || parseFloat(product.sale_price) || 0))
      // Shipping — live if we got it, else stored
      // Floor every shipping value at min — both the live freight
      // result and the stored fallback can come back as 0 when AE
      // says "delivery not available". Customer always pays at
      // least the min; we re-bill exactly what AE bills us.
      const rawShipping = liveShippingUsd != null ? liveShippingUsd
        : (parseFloat(product.shipping_cost) || 0)
      const shippingUsd = Math.max(rawShipping, minShippingUsd)

      // Break-even per item (what AE bills us) — product + shipping + 10%
      // tax on (product + shipping) per AE's real AU GST behaviour. This is
      // supplierCost; the store owner never charges less than this.
      const TAX_RATE = 0.10
      const taxUsd = Math.round((variantPriceUsd + shippingUsd) * TAX_RATE * 100) / 100
      const breakEvenUsd = variantPriceUsd + shippingUsd + taxUsd

      // Charge the customer break-even × markupMultiplier. One clean line
      // item per cart entry — showing the 3-line breakdown (product /
      // shipping / tax) after markup inflates the "shipping" and "tax"
      // line artificially, which looks like price-gouging to customers.
      // Internal breakdown is preserved in orderItems for reporting.
      // Stripe is charged in AUD: convert USD price using the live admin
      // rate. The customer's statement reads AUD directly — no per-bank
      // FX surprises.
      const chargePriceUsd = Math.round(breakEvenUsd * markupMultiplier * 100) / 100
      const chargePriceAud = usdToAud(chargePriceUsd, audRate)
      const chargePriceCents = usdToAudCents(chargePriceUsd, audRate)

      const variantTitle = chosenVariant?.label
        ? `${product.title.slice(0, 160)} — ${chosenVariant.label.slice(0, 40)}`
        : product.title.slice(0, 200)
      const variantImage = chosenVariant?.colorImage || chosenVariant?.image || product.image

      lineItems.push({
        price_data: {
          currency: 'aud',
          product_data: {
            name: variantTitle,
            ...(variantImage ? { images: [variantImage] } : {}),
          },
          unit_amount: chargePriceCents,
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
        // supplierCost stays USD — that's AE's invoice currency and it
        // reconciles 1:1 with their bill. salePrice is AUD — it's the
        // customer's actual debit. The split between store owner and
        // ToGoGo via Stripe Connect application_fee is computed below
        // entirely in AUD cents.
        supplierCost: breakEvenUsd,
        salePrice: chargePriceAud,
        shippingCost: shippingUsd,
        quantity: qty,
      })

      // Use the real per-item break-even (not the stored product.supplier_cost
      // which may be stale / pre-markup-aware). This powers the Stripe
      // Connect application_fee split below. Kept in USD until the final
      // application_fee math, where it's converted alongside profit.
      totalSupplierCost += breakEvenUsd * qty
    }

    if (lineItems.length === 0) {
      return res.status(400).json({ error: 'No valid products found' })
    }

    // Total customer charge in AUD cents (Stripe sees this).
    const totalAmount = lineItems.reduce((s, li) => s + li.price_data.unit_amount * li.quantity, 0)

    // Optional flat handling fee — already configured in AUD by admin.
    // Currency on the line item is AUD to match the rest of the cart.
    let platformShippingAUD = 0
    try {
      const { rows: feeRows } = await sql`SELECT value FROM admin_settings WHERE key = 'shipping_fee_aud'`
      if (feeRows[0]) platformShippingAUD = parseFloat(feeRows[0].value) || 0
    } catch { /* default 0 */ }
    const shippingFeeCents = Math.round(platformShippingAUD * 100)
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

    // PRICE DRIFT CHECK — if the fresh AE total differs from what the customer
    // saw in their cart (in EITHER direction) by more than 1 cent, pause and
    // return the new figure so the frontend can show a "Price updated" banner.
    // The cart sends cartTotalUsd (cents-of-AUD now since the storefront
    // displays AUD); compare in AUD cents.
    const cartTotalCents = items.reduce(
      (s, i) => s + Math.round((parseFloat(i.cartTotalUsd) || 0) * 100) * (i.quantity || 1),
      0
    )
    const driftCents = Math.abs(totalWithShipping - cartTotalCents)
    if (cartTotalCents > 0 && driftCents > 1) {
      const acknowledgedCents = Math.round((parseFloat(acknowledgedDriftTotal) || 0) * 100)
      // Only bounce back if customer hasn't already acknowledged this specific
      // total — otherwise an "accept new price" retry would re-bounce forever.
      if (acknowledgedCents !== totalWithShipping) {
        const priceDropped = totalWithShipping < cartTotalCents
        const message = priceDropped
          ? `Price dropped at AliExpress since you added to cart. Was A$${(cartTotalCents / 100).toFixed(2)} — now A$${(totalWithShipping / 100).toFixed(2)}.`
          : `AliExpress price updated. Previous total A$${(cartTotalCents / 100).toFixed(2)} — current A$${(totalWithShipping / 100).toFixed(2)}.`
        return res.json({
          priceUpdated: true,
          priceDropped,
          oldTotalUsd: cartTotalCents / 100,
          newTotalUsd: totalWithShipping / 100,
          message,
        })
      }
    }

    // APPLICATION FEE = what Stripe holds back for the PLATFORM (ToGoGo),
    // while the remainder transfers to the store owner's Connect account.
    //
    // ToGoGo must keep enough to BOTH reimburse itself for the AE bill
    // (supplier cost — paid by our master PayPal auto-pay via DS Center,
    // in USD) AND its commission on profit. Convert the USD supplier
    // cost into AUD using the same rate so the application_fee currency
    // (AUD cents) matches the line items.
    //
    //   applicationFee_aud = supplierCost_aud + (profit_aud × commissionRate) + shippingFee_aud
    //
    // Then the destination (store owner) receives:
    //   destination_aud = totalAmount_aud − applicationFee_aud
    //                   = profit_aud × (1 − commissionRate)
    //                   = store owner's 70% of profit (with 30% commissionRate).
    // Any AE discount (estimate vs actual bill) stays entirely on ToGoGo's
    // Stripe balance because applicationFee was locked in using the estimate.
    const totalSupplierCostCents = usdToAudCents(totalSupplierCost, audRate)
    const profitCents = totalAmount - totalSupplierCostCents

    // Spend-and-save discount (OFF by default). Margin-funded: it comes out of
    // profit and is HARD-CAPPED so it can never push the charge below our AE
    // cost. Read from admin_settings; any error → no discount.
    let discountCents = 0
    let promoPercent = 0
    try {
      const { rows: promoRows } = await sql`
        SELECT key, value FROM admin_settings
        WHERE key IN ('spend_save_enabled', 'spend_save_threshold_aud', 'spend_save_percent')
      `
      const promo = Object.fromEntries(promoRows.map(r => [r.key, r.value]))
      const enabled = String(promo.spend_save_enabled || '').toLowerCase() === 'true'
      const promoThresholdAud = parseFloat(promo.spend_save_threshold_aud) || 0
      promoPercent = parseFloat(promo.spend_save_percent) || 0
      if (enabled && promoPercent > 0 && (totalAmount / 100) >= promoThresholdAud) {
        const raw = Math.round(totalAmount * (promoPercent / 100))
        // Never discount more than the profit ⇒ never sell below cost.
        discountCents = Math.min(raw, Math.max(profitCents, 0))
      }
    } catch { /* promo off on any error */ }

    // Margin-funded: profit (and therefore both the owner's share AND our
    // commission) shrink by the discount. ApplicationFee is computed on the
    // reduced profit so the Connect split stays correct and ≤ the charge.
    const discountedProfitCents = profitCents - discountCents
    const applicationFee = totalSupplierCostCents
      + Math.round(Math.max(discountedProfitCents, 0) * commissionRate)
      + shippingFeeCents
    // Ratio used to keep the per-item order records accurate after the discount.
    const discountRatio = totalAmount > 0 ? discountCents / totalAmount : 0

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

    // Apply the spend-and-save discount as a one-off Stripe coupon so the
    // customer sees the saving on the payment page. The charge becomes
    // (total − discount); applicationFee (recomputed above) stays ≤ charge.
    if (discountCents > 0) {
      try {
        const coupon = await stripe.coupons.create({
          amount_off: discountCents,
          currency: 'aud',
          duration: 'once',
          name: `Spend & Save ${promoPercent}% off`,
        })
        sessionParams.discounts = [{ coupon: coupon.id }]
        sessionParams.metadata.togogo_discount_aud = (discountCents / 100).toFixed(2)
        console.log(`[Checkout] Spend & Save applied: -A$${(discountCents / 100).toFixed(2)}`)
      } catch (e) {
        console.error('[Checkout] discount coupon failed, proceeding without:', e.message)
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams)

    // Save pending order to database
    for (const item of orderItems) {
      const qty = item.quantity
      // sale_price is AUD (customer's actual debit); supplier_cost stays
      // USD (matches AE's invoice). Profit + commission are AUD — owner
      // gets paid AUD via Stripe Connect; ToGoGo's commission lives in
      // AUD too. Use the same audRate captured at session start so all
      // numbers come from one rate snapshot.
      // Reduce the recorded sale by the same discount ratio so profit/
      // commission records match what the customer was actually charged.
      const salePriceAud = Math.round(item.salePrice * qty * (1 - discountRatio) * 100) / 100
      const supplierCostUsd = Math.round(item.supplierCost * qty * 100) / 100
      const supplierCostAud = usdToAud(supplierCostUsd, audRate)
      const grossProfitAud = Math.round((salePriceAud - supplierCostAud) * 100) / 100
      const commissionAud = Math.round(Math.max(grossProfitAud, 0) * commissionRate * 100) / 100
      const ownerProfitAud = Math.round((grossProfitAud - commissionAud) * 100) / 100

      // order_data carries the variant identity so the Stripe webhook can
      // hand AE order.create the customer's EXACT skuAttr — no auto-resolve
      // that might land on the wrong SKU and cost us money.
      const orderData = {
        skuId: item.skuId || null,
        skuAttr: item.skuAttr || null,
        variantLabel: item.variantLabel || '',
        variantPriceUsd: item.variantPriceUsd || null,
        shippingUsd: item.shippingCost || 0,
        // Snapshot the rate used for this order so the webhook + admin
        // tools can reproduce the math without re-reading admin_settings.
        audRate,
      }

      try {
        await sql`
          INSERT INTO user_orders (
            user_id, supplier, supplier_product_id, product_title, product_image,
            supplier_cost, sale_price, profit, commission, commission_rate, quantity,
            platform, platform_order_id,
            customer_name, customer_email, shipping_address,
            status, notes, stripe_checkout_session, order_data, pricing_currency
          ) VALUES (
            ${store.user_id}, ${item.supplier || 'AliExpress'}, ${item.supplierProductId || ''}, ${item.title}, ${item.image},
            ${supplierCostUsd}, ${salePriceAud},
            ${ownerProfitAud},
            ${commissionAud}, ${commissionRate}, ${qty},
            'togogo-store', ${orderRef},
            ${customer.name}, ${customer.email},
            ${JSON.stringify({ ...customer.address, phone: customer.phone || '' })},
            'pending_payment',
            ${`Stripe session: ${session.id}`},
            ${session.id},
            ${JSON.stringify(orderData)}::jsonb,
            'AUD'
          )
        `
      } catch (err) {
        console.error(`[Checkout] Failed to save order item:`, err.message)
      }
    }

    console.log(`[Checkout] Session ${session.id} created for ${orderRef} (${lineItems.length} items, A$${(totalAmount / 100).toFixed(2)} @ rate ${audRate})`)

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
