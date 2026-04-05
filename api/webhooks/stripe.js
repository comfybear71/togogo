// Stripe webhook handler — processes completed payments
// Handles: domain purchases, subscription changes, invoice events
import { sql, ensureSchema } from '../_lib/db.js'
import Stripe from 'stripe'
import { registerDomain } from '../domains/register.js'
import { sendEmail, orderConfirmationEmail, newOrderAlertEmail } from '../_lib/email.js'
import { submitOrder, reportOrderForDSLevel } from '../_lib/suppliers.js'

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

    // [Improvement 5] Enforce signature verification in production
    if (endpointSecret) {
      const sig = req.headers['stripe-signature']
      event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret)
    } else if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
      console.error('STRIPE_WEBHOOK_SECRET is not configured in production — rejecting webhook')
      return res.status(500).json({ error: 'Webhook secret not configured' })
    } else {
      // Dev mode only — no signature verification
      console.warn('⚠ Dev mode: Stripe webhook signature verification bypassed')
      event = JSON.parse(rawBody.toString())
    }
  } catch (err) {
    console.error('Stripe webhook signature error:', err.message)
    return res.status(400).json({ error: 'Invalid signature' })
  }

  try {
    await ensureSchema()

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const { user_id, domain, type, store_name, subdomain } = session.metadata || {}

        if (type === 'store_subscription' && user_id && subdomain) {
          // Store subscription payment completed — activate the store
          console.log(`Store subscription paid: ${store_name} (${subdomain}.togogo.me) for user ${user_id}`)

          const fullDomain = `${subdomain}.togogo.me`
          const paymentData = JSON.stringify({ payment_confirmed: true, paid_at: new Date().toISOString(), checkout_session_id: session.id })

          // Ensure store record exists and is active (CREATE if missing, UPDATE if exists)
          try {
            await sql`
              INSERT INTO user_stores (user_id, subdomain, full_domain, store_name, status, provision_data)
              VALUES (${user_id}, ${subdomain}, ${fullDomain}, ${store_name || subdomain + "'s Store"}, 'active', ${paymentData})
              ON CONFLICT (user_id) DO UPDATE
              SET status = 'active', subdomain = ${subdomain}, full_domain = ${fullDomain},
                  store_name = COALESCE(NULLIF(${store_name || ''}, ''), user_stores.store_name),
                  updated_at = NOW()
            `
          } catch (storeErr) {
            console.error('Store activation failed, retrying simple update:', storeErr.message)
            await sql`
              UPDATE user_stores SET status = 'active', updated_at = NOW()
              WHERE user_id = ${user_id} AND subdomain = ${subdomain}
            `.catch(e => console.error('Store activation retry also failed:', e.message))
          }

          // Fallback: create subscription record if customer.subscription.created webhook doesn't fire
          try {
            const stripeSubId = session.subscription
            const priceAmount = (session.amount_total || 1999) / 100
            if (stripeSubId) {
              const { rows: existingSub } = await sql`
                SELECT id FROM subscriptions WHERE stripe_subscription_id = ${stripeSubId}
              `
              if (existingSub.length === 0) {
                await sql`
                  INSERT INTO subscriptions (user_id, plan, status, stripe_subscription_id, price_per_month, started_at, expires_at)
                  VALUES (${user_id}, 'premium', 'active', ${stripeSubId}, ${priceAmount}, NOW(), NOW() + INTERVAL '1 month')
                `
                console.log(`Subscription fallback created for user ${user_id}`)
              }
            } else {
              // No Stripe subscription ID — create a record anyway so we have a trail
              const { rows: anySub } = await sql`
                SELECT id FROM subscriptions WHERE user_id = ${user_id} AND status IN ('active', 'past_due')
              `
              if (anySub.length === 0) {
                await sql`
                  INSERT INTO subscriptions (user_id, plan, status, price_per_month, started_at, expires_at)
                  VALUES (${user_id}, 'premium', 'active', ${(session.amount_total || 1999) / 100}, NOW(), NOW() + INTERVAL '1 month')
                `
                console.log(`Subscription record created (no stripe sub ID) for user ${user_id}`)
              }
            }
          } catch (subErr) {
            console.error('Subscription fallback creation failed:', subErr.message)
          }

          // Upgrade user role
          await sql`
            UPDATE users SET role = CASE WHEN role = 'buyer' THEN 'subscriber' WHEN role = 'both' THEN 'both' ELSE role END, updated_at = NOW()
            WHERE id = ${user_id}
          `.catch(e => console.error('User role upgrade failed:', e.message))

        } else if (session.metadata?.togogo_order_ref) {
          // Storefront checkout completed — confirm the order
          const orderRef = session.metadata.togogo_order_ref
          const storeUserId = session.metadata.togogo_store_user_id
          const paymentIntent = session.payment_intent
          const shippingDetails = session.shipping_details || session.customer_details || {}
          console.log(`[Webhook] Storefront checkout completed: ${orderRef} (payment: ${paymentIntent})`)

          // Idempotency check — prevent duplicate processing on webhook retries
          const { rows: existingOrders } = await sql`
            SELECT status FROM user_orders WHERE platform_order_id = ${orderRef} AND status != 'pending_payment' LIMIT 1
          `
          if (existingOrders.length > 0) {
            console.log(`[Webhook] Order ${orderRef} already processed (status: ${existingOrders[0].status}), skipping duplicate`)
            return res.json({ received: true, duplicate: true })
          }

          try {
            // Update order with payment intent and shipping address from Stripe
            const shippingAddress = shippingDetails.address ? JSON.stringify({
              name: shippingDetails.name || '',
              line1: shippingDetails.address.line1 || '',
              line2: shippingDetails.address.line2 || '',
              city: shippingDetails.address.city || '',
              state: shippingDetails.address.state || '',
              postcode: shippingDetails.address.postal_code || '',
              country: shippingDetails.address.country || 'AU',
            }) : null

            await sql`
              UPDATE user_orders
              SET status = 'pending',
                  stripe_payment_intent = ${paymentIntent},
                  shipping_address = COALESCE(${shippingAddress}::jsonb, shipping_address),
                  notes = ${'Payment confirmed via Stripe'},
                  updated_at = NOW()
              WHERE platform_order_id = ${orderRef} AND status = 'pending_payment'
            `
            console.log(`[Webhook] Order ${orderRef} confirmed`)

            // Save/update store customer
            try {
              const { rows: storeRows } = await sql`SELECT id FROM user_stores WHERE user_id = ${storeUserId}`
              const storeId = storeRows[0]?.id
              const custEmail = session.customer_details?.email || session.customer_email
              const custName = shippingDetails.name || session.customer_details?.name || ''

              if (storeId && custEmail) {
                const { rows: orderTotals } = await sql`
                  SELECT COALESCE(SUM(sale_price), 0)::numeric as total
                  FROM user_orders WHERE platform_order_id = ${orderRef}
                `
                const orderTotal = parseFloat(orderTotals[0]?.total) || 0

                await sql`
                  INSERT INTO store_customers (store_id, email, name, phone, total_orders, total_spent, last_order_at)
                  VALUES (${storeId}, ${custEmail}, ${custName}, ${session.customer_details?.phone || ''},
                          1, ${orderTotal}, NOW())
                  ON CONFLICT (store_id, email) DO UPDATE SET
                    name = COALESCE(NULLIF(${custName}, ''), store_customers.name),
                    phone = COALESCE(NULLIF(${session.customer_details?.phone || ''}, ''), store_customers.phone),
                    total_orders = store_customers.total_orders + 1,
                    total_spent = store_customers.total_spent + ${orderTotal},
                    last_order_at = NOW()
                `
                console.log(`[Webhook] Store customer saved: ${custEmail} for store ${storeId}`)
              }
            } catch (custErr) {
              console.error(`[Webhook] Failed to save store customer:`, custErr.message)
            }

            // Send email notifications
            try {
              const { rows: orderItems } = await sql`
                SELECT product_title, sale_price, quantity, customer_name, customer_email, user_id
                FROM user_orders WHERE platform_order_id = ${orderRef}
              `
              if (orderItems.length > 0) {
                const customerName = orderItems[0].customer_name
                const customerEmail = orderItems[0].customer_email
                const storeUserId = orderItems[0].user_id
                const items = orderItems.map(o => ({ title: o.product_title, price: parseFloat(o.sale_price), quantity: o.quantity || 1 }))
                const total = items.reduce((s, i) => s + i.price * i.quantity, 0)

                // Get store name
                const { rows: storeRows } = await sql`SELECT id, store_name, subdomain FROM user_stores WHERE user_id = ${storeUserId}`
                const storeName = storeRows[0]?.store_name || storeRows[0]?.subdomain || 'ToGoGo Store'

                // Get store owner email
                const { rows: ownerRows } = await sql`SELECT email FROM users WHERE id = ${storeUserId}`
                const ownerEmail = ownerRows[0]?.email

                // 1. Email customer — order confirmation
                const custEmail = orderConfirmationEmail({ orderRef, items, total, storeName, customerName })
                await sendEmail({ to: customerEmail, ...custEmail })

                // 2. Email store owner — new order alert
                if (ownerEmail) {
                  const ownerAlert = newOrderAlertEmail({ orderRef, items, total, storeName, customerName, customerEmail, isAdmin: false })
                  await sendEmail({ to: ownerEmail, ...ownerAlert })
                }

                // 3. Email admin — new order alert
                const adminAlert = newOrderAlertEmail({ orderRef, items, total, storeName, customerName, customerEmail, isAdmin: true })
                await sendEmail({ to: 'sfrench71@gmail.com', ...adminAlert })

                console.log(`[Webhook] Emails sent for order ${orderRef}`)

                // Save store customer (for repeat customer recognition)
                try {
                  const storeId = storeRows[0]?.id
                  if (storeId && customerEmail) {
                    await sql`
                      INSERT INTO store_customers (store_id, email, name, total_orders, total_spent, first_order_at, last_order_at)
                      VALUES (${storeId}, ${customerEmail}, ${customerName}, 1, ${total}, NOW(), NOW())
                      ON CONFLICT (store_id, email)
                      DO UPDATE SET total_orders = store_customers.total_orders + 1,
                        total_spent = store_customers.total_spent + ${total},
                        last_order_at = NOW(),
                        name = COALESCE(NULLIF(${customerName}, ''), store_customers.name)
                    `
                    console.log(`[Webhook] Store customer saved: ${customerEmail}`)
                  }
                } catch (custErr) {
                  console.error(`[Webhook] Failed to save store customer:`, custErr.message)
                }

                // Auto-submit to AliExpress
                try {
                  const { rows: fullOrders } = await sql`
                    SELECT id, supplier_product_id, quantity, shipping_address, customer_name, customer_email,
                           supplier_cost, sale_price, stripe_checkout_session
                    FROM user_orders WHERE platform_order_id = ${orderRef} AND supplier = 'AliExpress'
                  `
                  for (const order of fullOrders) {
                    const productId = (order.supplier_product_id || '').replace('ae_', '')
                    if (!productId || productId.includes('-')) {
                      console.error(`[Webhook] Skipping AliExpress submit for order ${order.id}: no valid supplier_product_id (got: ${order.supplier_product_id || 'empty'})`)
                      continue
                    }
                    const orderAmount = parseFloat(order.supplier_cost || order.sale_price || 0)
                    let shippingAddr = {}
                    try { shippingAddr = typeof order.shipping_address === 'string' ? JSON.parse(order.shipping_address) : (order.shipping_address || {}) } catch {}

                    // Also try to get shipping address from Stripe session (more complete)
                    try {
                      const stripeSession = await stripe.checkout.sessions.retrieve(
                        order.stripe_checkout_session || ''
                      )
                      if (stripeSession?.shipping_details?.address) {
                        const sa = stripeSession.shipping_details
                        shippingAddr = {
                          ...shippingAddr,
                          name: order.customer_name || sa.name || shippingAddr.name || '',
                          line1: sa.address.line1 || shippingAddr.line1 || '',
                          city: sa.address.city || shippingAddr.city || '',
                          state: sa.address.state || shippingAddr.state || '',
                          zip: sa.address.postal_code || shippingAddr.zip || '',
                          country: sa.address.country || shippingAddr.country || 'AU',
                          phone: stripeSession.customer_details?.phone || shippingAddr.phone || '',
                        }
                        console.log(`[Webhook] Stripe shipping: ${JSON.stringify(shippingAddr).slice(0, 300)}`)
                      }
                    } catch (stripeErr) {
                      console.error(`[Webhook] Stripe session retrieve failed:`, stripeErr.message)
                    }

                    // Log the final address being used
                    console.log(`[Webhook] Address for AE: ${JSON.stringify(shippingAddr).slice(0, 300)}`)

                    // Get active coupon code from admin settings
                    let couponCode = ''
                    try {
                      const { rows: couponRows } = await sql`SELECT value FROM admin_settings WHERE key = 'default_coupon_code'`
                      if (couponRows[0]?.value) couponCode = couponRows[0].value
                    } catch { /* no coupon */ }

                    console.log(`[Webhook] Submitting order ${order.id} to AliExpress (product: ${productId})${couponCode ? ' with coupon: ' + couponCode : ''}`)
                    const result = await submitOrder({
                      productId,
                      skuId: null,
                      quantity: order.quantity || 1,
                      orderAmount,
                      promotionCode: couponCode || undefined,
                      shippingAddress: {
                        ...shippingAddr,
                        name: order.customer_name || shippingAddr.name || '',
                        phone: shippingAddr.phone || '',
                      },
                    })
                    if (result.success) {
                      await sql`UPDATE user_orders SET supplier_order_id = ${result.orderId}, status = 'processing', notes = ${'Submitted to AliExpress'}, updated_at = NOW() WHERE id = ${order.id}`
                      console.log(`[Webhook] AliExpress order submitted: ${result.orderId}`)

                      // Report to DS Level system — builds towards automatic discounts
                      try {
                        await reportOrderForDSLevel({
                          productId,
                          orderId: result.orderId,
                          orderAmount: order.sale_price || 0,
                          skuInfo: '',
                        })
                      } catch { /* non-critical */ }
                    } else {
                      await sql`UPDATE user_orders SET notes = ${'AliExpress auto-submit failed: ' + result.error + '. Manual submission required.'}, updated_at = NOW() WHERE id = ${order.id}`
                      console.error(`[Webhook] AliExpress submission failed for ${order.id}: ${result.error}`)
                    }
                  }
                } catch (aeErr) {
                  console.error(`[Webhook] AliExpress auto-submit error:`, aeErr.message)
                }
              }
            } catch (emailErr) {
              console.error(`[Webhook] Email notification failed:`, emailErr.message)
            }
          } catch (err) {
            console.error(`[Webhook] Failed to confirm order ${orderRef}:`, err.message)
          }

        } else if (type === 'domain_purchase' && domain && user_id) {
          await sql`
            UPDATE user_orders
            SET status = 'processing', notes = ${'Payment confirmed. Registering domain...'}
            WHERE platform_order_id = ${session.id} AND user_id = ${user_id}
          `

          const { rows } = await sql`SELECT email, name FROM users WHERE id = ${user_id}`
          const user = rows[0]

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

      // [Improvement 4] Handle proration and richer status mapping on plan changes
      case 'customer.subscription.updated': {
        const subscription = event.data.object
        const userId = subscription.metadata?.user_id
        if (userId) {
          // Map Stripe subscription status to our DB status
          let status
          if (subscription.cancel_at_period_end) {
            status = 'cancelled'
          } else if (subscription.status === 'active' || subscription.status === 'trialing') {
            status = 'active'
          } else if (subscription.status === 'past_due') {
            status = 'past_due'
          } else if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
            status = 'expired'
          } else {
            status = 'active'
          }

          const plan = subscription.metadata?.plan || 'basic'
          const priceAmount = (subscription.items?.data?.[0]?.price?.unit_amount || 0) / 100
          const expiresAt = subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null

          await sql`
            UPDATE subscriptions
            SET status = ${status}, plan = ${plan}, price_per_month = ${priceAmount},
                expires_at = ${expiresAt}
            WHERE stripe_subscription_id = ${subscription.id}
          `
          console.log(`Subscription updated: ${subscription.id} status=${status} plan=${plan} price=${priceAmount}`)
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
          // Renew subscription period — also clears any past_due status
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

      // [Improvement 1] Use 'past_due' instead of immediate cancellation on first failure
      case 'invoice.payment_failed': {
        const invoice = event.data.object
        if (invoice.subscription) {
          const attemptCount = invoice.attempt_count || 1

          if (attemptCount >= 4) {
            // All retries exhausted — cancel the subscription
            await sql`
              UPDATE subscriptions SET status = 'cancelled' WHERE stripe_subscription_id = ${invoice.subscription}
            `
            console.log(`Invoice payment failed (final attempt ${attemptCount}) — subscription cancelled: ${invoice.subscription}`)
          } else {
            // Mark as past_due — Stripe will retry automatically
            await sql`
              UPDATE subscriptions SET status = 'past_due' WHERE stripe_subscription_id = ${invoice.subscription}
            `
            console.log(`Invoice payment failed (attempt ${attemptCount}/4) — subscription past_due: ${invoice.subscription}`)
          }
        }
        break
      }

      // Dispute handling — customer filed a chargeback
      case 'charge.dispute.created': {
        const dispute = event.data.object
        const chargeId = dispute.charge
        const amount = (dispute.amount || 0) / 100
        const reason = dispute.reason || 'unknown'

        // Find the subscription or order linked to this charge
        try {
          await sql`
            INSERT INTO disputes (stripe_dispute_id, stripe_charge_id, amount, currency, reason, status, evidence_due_by)
            VALUES (${dispute.id}, ${chargeId}, ${amount}, ${dispute.currency || 'aud'}, ${reason}, 'open',
                    ${dispute.evidence_details?.due_by ? new Date(dispute.evidence_details.due_by * 1000).toISOString() : null})
            ON CONFLICT (stripe_dispute_id) DO UPDATE SET status = 'open', updated_at = NOW()
          `
        } catch (err) {
          console.error('Failed to record dispute:', err.message)
        }
        console.log(`Dispute created: ${dispute.id} amount=${amount} reason=${reason}`)
        break
      }

      case 'charge.dispute.updated': {
        const dispute = event.data.object
        const status = dispute.status === 'won' ? 'won' : dispute.status === 'lost' ? 'lost' : 'under_review'
        try {
          await sql`
            UPDATE disputes SET status = ${status}, updated_at = NOW()
            WHERE stripe_dispute_id = ${dispute.id}
          `
        } catch (err) {
          console.error('Failed to update dispute:', err.message)
        }
        console.log(`Dispute updated: ${dispute.id} status=${status}`)
        break
      }

      case 'charge.dispute.closed': {
        const dispute = event.data.object
        const status = dispute.status === 'won' ? 'won' : 'lost'
        try {
          await sql`
            UPDATE disputes SET status = ${status}, resolved_at = NOW(), updated_at = NOW()
            WHERE stripe_dispute_id = ${dispute.id}
          `
        } catch (err) {
          console.error('Failed to close dispute:', err.message)
        }
        console.log(`Dispute closed: ${dispute.id} status=${status}`)
        break
      }

      // Refund handling
      case 'charge.refunded': {
        const charge = event.data.object
        const refundAmount = (charge.amount_refunded || 0) / 100
        try {
          await sql`
            INSERT INTO refunds (stripe_charge_id, amount, currency, status)
            VALUES (${charge.id}, ${refundAmount}, ${charge.currency || 'aud'}, 'completed')
            ON CONFLICT (stripe_charge_id) DO UPDATE SET amount = ${refundAmount}, status = 'completed', updated_at = NOW()
          `
        } catch (err) {
          console.error('Failed to record refund:', err.message)
        }
        console.log(`Charge refunded: ${charge.id} amount=${refundAmount}`)
        break
      }

      // Stripe Connect — account status changed
      case 'account.updated': {
        const account = event.data.object
        const status = account.charges_enabled && account.payouts_enabled
          ? 'active'
          : account.details_submitted
            ? 'pending_verification'
            : 'onboarding_incomplete'

        try {
          await sql`
            UPDATE user_stores
            SET stripe_connect_status = ${status}, updated_at = NOW()
            WHERE stripe_connect_id = ${account.id}
          `
          console.log(`Connect account ${account.id} status updated to: ${status}`)
        } catch (err) {
          console.error('Failed to update connect status:', err.message)
        }
        break
      }

      // Checkout expired — customer abandoned payment
      case 'checkout.session.expired': {
        const session = event.data.object
        const orderRef = session.metadata?.togogo_order_ref
        if (orderRef) {
          console.log(`[Webhook] Checkout expired: ${orderRef}`)
          await sql`
            UPDATE user_orders SET status = 'cancelled', notes = ${'Payment expired — customer did not complete checkout'}, updated_at = NOW()
            WHERE platform_order_id = ${orderRef} AND status = 'pending_payment'
          `.catch(err => console.error('Failed to cancel expired order:', err.message))
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
