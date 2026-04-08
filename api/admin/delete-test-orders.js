import { sql, ensureSchema } from '../_lib/db.js'

export default async function handler(req, res) {
  const secret = req.query.secret
  if (secret !== process.env.JWT_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  await ensureSchema()

  try {
    const { rows: count } = await sql`SELECT COUNT(*) as total FROM user_orders`
    const { rowCount } = await sql`DELETE FROM user_orders`

    return res.json({
      success: true,
      deleted: rowCount,
      message: 'All test orders deleted. Clean slate.',
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
