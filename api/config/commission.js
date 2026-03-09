// Public config endpoint — returns the ToGoGo commission rate
// This is fetched by the frontend to calculate costs transparently
import { sql } from '../_lib/db.js'

const DEFAULT_COMMISSION_PERCENT = 5

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const result = await sql`
      SELECT value FROM admin_settings WHERE key = 'platform_fee_percent'
    `
    const percent = result.rows.length > 0
      ? parseFloat(result.rows[0].value) || DEFAULT_COMMISSION_PERCENT
      : DEFAULT_COMMISSION_PERCENT

    return res.json({ commissionPercent: percent })
  } catch {
    return res.json({ commissionPercent: DEFAULT_COMMISSION_PERCENT })
  }
}
