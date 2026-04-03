// One-time fix: set Stuart French as admin and trigger product import
// Visit: https://togogo.me/api/admin/fix-role?secret=YOUR_JWT_SECRET
import { sql, ensureSchema } from '../_lib/db.js'
import { searchAliExpress } from '../_lib/suppliers.js'

export default async function handler(req, res) {
  const secret = req.query.secret
  if (!secret || secret !== process.env.JWT_SECRET) {
    return res.status(401).json({ error: 'Add ?secret=YOUR_JWT_SECRET to the URL' })
  }

  await ensureSchema()

  // Step 1: Set sfrench71@gmail.com as admin
  const { rows: users } = await sql`
    SELECT id, email, role FROM users WHERE email = 'sfrench71@gmail.com'
  `

  if (users.length === 0) {
    return res.json({ error: 'User sfrench71@gmail.com not found' })
  }

  const user = users[0]
  const wasRole = user.role

  if (user.role !== 'admin') {
    await sql`UPDATE users SET role = 'admin' WHERE id = ${user.id}`
    console.log(`[Fix] Updated ${user.email} role from "${wasRole}" to "admin"`)
  }

  // Step 2: Import products for all stores
  const { rows: stores } = await sql`
    SELECT s.user_id, s.subdomain FROM user_stores s WHERE s.status = 'active'
  `

  console.log(`[Fix] Found ${stores.length} active stores, fetching AliExpress products...`)

  const products = await searchAliExpress('', 1)
  console.log(`[Fix] Got ${products.length} products from AliExpress`)

  let totalImported = 0
  for (const store of stores) {
    let imported = 0
    for (const p of products) {
      try {
        await sql`
          INSERT INTO user_products (
            user_id, title, description, image, images, supplier,
            supplier_product_id, supplier_cost, sale_price,
            category, is_active
          ) VALUES (
            ${store.user_id},
            ${p.title},
            ${p.description || p.title},
            ${p.image || ''},
            ${JSON.stringify(p.images || [])},
            ${'AliExpress'},
            ${p.productId || p.id},
            ${p.cost || 0},
            ${p.suggestedPrice || 0},
            ${p.category || 'General'},
            true
          )
          ON CONFLICT DO NOTHING
        `
        imported++
      } catch { /* skip duplicates */ }
    }
    console.log(`[Fix] Imported ${imported} products for store "${store.subdomain}"`)
    totalImported += imported
  }

  return res.json({
    success: true,
    userFixed: { email: user.email, oldRole: wasRole, newRole: 'admin' },
    stores: stores.length,
    aliexpressProducts: products.length,
    totalImported,
  })
}
