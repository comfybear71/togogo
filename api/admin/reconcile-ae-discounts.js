// One-shot retroactive reconciliation: populates the ae_bonus column for
// orders that already have ae_actual_cost_usd set but were reconciled BEFORE
// ae_bonus existed (so the Bonus column on /admin/orders reads "—" for them).
// Idempotent — skips orders where ae_bonus is already set to a non-null value.
//
// Also clears the old "rolled into commission" pattern from a previous
// short-lived version: if notes contains "rolled into commission", back
// that bonus out of commission before writing it to ae_bonus.
//
// GET /api/admin/reconcile-ae-discounts?secret=JWT              (dry run)
// GET /api/admin/reconcile-ae-discounts?secret=JWT&apply=1      (writes)
import { sql, ensureSchema } from '../_lib/db.js'
import { getAudRate, usdToAud, DEFAULT_USD_TO_AUD } from '../_lib/pricing.js'

// supplier_cost and ae_actual_cost_usd are both USD (the latter literally
// in its column name; checkout writes breakEvenUsd straight into the
// former). Their delta is the AE discount in USD. ae_bonus stores it in
// the order's pricing currency — AUD for orders since the cutover, USD
// for legacy rows.
const OLD_ROLLED_MARKER = 'rolled into commission'

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
  // force=1 ignores the idempotency guard — needed after a previous run
  // wrote wrong values (e.g. the USD→AUD-conversion bug) and we need to
  // recompute every row.
  const force = req.query.force === '1'

  try {
    const { rows: orders } = await sql`
      SELECT id, platform_order_id, product_title,
             supplier_cost, ae_actual_cost_usd, commission, ae_bonus, notes,
             order_data, pricing_currency
      FROM user_orders
      WHERE ae_actual_cost_usd IS NOT NULL
        AND status NOT IN ('cancelled', 'refunded')
    `

    const fallbackRate = await getAudRate().catch(() => DEFAULT_USD_TO_AUD)
    const toUpdate = []
    let skipped = 0

    for (const order of orders) {
      // Skip if ae_bonus already populated (idempotent), unless force=1.
      if (!force && order.ae_bonus != null) { skipped++; continue }

      const supplierCost = parseFloat(order.supplier_cost) || 0
      const aeActualUsd = parseFloat(order.ae_actual_cost_usd) || 0
      const bonusUsd = Math.max(0, Math.round((supplierCost - aeActualUsd) * 100) / 100)

      // Convert the USD discount to the order's pricing currency. Legacy
      // USD orders keep the USD value; AUD orders use the rate snapshotted
      // at checkout (so the math reproduces what the storefront promised),
      // falling back to the live admin rate.
      let orderRate = null
      try {
        const od = typeof order.order_data === 'string' ? JSON.parse(order.order_data) : order.order_data
        orderRate = parseFloat(od?.audRate) || null
      } catch { /* */ }
      const isUsdOrder = order.pricing_currency === 'USD'
      const rate = isUsdOrder ? 1 : (orderRate || fallbackRate)
      const bonusStored = isUsdOrder ? bonusUsd : usdToAud(bonusUsd, rate)

      // If the short-lived commission-rollup version ran against this order,
      // the bonus is currently sitting inside commission. Back it out so the
      // commission column shows only the real frozen commission rate.
      const hadOldRollup = (order.notes || '').includes(OLD_ROLLED_MARKER)
      const currentCommission = parseFloat(order.commission) || 0
      const commissionAfter = hadOldRollup
        ? Math.round((currentCommission - bonusStored) * 100) / 100
        : currentCommission

      toUpdate.push({
        id: order.id,
        platform_order_id: order.platform_order_id,
        product_title: order.product_title?.slice(0, 60),
        pricingCurrency: isUsdOrder ? 'USD' : 'AUD',
        rateUsed: rate,
        supplierCostUsd: supplierCost,
        aeActualUsd,
        bonusUsd,
        bonus: bonusStored,
        commissionBefore: currentCommission,
        commissionAfter,
        backedOutRollup: hadOldRollup,
      })
    }

    let applied = 0
    if (apply) {
      for (const u of toUpdate) {
        try {
          await sql`
            UPDATE user_orders
            SET ae_bonus = ${u.bonus},
                commission = ${u.commissionAfter},
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
        ? `Populated ae_bonus for ${applied} of ${toUpdate.length} orders.`
        : `${toUpdate.length} orders would be updated. Re-run with &apply=1 to commit.`,
    })
  } catch (err) {
    console.error('[Reconcile AE Discounts] Error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
