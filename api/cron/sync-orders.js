// Sync orders with AliExpress — polls for shipping/delivery/cancellation updates
// Runs every 4 hours via Vercel cron
import { sql, ensureSchema } from '../_lib/db.js'
import { getOrderTracking } from '../_lib/suppliers.js'

export default async function handler(req, res) {
  // Auth: cron secret or admin
  const secret = req.headers['x-cron-secret'] || req.query.secret
  if (secret !== process.env.CRON_SECRET && secret !== process.env.JWT_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  await ensureSchema()

  try {
    // Get all orders with AliExpress supplier_order_id that aren't delivered/cancelled/refunded
    const { rows: orders } = await sql`
      SELECT id, supplier_order_id, status, platform_order_id
      FROM user_orders
      WHERE supplier_order_id IS NOT NULL
        AND supplier_order_id != ''
        AND status IN ('processing', 'shipped')
      ORDER BY updated_at ASC
      LIMIT 50
    `

    console.log(`[SyncOrders] Checking ${orders.length} active AliExpress orders`)

    let updated = 0
    let errors = 0

    for (const order of orders) {
      try {
        const tracking = await getOrderTracking(order.supplier_order_id)
        if (!tracking) continue

        const newStatus = mapAliExpressStatus(tracking.orderStatus)
        if (!newStatus || newStatus === order.status) continue

        const trackingNumber = tracking.trackingNumber || null
        const trackingUrl = tracking.trackingUrl || null
        const logisticsCompany = tracking.logisticsCompany || null

        await sql`
          UPDATE user_orders
          SET status = ${newStatus},
              tracking_number = COALESCE(${trackingNumber}, tracking_number),
              notes = ${`AliExpress status: ${tracking.orderStatus}` + (logisticsCompany ? ` via ${logisticsCompany}` : '')},
              updated_at = NOW()
          WHERE id = ${order.id}
        `

        console.log(`[SyncOrders] Order ${order.platform_order_id}: ${order.status} → ${newStatus}${trackingNumber ? ` (tracking: ${trackingNumber})` : ''}`)
        updated++

        // If cancelled by AliExpress, try auto-refund
        if (newStatus === 'cancelled') {
          try {
            const { rows: paymentRows } = await sql`
              SELECT stripe_payment_intent, sale_price FROM user_orders WHERE id = ${order.id}
            `
            const pi = paymentRows[0]?.stripe_payment_intent
            if (pi) {
              const Stripe = (await import('stripe')).default
              const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
              const refund = await stripe.refunds.create({ payment_intent: pi })
              await sql`
                INSERT INTO refunds (stripe_charge_id, stripe_refund_id, order_id, amount, status)
                VALUES (${pi}, ${refund.id}, ${order.id}, ${paymentRows[0].sale_price}, 'completed')
              `
              await sql`UPDATE user_orders SET status = 'refunded', notes = ${'Auto-refunded: AliExpress cancelled order'}, updated_at = NOW() WHERE id = ${order.id}`
              console.log(`[SyncOrders] Auto-refunded order ${order.platform_order_id}: ${refund.id}`)
            }
          } catch (refundErr) {
            console.error(`[SyncOrders] Auto-refund failed for ${order.platform_order_id}:`, refundErr.message)
          }
        }
      } catch (err) {
        console.error(`[SyncOrders] Error syncing order ${order.platform_order_id}:`, err.message)
        errors++
      }
    }

    console.log(`[SyncOrders] Done: ${updated} updated, ${errors} errors out of ${orders.length} orders`)

    return res.json({
      success: true,
      checked: orders.length,
      updated,
      errors,
    })
  } catch (err) {
    console.error('[SyncOrders] Fatal error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}

function mapAliExpressStatus(aeStatus) {
  if (!aeStatus) return null
  const s = aeStatus.toUpperCase()
  if (s.includes('SHIP') || s.includes('IN_TRANSIT')) return 'shipped'
  if (s.includes('DELIVER') || s.includes('FINISH') || s.includes('COMPLETE')) return 'delivered'
  if (s.includes('CANCEL') || s.includes('CLOSE')) return 'cancelled'
  return null
}
