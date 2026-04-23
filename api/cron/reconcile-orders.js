// Cron: retry trade.ds.order.get for orders that submitOrder couldn't
// reconcile (AE's pay_amount wasn't finalised by the time submitOrder
// called trade.ds.order.get).
//
// Picks up orders where:
//   - supplier_order_id is set (we placed the AE order)
//   - ae_actual_cost_usd is NULL (reconciliation didn't succeed yet)
//   - updated_at within the last 72 hours (stop trying after 3 days)
//
// Runs every 5 minutes. Batch of 10 orders.
// Auth: Vercel cron header, CRON_SECRET, or signed admin JWT.
import { sql, ensureSchema } from '../_lib/db.js'
import { callAPI } from '../_lib/suppliers.js'

const BATCH_SIZE = 10

async function fetchRealCostUsd(aeOrderId) {
  try {
    const data = await callAPI('aliexpress.trade.ds.order.get', {
      single_order_query: JSON.stringify({ order_id: Number(aeOrderId) }),
    })
    const r = data?.aliexpress_trade_ds_order_get_response?.result || data?.result
    if (!r) return null
    const payAmount = parseFloat(r.pay_amount || '0')
    if (payAmount > 0) return payAmount
    const product = parseFloat(r.total_product_amount || r.product_amount || '0')
    const ship = parseFloat(r.logistics_amount || r.shipping_amount || '0')
    const tax = parseFloat(r.tax_amount || '0')
    const sum = product + ship + tax
    return sum > 0 ? sum : null
  } catch (err) {
    console.error(`[Reconcile] fetchRealCostUsd(${aeOrderId}) error:`, err.message)
    return null
  }
}

export default async function handler(req, res) {
  const authHeader = req.headers.authorization
  const cronSecret = process.env.CRON_SECRET
  const querySecret = req.query.secret
  let authorized = false
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) authorized = true
  if (querySecret === process.env.JWT_SECRET) authorized = true
  if (!authorized && querySecret) {
    try {
      const { verifyToken } = await import('../_lib/auth.js')
      const payload = verifyToken(querySecret)
      if (payload && payload.role === 'admin') authorized = true
    } catch { /* */ }
  }
  if (!authorized) return res.status(401).json({ error: 'Unauthorized' })

  await ensureSchema()

  const { rows: orders } = await sql`
    SELECT id, supplier_order_id, sale_price
    FROM user_orders
    WHERE supplier_order_id IS NOT NULL
      AND ae_actual_cost_usd IS NULL
      AND updated_at > NOW() - INTERVAL '72 hours'
    ORDER BY updated_at ASC
    LIMIT ${BATCH_SIZE}
  `

  if (orders.length === 0) {
    return res.json({ status: 'idle', message: 'Nothing to reconcile' })
  }

  let reconciled = 0
  let stillEmpty = 0
  const results = []
  for (const o of orders) {
    const realCostUsd = await fetchRealCostUsd(o.supplier_order_id)
    if (realCostUsd != null && realCostUsd > 0) {
      const rounded = Math.round(realCostUsd * 100) / 100
      await sql`
        UPDATE user_orders
        SET ae_actual_cost_usd = ${rounded},
            ae_actual_fetched_at = NOW(),
            updated_at = NOW()
        WHERE id = ${o.id}
      `
      reconciled++
      const customerPaid = parseFloat(o.sale_price) || 0
      const marginUsd = Math.round((customerPaid - rounded) * 100) / 100
      const flag = marginUsd < 0 ? ' 🔴 LOSS' : ''
      console.log(`[Reconcile] ${o.id}: customer $${customerPaid.toFixed(2)} · AE $${rounded.toFixed(2)} · margin $${marginUsd.toFixed(2)}${flag}`)
      results.push({ id: o.id, aeOrderId: o.supplier_order_id, realCostUsd: rounded, marginUsd })
    } else {
      stillEmpty++
      results.push({ id: o.id, aeOrderId: o.supplier_order_id, status: 'pay_amount not ready' })
    }
  }

  return res.json({
    status: 'ok',
    processed: orders.length,
    reconciled,
    stillEmpty,
    results,
  })
}
