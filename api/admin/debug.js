// Debug endpoint — shows raw data from admin queries
// Access via: /api/admin/debug?secret=YOUR_JWT_SECRET
import { sql, ensureSchema } from '../_lib/db.js'

export default async function handler(req, res) {
  const setupSecret = req.headers['x-setup-secret'] || req.query.secret
  if (!setupSecret || setupSecret !== process.env.JWT_SECRET) {
    return res.status(403).json({ error: 'Secret required' })
  }

  await ensureSchema()

  const results = {}

  try {
    const { rows: orders } = await sql`SELECT id, product_title, status, user_id, created_at FROM user_orders ORDER BY created_at DESC LIMIT 10`
    results.orders = { count: orders.length, rows: orders }
  } catch (e) {
    results.orders = { error: e.message }
  }

  try {
    const { rows: stores } = await sql`SELECT id, subdomain, store_name, user_id, status, stripe_connect_id FROM user_stores ORDER BY created_at DESC`
    results.stores = { count: stores.length, rows: stores }
  } catch (e) {
    results.stores = { error: e.message }
  }

  try {
    const { rows: users } = await sql`SELECT id, email, name, role FROM users ORDER BY created_at DESC LIMIT 10`
    results.users = { count: users.length, rows: users }
  } catch (e) {
    results.users = { error: e.message }
  }

  try {
    const { rows: products } = await sql`SELECT COUNT(*)::int as count FROM user_products`
    results.products = products[0]
  } catch (e) {
    results.products = { error: e.message }
  }

  return res.json(results)
}
