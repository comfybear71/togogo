// Fix admin role + import AliExpress products
// Visit: https://togogo.me/api/admin/fix-role?secret=YOUR_JWT_SECRET
import { sql, ensureSchema } from '../_lib/db.js'
import { searchAliExpress } from '../_lib/suppliers.js'

export default async function handler(req, res) {
  const secret = req.query.secret
  if (!secret || secret !== process.env.JWT_SECRET) {
    return res.status(401).json({ error: 'Add ?secret=YOUR_JWT_SECRET' })
  }

  await ensureSchema()

  // Step 1: Fix admin role
  await sql`UPDATE users SET role = 'admin' WHERE email = 'sfrench71@gmail.com'`
  console.log('[Fix] Set sfrench71@gmail.com to admin')

  // Step 2: Get stores
  const { rows: stores } = await sql`
    SELECT s.user_id, s.subdomain FROM user_stores s WHERE s.status = 'active'
  `
  console.log(`[Fix] ${stores.length} active stores`)

  // Step 3: Fetch AliExpress products (fast, cached)
  const products = await searchAliExpress('', 1)
  console.log(`[Fix] ${products.length} AliExpress products`)

  if (products.length === 0) {
    return res.json({ success: false, message: 'No products from AliExpress', adminFixed: true })
  }

  // Step 4: Batch import — 50 products per store (fast, avoids timeout)
  let totalImported = 0
  const batch = products.slice(0, 50)

  for (const store of stores) {
    let imported = 0
    for (const p of batch) {
      try {
        await sql`
          INSERT INTO user_products (
            user_id, title, description, image, images, supplier,
            supplier_product_id, supplier_cost, sale_price,
            category, is_active
          ) VALUES (
            ${store.user_id}, ${p.title}, ${p.title},
            ${p.image || ''}, ${JSON.stringify(p.images || [])},
            ${'AliExpress'}, ${p.productId || p.id},
            ${p.cost || 0}, ${p.suggestedPrice || 0},
            ${p.category || 'General'}, true
          )
          ON CONFLICT DO NOTHING
        `
        imported++
      } catch { /* skip */ }
    }
    totalImported += imported
    console.log(`[Fix] ${imported} products -> ${store.subdomain}`)
  }

  return res.json({
    success: true,
    adminFixed: true,
    stores: stores.length,
    productsPerStore: batch.length,
    totalImported,
  })
}
