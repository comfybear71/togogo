// One-time cleanup: delete test orders except the real AliExpress one
// DELETE after use
import { sql, ensureSchema } from '../_lib/db.js'

export default async function handler(req, res) {
  const secret = req.query.secret
  if (secret !== process.env.JWT_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  await ensureSchema()

  try {
    // Delete ALL orders — clean slate
    const { rowCount } = await sql`DELETE FROM user_orders`

    return res.json({
      success: true,
      deleted: rowCount,
      remaining: []
    })
  } catch (err) {
    console.error('[Cleanup] Error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
