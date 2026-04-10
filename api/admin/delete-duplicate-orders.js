import { sql, ensureSchema } from '../_lib/db.js'

export default async function handler(req, res) {
  const secret = req.query.secret
  if (secret !== process.env.JWT_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  await ensureSchema()

  try {
    // Count before
    const { rows: before } = await sql`SELECT COUNT(*) as total FROM user_orders`

    // Delete only the bad Stripe rebuilds — they have generic "Product" or "Order TG-" titles
    const { rowCount } = await sql`
      DELETE FROM user_orders
      WHERE product_title = 'Product'
         OR product_title LIKE 'Order TG-%'
    `

    // Count after
    const { rows: after } = await sql`SELECT COUNT(*) as total FROM user_orders`

    return res.json({
      success: true,
      deleted: rowCount,
      ordersBefore: before[0].total,
      ordersAfter: after[0].total,
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
