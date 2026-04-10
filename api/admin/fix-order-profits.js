// Fix existing order profits — recalculate using corrected supplier_cost from products table
// GET /api/admin/fix-order-profits?secret=JWT_SECRET
import { sql, ensureSchema } from '../_lib/db.js'

export default async function handler(req, res) {
  const secret = req.query.secret
  if (secret !== process.env.JWT_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  await ensureSchema()

  try {
    // Get commission rate
    let commissionRate = 0.30
    try {
      const { rows } = await sql`SELECT value FROM admin_settings WHERE key = 'platform_fee_percent'`
      if (rows[0]) commissionRate = parseFloat(rows[0].value) / 100 || 0.30
    } catch { /* use default */ }

    // Recalculate profit on all orders using the corrected supplier_cost from products
    // profit = (sale_price - supplier_cost) * (1 - commission_rate)
    // commission = (sale_price - supplier_cost) * commission_rate
    const { rowCount } = await sql`
      UPDATE user_orders o
      SET
        supplier_cost = ROUND((p.supplier_cost * o.quantity)::numeric, 2),
        commission = ROUND(((o.sale_price - ROUND((p.supplier_cost * o.quantity)::numeric, 2)) * ${commissionRate})::numeric, 2),
        profit = ROUND(((o.sale_price - ROUND((p.supplier_cost * o.quantity)::numeric, 2)) * ${1 - commissionRate})::numeric, 2),
        commission_rate = ${commissionRate},
        updated_at = NOW()
      FROM user_products p
      WHERE o.supplier_product_id = p.supplier_product_id
        AND o.user_id = p.user_id
        AND o.sale_price > 0
        AND p.supplier_cost > 0
    `

    // Show some sample orders to verify
    const { rows: samples } = await sql`
      SELECT platform_order_id, product_title, supplier_cost, sale_price, profit, commission, quantity
      FROM user_orders
      WHERE sale_price > 0
      ORDER BY updated_at DESC
      LIMIT 5
    `

    return res.json({
      success: true,
      ordersFixed: rowCount,
      commissionRate: `${commissionRate * 100}%`,
      samples: samples.map(o => ({
        ref: o.platform_order_id,
        product: o.product_title?.slice(0, 50),
        supplierCost: o.supplier_cost,
        salePrice: o.sale_price,
        profit: o.profit,
        commission: o.commission,
      })),
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
