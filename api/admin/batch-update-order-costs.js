// Batch update ae_actual_cost_usd for multiple orders
// Requires explicit JSON payload with order updates (safety first — no guessing)
// POST /api/admin/batch-update-order-costs?secret=JWT
// Body: { updates: [ { orderRef: "TG-XXXX", aeBilledUSD: 5.57 }, ... ] }
import { sql, ensureSchema } from '../_lib/db.js'

export default async function handler(req, res) {
  const secret = req.query.secret
  if (secret !== process.env.JWT_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' })
  }

  await ensureSchema()

  const { updates } = req.body || {}

  if (!Array.isArray(updates) || updates.length === 0) {
    return res.status(400).json({
      error: 'Provide updates array',
      example: {
        updates: [
          { orderRef: 'TG-xxxx', aeBilledUSD: 5.57 },
          { orderRef: 'TG-yyyy', aeBilledUSD: 12.34 },
        ],
      },
    })
  }

  try {
    const usdToAud = 1.45 // configurable, but use standard rate
    const results = []
    const errors = []

    for (const update of updates) {
      const { orderRef, aeBilledUSD } = update

      if (!orderRef || !aeBilledUSD || aeBilledUSD <= 0) {
        errors.push({
          orderRef,
          error: 'Invalid orderRef or aeBilledUSD',
        })
        continue
      }

      try {
        // Find the order
        const { rows: orders } = await sql`
          SELECT id, sale_price FROM user_orders
          WHERE platform_order_id = ${orderRef}
            AND status NOT IN ('cancelled', 'refunded')
          LIMIT 1
        `

        if (orders.length === 0) {
          errors.push({
            orderRef,
            error: 'Order not found',
          })
          continue
        }

        const order = orders[0]
        const aeActualCostAUD = Math.round(aeBilledUSD * usdToAud * 100) / 100
        const marginAUD = Math.round((order.sale_price - aeActualCostAUD) * 100) / 100

        // Update the order
        await sql`
          UPDATE user_orders
          SET ae_actual_cost_usd = ${aeBilledUSD},
              ae_actual_fetched_at = NOW(),
              notes = ${'Real AE cost: US$' + aeBilledUSD.toFixed(2) + ' (A$' + aeActualCostAUD.toFixed(2) + ')'},
              updated_at = NOW()
          WHERE id = ${order.id}
        `

        results.push({
          orderRef,
          aeBilledUSD,
          aeActualCostAUD,
          customerPaidUSD: order.sale_price,
          marginAUD,
          status: 'updated',
        })

        console.log(`[Batch Update] ${orderRef}: AE billed US$${aeBilledUSD.toFixed(2)} (A$${aeActualCostAUD.toFixed(2)}), margin A$${marginAUD.toFixed(2)}`)
      } catch (err) {
        errors.push({
          orderRef,
          error: err.message,
        })
        console.error(`[Batch Update] Error for ${orderRef}:`, err.message)
      }
    }

    return res.json({
      success: errors.length === 0,
      updated: results.length,
      failed: errors.length,
      results,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (err) {
    console.error('[Batch Update] Error:', err)
    return res.status(500).json({ error: err.message })
  }
}
