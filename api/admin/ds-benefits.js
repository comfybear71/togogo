// Admin endpoint: AliExpress dropshipping (DS) savings snapshot.
//
// GET /api/admin/ds-benefits → DS member level/benefits (live, OAuth) plus our
// own AliExpress order volume + spend from the DB, so the admin can see what
// volume-based discount tier the account is at (and how close to the next one).
//
// Read-only. Uses the same admin/setup auth as the other admin widgets.
import { requireAdminOrSetup } from '../_lib/auth.js'
import { getDSMemberBenefits } from '../_lib/suppliers.js'
import { sql } from '../_lib/db.js'

export default async function handler(req, res) {
  try {
    await requireAdminOrSetup(req)
  } catch (err) {
    return res.status(err?.status || 500).json({ error: err?.message || 'Auth error' })
  }

  // Live DS benefits (needs a healthy OAuth token). Never throws — returns
  // { success:false, error } if the call fails so the widget can explain it.
  const benefits = await getDSMemberBenefits()

  // Our real AliExpress spend, straight from placed orders.
  let orderStats = { ae_orders: 0, total_spent_usd: 0 }
  try {
    const { rows } = await sql`
      SELECT
        COUNT(*) FILTER (WHERE supplier_order_id IS NOT NULL)::int AS ae_orders,
        COALESCE(SUM(CASE WHEN supplier_order_id IS NOT NULL THEN COALESCE(supplier_cost, 0) ELSE 0 END), 0)::float AS total_spent_usd
      FROM user_orders
    `
    if (rows[0]) orderStats = rows[0]
  } catch { /* table empty / not migrated — keep zeros */ }

  return res.json({
    ok: benefits.success !== false,
    benefits: benefits.benefits || null,
    error: benefits.error || null,
    orderStats,
    levels: 'DS tiers (by 30-day AE spend): Level C (~US$1k+) ≈ 2% off · Level B ≈ 3–4% · Level A ≈ 5%+',
  })
}
