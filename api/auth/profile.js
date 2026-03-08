import { sql } from '../_lib/db.js'
import { requireAuth } from '../_lib/auth.js'

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const user = await requireAuth(req)
    const { name, bio, avatar_url, location_suburb, location_country, phone } = req.body || {}

    const { rows } = await sql`
      UPDATE users SET
        name = COALESCE(${name}, name),
        bio = COALESCE(${bio}, bio),
        avatar_url = COALESCE(${avatar_url}, avatar_url),
        location_suburb = COALESCE(${location_suburb}, location_suburb),
        location_country = COALESCE(${location_country}, location_country),
        phone = COALESCE(${phone}, phone),
        updated_at = NOW()
      WHERE id = ${user.id}
      RETURNING id, email, name, avatar_url, bio, role, wallet_balance,
                location_suburb, location_country, verification_level,
                stripe_account_id, phone, created_at
    `

    return res.status(200).json({ user: rows[0] })
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message })
    }
    console.error('Profile update error:', error)
    return res.status(500).json({ error: 'Failed to update profile' })
  }
}
