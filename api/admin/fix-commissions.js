// Fix existing order commissions — recalculates using correct formula
// Commission = 30% of PROFIT (sale - cost), NOT 30% of sale price
// Safe to run multiple times
// GET /api/admin/fix-commissions?secret=TOKEN
import { sql, ensureSchema } from '../_lib/db.js'

export default async function handler(req, res) {
  const secret = req.query.secret
  let authorized = secret === process.env.JWT_SECRET
  if (!authorized && secret) {
    try {
      const { verifyToken } = await import('../_lib/auth.js')
      const payload = verifyToken(secret)
      if (payload && payload.role === 'admin') authorized = true
    } catch {}
  }
  if (!authorized) return res.status(401).json({ error: 'Unauthorized' })

  await ensureSchema()

  try {
    // Get all orders
    const { rows: orders } = await sql`
      SELECT id, sale_price, supplier_cost, commission, commission_rate, profit, quantity
      FROM user_orders
    `

    let fixed = 0
    let skipped = 0

    for (const order of orders) {
      const salePrice = parseFloat(order.sale_price) || 0
      const supplierCost = parseFloat(order.supplier_cost) || 0
      const rate = parseFloat(order.commission_rate) || 0.30

      // Correct formula: 30% of profit, not 30% of sale
      const grossProfit = salePrice - supplierCost
      const correctCommission = Math.round(Math.max(grossProfit, 0) * rate * 100) / 100
      const correctProfit = Math.round((grossProfit - correctCommission) * 100) / 100

      const currentCommission = parseFloat(order.commission) || 0
      const currentProfit = parseFloat(order.profit) || 0

      // Only update if values are different
      if (Math.abs(currentCommission - correctCommission) > 0.01 || Math.abs(currentProfit - correctProfit) > 0.01) {
        await sql`
          UPDATE user_orders
          SET commission = ${correctCommission},
              profit = ${correctProfit},
              updated_at = NOW()
          WHERE id = ${order.id}
        `
        fixed++
        console.log(`[FixCommissions] Order ${order.id}: commission $${currentCommission}→$${correctCommission}, profit $${currentProfit}→$${correctProfit}`)
      } else {
        skipped++
      }
    }

    return res.json({
      success: true,
      total: orders.length,
      fixed,
      skipped,
      message: `Recalculated ${fixed} orders, ${skipped} already correct`,
    })
  } catch (err) {
    console.error('[FixCommissions] Error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
