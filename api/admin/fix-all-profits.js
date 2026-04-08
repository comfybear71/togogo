// Emergency fix: zero out profit on cancelled orders + recalculate all order profits correctly
import { sql, ensureSchema } from '../_lib/db.js'

export default async function handler(req, res) {
  const secret = req.query.secret
  if (secret !== process.env.JWT_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  await ensureSchema()

  try {
    // Step 1: Zero out ALL cancelled orders — they should have no profit
    const { rowCount: cancelledFixed } = await sql`
      UPDATE user_orders
      SET profit = 0, commission = 0, supplier_cost = 0,
          updated_at = NOW()
      WHERE status = 'cancelled' AND (profit != 0 OR commission != 0)
    `

    // Step 2: Fix negative profits — if supplier_cost > sale_price, something is wrong
    const { rowCount: negativeFixed } = await sql`
      UPDATE user_orders
      SET supplier_cost = ROUND((sale_price / 1.5)::numeric, 2),
          profit = ROUND((sale_price - ROUND((sale_price / 1.5)::numeric, 2)) * 0.70, 2),
          commission = ROUND((sale_price - ROUND((sale_price / 1.5)::numeric, 2)) * 0.30, 2),
          updated_at = NOW()
      WHERE profit < 0 AND status != 'cancelled' AND sale_price > 0
    `

    // Step 3: Recalculate profit on active orders using products table supplier_cost
    let commissionRate = 0.30
    try {
      const { rows } = await sql`SELECT value FROM admin_settings WHERE key = 'platform_fee_percent'`
      if (rows[0]) commissionRate = parseFloat(rows[0].value) / 100 || 0.30
    } catch {}

    const { rowCount: recalculated } = await sql`
      UPDATE user_orders o
      SET
        supplier_cost = ROUND((p.supplier_cost * o.quantity)::numeric, 2),
        commission = ROUND(((o.sale_price - ROUND((p.supplier_cost * o.quantity)::numeric, 2)) * ${commissionRate})::numeric, 2),
        profit = ROUND(((o.sale_price - ROUND((p.supplier_cost * o.quantity)::numeric, 2)) * ${1 - commissionRate})::numeric, 2),
        updated_at = NOW()
      FROM user_products p
      WHERE o.supplier_product_id = p.supplier_product_id
        AND o.user_id = p.user_id
        AND o.status NOT IN ('cancelled', 'refunded')
        AND o.sale_price > 0
        AND p.supplier_cost > 0
        AND p.supplier_cost < o.sale_price
    `

    // Show results
    const { rows: summary } = await sql`
      SELECT
        SUM(CASE WHEN status = 'cancelled' THEN 0 ELSE profit END) as total_profit,
        SUM(CASE WHEN status = 'cancelled' THEN 0 ELSE commission END) as total_commission,
        COUNT(*) as total_orders,
        COUNT(CASE WHEN profit < 0 THEN 1 END) as negative_profits
      FROM user_orders
    `

    const { rows: samples } = await sql`
      SELECT platform_order_id, product_title, supplier_cost, sale_price, profit, commission, status
      FROM user_orders
      ORDER BY updated_at DESC
      LIMIT 10
    `

    return res.json({
      success: true,
      cancelledZeroed: cancelledFixed,
      negativeProfitsFixed: negativeFixed,
      ordersRecalculated: recalculated,
      summary: summary[0],
      samples: samples.map(o => ({
        ref: o.platform_order_id,
        product: o.product_title?.slice(0, 40),
        cost: o.supplier_cost,
        sale: o.sale_price,
        profit: o.profit,
        commission: o.commission,
        status: o.status,
      })),
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
