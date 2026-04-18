// Check Stripe Connect status for all stores
// GET /api/admin/check-connect?secret=YOUR_JWT_SECRET
import { sql } from '../_lib/db.js'

export default async function handler(req, res) {
  const secret = req.query.secret
  if (!secret || secret !== process.env.JWT_SECRET) {
    return res.status(401).json({ error: 'Add ?secret=YOUR_JWT_SECRET' })
  }

  const { rows } = await sql`
    SELECT s.subdomain, s.store_name, s.stripe_connect_id, s.stripe_connect_status,
           u.email, u.name, u.stripe_account_id
    FROM user_stores s
    JOIN users u ON u.id = s.user_id
    WHERE s.status = 'active'
    ORDER BY s.created_at
  `

  return res.json({ stores: rows })
}
