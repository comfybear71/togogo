import { getDSMemberBenefits, reportOrderForDSLevel } from '../_lib/suppliers.js'
import { sql } from '../_lib/db.js'

export default async function handler(req, res) {
  // Simple auth check
  const secret = req.query.secret || req.headers['x-setup-secret']
  if (secret !== process.env.JWT_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    // Get DS member benefits/level
    const benefits = await getDSMemberBenefits()

    // Count our completed AliExpress orders for context
    const orderStats = await sql`
      SELECT
        COUNT(*) as total_orders,
        COUNT(CASE WHEN supplier_order_id IS NOT NULL THEN 1 END) as ae_orders,
        SUM(CASE WHEN supplier_order_id IS NOT NULL THEN COALESCE(supplier_cost, 0) ELSE 0 END) as total_spent
      FROM user_orders
    `

    return res.status(200).json({
      dsBenefits: benefits,
      orderStats: orderStats.rows?.[0] || {},
      note: 'DS Levels: Level C ($1k+ orders) = ~2% discount, Level B = ~3-4%, Level A = ~5%+',
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
