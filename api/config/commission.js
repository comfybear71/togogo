// Public config endpoint — returns the ToGoGo commission rate
// This is fetched by the frontend to calculate costs transparently
import { getCommissionPercent } from '../_lib/commission.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const percent = await getCommissionPercent()
  return res.json({ commissionPercent: percent })
}
