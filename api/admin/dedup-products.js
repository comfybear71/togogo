import { sql, ensureSchema } from '../_lib/db.js'

export default async function handler(req, res) {
  const secret = req.query.secret
  if (secret !== process.env.JWT_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  await ensureSchema()

  try {
    const { rows: before } = await sql`SELECT COUNT(*) as total FROM user_products WHERE is_active = true`

    // Keep one copy of each product (newest), delete the rest
    const { rowCount } = await sql`
      DELETE FROM user_products
      WHERE id NOT IN (
        SELECT DISTINCT ON (supplier_product_id) id
        FROM user_products
        ORDER BY supplier_product_id, created_at DESC
      )
    `

    const { rows: after } = await sql`SELECT COUNT(*) as total FROM user_products WHERE is_active = true`

    return res.json({
      success: true,
      before: before[0].total,
      deleted: rowCount,
      after: after[0].total,
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
