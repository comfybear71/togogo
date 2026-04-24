// One-shot retroactive reconciliation: rolls AE discount deltas into the
// commission column for orders that already have ae_actual_cost_usd set
// but were reconciled BEFORE fetch-real-order-costs started topping up
// commission automatically. Idempotent via a marker in the notes field.
//
// GET /api/admin/reconcile-ae-discounts?secret=JWT              (dry run)
// GET /api/admin/reconcile-ae-discounts?secret=JWT&apply=1      (writes)
import { sql, ensureSchema } from '../_lib/db.js'

const ROLLED_MARKER = 'AE discount +A$'
const USD_TO_AUD = 1.45

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
  const apply = req.query.apply === '1'

  try {
    const { rows: orders } = await sql`
      SELECT id, platform_order_id, product_title,
             supplier_cost, ae_actual_cost_usd, commission, notes
      FROM user_orders
      WHERE ae_actual_cost_usd IS NOT NULL
        AND status NOT IN ('cancelled', 'refunded')
    `

    const toUpdate = []
    let skipped = 0

    for (const order of orders) {
      if ((order.notes || '').includes(ROLLED_MARKER)) { skipped++; continue }

      const supplierCost = parseFloat(order.supplier_cost) || 0
      const aeActualUsd = parseFloat(order.ae_actual_cost_usd) || 0
      const aeActualAud = Math.round(aeActualUsd * USD_TO_AUD * 100) / 100
      const bonus = Math.max(0, Math.round((supplierCost - aeActualAud) * 100) / 100)

      if (bonus === 0) { skipped++; continue }

      const currentCommission = parseFloat(order.commission) || 0
      toUpdate.push({
        id: order.id,
        platform_order_id: order.platform_order_id,
        product_title: order.product_title?.slice(0, 60),
        supplierCostAud: supplierCost,
        aeActualAud,
        bonus,
        commissionBefore: currentCommission,
        commissionAfter: Math.round((currentCommission + bonus) * 100) / 100,
      })
    }

    let applied = 0
    if (apply) {
      for (const u of toUpdate) {
        try {
          await sql`
            UPDATE user_orders
            SET commission = ${u.commissionAfter},
                notes = COALESCE(notes, '') || ${' ' + ROLLED_MARKER + u.bonus.toFixed(2) + ' (retro reconcile).'},
                updated_at = NOW()
            WHERE id = ${u.id}
          `
          applied++
        } catch (err) {
          console.error(`[Reconcile] DB update failed for ${u.platform_order_id}:`, err.message)
        }
      }
    }

    return res.json({
      success: true,
      totalReconciled: orders.length,
      skipped,
      candidates: toUpdate.length,
      applied: apply ? applied : null,
      dryRun: !apply,
      rows: toUpdate,
      nextStep: apply
        ? `Rolled AE discounts into commission for ${applied} of ${toUpdate.length} orders.`
        : `${toUpdate.length} orders would be updated. Re-run with &apply=1 to commit.`,
    })
  } catch (err) {
    console.error('[Reconcile AE Discounts] Error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
