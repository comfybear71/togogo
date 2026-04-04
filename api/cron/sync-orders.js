// Cron job: sync order statuses from AliExpress
// Runs periodically to check for shipping updates, cancellations, delivery
// GET /api/cron/sync-orders?secret=JWT_SECRET
import { sql, ensureSchema } from '../_lib/db.js'
import { getOrderTracking } from '../_lib/suppliers.js'
import { sendEmail } from '../_lib/email.js'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
  // Auth: cron secret or JWT secret
  const secret = req.headers['authorization']?.replace('Bearer ', '') || req.query.secret
  const validSecret = process.env.CRON_SECRET || process.env.JWT_SECRET
  if (!secret || secret !== validSecret) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  await ensureSchema()

  try {
    // Get all orders that have been submitted to AliExpress and aren't in a final state
    const { rows: orders } = await sql`
      SELECT id, supplier_order_id, status, product_title, customer_name, customer_email,
             user_id, tracking_number, notes, stripe_payment_intent, sale_price
      FROM user_orders
      WHERE supplier_order_id IS NOT NULL
        AND status IN ('processing', 'shipped', 'pending')
      ORDER BY created_at DESC
      LIMIT 50
    `

    console.log(`[SyncOrders] Checking ${orders.length} active AliExpress orders`)

    const results = {
      checked: 0,
      updated: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
      errors: 0,
    }

    for (const order of orders) {
      results.checked++

      try {
        const tracking = await getOrderTracking(order.supplier_order_id)

        if (!tracking) {
          console.log(`[SyncOrders] No tracking data for order ${order.id} (AE: ${order.supplier_order_id})`)
          continue
        }

        const aeStatus = (tracking.status || '').toLowerCase()
        let newStatus = order.status
        let notes = order.notes || ''
        let shouldUpdate = false

        // Map AliExpress status to our status
        if (aeStatus.includes('cancel') || aeStatus === 'cancelled' || aeStatus === 'canceled') {
          newStatus = 'cancelled'
          notes = `AliExpress cancelled order: ${tracking.rawData?.cancel_reason || aeStatus}`
          results.cancelled++
          shouldUpdate = true

          // Email admin about cancellation
          await sendEmail({
            to: 'sfrench71@gmail.com',
            subject: `[ALERT] AliExpress Order Cancelled — ${order.product_title}`,
            html: `
              <div style="font-family:system-ui;max-width:600px;margin:0 auto;background:#0f172a;color:#e2e8f0;padding:32px;border-radius:16px">
                <h1 style="color:#FF6B35">ToGoGo</h1>
                <h2 style="color:#ef4444">Order Cancelled by AliExpress</h2>
                <p>Product: <strong>${order.product_title}</strong></p>
                <p>Customer: <strong>${order.customer_name}</strong> (${order.customer_email})</p>
                <p>AliExpress Order: <strong>${order.supplier_order_id}</strong></p>
                <p>Reason: <strong>${tracking.rawData?.cancel_reason || 'Not specified'}</strong></p>
                <p>Status: <strong>${aeStatus}</strong></p>
                <p style="color:#06D6A0;margin-top:16px">Auto-refund has been issued to the customer via Stripe.</p>
                <a href="https://togogo.me/admin/orders" style="display:inline-block;background:#FF6B35;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:12px">View Orders</a>
              </div>
            `,
          })

          // Auto-refund via Stripe
          let refundSuccess = false
          if (order.stripe_payment_intent) {
            try {
              const refund = await stripe.refunds.create({
                payment_intent: order.stripe_payment_intent,
                reason: 'requested_by_customer',
              })
              console.log(`[SyncOrders] Refund issued for order ${order.id}: ${refund.id} ($${(refund.amount / 100).toFixed(2)})`)
              refundSuccess = true
              notes += ` | Refund issued: ${refund.id}`

              // Record refund in DB
              await sql`
                INSERT INTO refunds (stripe_charge_id, amount, currency, status)
                VALUES (${refund.charge || order.stripe_payment_intent}, ${(refund.amount || 0) / 100}, 'aud', 'completed')
                ON CONFLICT (stripe_charge_id) DO UPDATE SET status = 'completed', updated_at = NOW()
              `.catch(e => console.error('[SyncOrders] Failed to record refund:', e.message))

              newStatus = 'refunded'
            } catch (refundErr) {
              console.error(`[SyncOrders] Refund failed for order ${order.id}:`, refundErr.message)
              notes += ` | Auto-refund FAILED: ${refundErr.message}`
            }
          } else {
            console.warn(`[SyncOrders] No stripe_payment_intent for order ${order.id}, cannot auto-refund`)
            notes += ' | No payment intent found — manual refund required'
          }

          // Email customer about cancellation + refund
          await sendEmail({
            to: order.customer_email,
            subject: `Order Update — ${order.product_title}`,
            html: `
              <div style="font-family:system-ui;max-width:600px;margin:0 auto;background:#0f172a;color:#e2e8f0;padding:32px;border-radius:16px">
                <h1 style="color:#FF6B35">ToGoGo</h1>
                <h2 style="color:#fff">Order Update</h2>
                <p>Hi ${order.customer_name},</p>
                <p>Unfortunately, your order for <strong>${order.product_title}</strong> has been cancelled by the supplier.</p>
                ${refundSuccess
                  ? '<p style="color:#06D6A0">A <strong>full refund</strong> has been issued to your original payment method. Please allow 5-10 business days for it to appear.</p>'
                  : '<p>We are processing your refund. You will receive a full refund within 5-10 business days.</p>'
                }
                <p style="color:#94a3b8;font-size:13px;margin-top:16px">We apologise for the inconvenience. If you have any questions, please contact us.</p>
              </div>
            `,
          })

        } else if (aeStatus.includes('ship') || aeStatus === 'shipped' || aeStatus === 'in_transit' || tracking.trackingNumber) {
          if (order.status !== 'shipped') {
            newStatus = 'shipped'
            notes = `Shipped via ${tracking.logisticsCompany || 'carrier'} — tracking: ${tracking.trackingNumber || 'pending'}`
            results.shipped++
            shouldUpdate = true

            // Email customer with tracking info
            if (tracking.trackingNumber && tracking.trackingNumber !== order.tracking_number) {
              await sendEmail({
                to: order.customer_email,
                subject: `Your Order Has Shipped! — ${order.product_title}`,
                html: `
                  <div style="font-family:system-ui;max-width:600px;margin:0 auto;background:#0f172a;color:#e2e8f0;padding:32px;border-radius:16px">
                    <h1 style="color:#FF6B35">ToGoGo</h1>
                    <h2 style="color:#06D6A0">Your Order Has Shipped!</h2>
                    <p>Hi ${order.customer_name},</p>
                    <p>Great news — your order is on its way!</p>
                    <div style="background:#1e293b;border-radius:12px;padding:16px;margin:16px 0">
                      <p style="margin:4px 0;color:#94a3b8">Product: <strong style="color:#fff">${order.product_title}</strong></p>
                      <p style="margin:4px 0;color:#94a3b8">Carrier: <strong style="color:#fff">${tracking.logisticsCompany || 'International Shipping'}</strong></p>
                      <p style="margin:4px 0;color:#94a3b8">Tracking: <strong style="color:#FF6B35">${tracking.trackingNumber}</strong></p>
                      ${tracking.estimatedDelivery ? `<p style="margin:4px 0;color:#94a3b8">Est. Delivery: <strong style="color:#fff">${tracking.estimatedDelivery}</strong></p>` : ''}
                    </div>
                    ${tracking.trackingUrl ? `<a href="${tracking.trackingUrl}" style="display:inline-block;background:#FF6B35;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none">Track Your Package</a>` : ''}
                  </div>
                `,
              })
            }
          }

        } else if (aeStatus.includes('deliver') || aeStatus === 'delivered' || aeStatus === 'completed') {
          newStatus = 'delivered'
          notes = `Delivered — ${tracking.logisticsCompany || ''}`
          results.delivered++
          shouldUpdate = true
        }

        if (shouldUpdate) {
          await sql`
            UPDATE user_orders
            SET status = ${newStatus},
                tracking_number = COALESCE(${tracking.trackingNumber || null}, tracking_number),
                tracking_url = COALESCE(${tracking.trackingUrl || null}, tracking_url),
                notes = ${notes},
                updated_at = NOW()
            WHERE id = ${order.id}
          `
          console.log(`[SyncOrders] Order ${order.id} updated: ${order.status} -> ${newStatus}`)
        }
      } catch (err) {
        console.error(`[SyncOrders] Error checking order ${order.id}:`, err.message)
        results.errors++
      }
    }

    console.log(`[SyncOrders] Done:`, JSON.stringify(results))
    return res.json({ success: true, ...results })

  } catch (err) {
    console.error('[SyncOrders] Fatal error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
