// Quick check — are products in the database?
// Visit: https://togogo.me/api/admin/check-products?secret=YOUR_JWT_SECRET
import { sql } from '../_lib/db.js'

export default async function handler(req, res) {
  const secret = req.query.secret
  if (!secret || secret !== process.env.JWT_SECRET) {
    return res.status(401).json({ error: 'Add ?secret=YOUR_JWT_SECRET' })
  }

  const { rows: countRows } = await sql`SELECT COUNT(*) as count FROM user_products`
  const { rows: sample } = await sql`
    SELECT id, title, image, supplier_cost, sale_price, category, supplier,
           (SELECT email FROM users WHERE id = user_products.user_id) as owner_email
    FROM user_products
    LIMIT 5
  `
  const { rows: byStore } = await sql`
    SELECT u.email, s.subdomain, COUNT(p.id) as product_count
    FROM user_stores s
    JOIN users u ON u.id = s.user_id
    LEFT JOIN user_products p ON p.user_id = s.user_id
    WHERE s.status = 'active'
    GROUP BY u.email, s.subdomain
  `

  const { rows: roleCheck } = await sql`
    SELECT email, role FROM users WHERE email = 'sfrench71@gmail.com'
  `

  return res.json({
    totalProducts: parseInt(countRows[0].count),
    sampleProducts: sample,
    productsByStore: byStore,
    adminUser: roleCheck[0] || 'not found',
  })
}
