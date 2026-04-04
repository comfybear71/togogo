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
    // Keep only the real AliExpress order (822facf8...)
    const { rowCount } = await sql`
      DELETE FROM user_orders
      WHERE id::text NOT LIKE '822facf8%'
    `

    const { rows: kept } = await sql`SELECT id, status, product_title FROM user_orders`

    return res.json({
      success: true,
      deleted: rowCount,
      remaining: kept
    })
  } catch (err) {
    console.error('[Cleanup] Error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
