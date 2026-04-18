// Admin endpoint — imports AliExpress products into the database
// GET  /api/admin/import-products — check status
// POST /api/admin/import-products — trigger import
import { sql, ensureSchema } from '../_lib/db.js'
import { requireAdminLite } from '../_lib/auth.js'
import { searchAliExpress } from '../_lib/suppliers.js'

export default async function handler(req, res) {
  try {
    await requireAdminLite(req)
  } catch (err) {
    return res.status(err?.status || 500).json({ error: err?.message || 'Auth error' })
  }

  await ensureSchema()

  // GET — show current product count
  if (req.method === 'GET') {
    const { rows } = await sql`SELECT COUNT(*) as count FROM user_products`
    return res.json({ productsInDB: parseInt(rows[0].count) })
  }

  // POST — import products from AliExpress into user_products for all store owners
  if (req.method === 'POST') {
    try {
      console.log('[Import] Starting AliExpress product import...')

      // Get all active store owners
      const { rows: stores } = await sql`
        SELECT s.user_id, s.subdomain, s.store_name
        FROM user_stores s
        WHERE s.status = 'active'
      `

      if (stores.length === 0) {
        return res.json({ success: false, message: 'No active stores found' })
      }

      // Fetch products from AliExpress
      console.log('[Import] Fetching AliExpress products...')
      const products = await searchAliExpress('', 1)
      console.log(`[Import] Got ${products.length} products from AliExpress`)

      if (products.length === 0) {
        return res.json({ success: false, message: 'No products returned from AliExpress API' })
      }

      let totalImported = 0

      // Import products for each store owner
      for (const store of stores) {
        let imported = 0
        for (const p of products) {
          try {
            const imgArray = Array.isArray(p.images) ? p.images : []
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
                ${imgArray},
                ${'AliExpress'},
                ${p.productId || p.id},
                ${p.cost || 0},
                ${p.suggestedPrice || 0},
                ${p.category || 'General'},
                true
              )
            `
            imported++
          } catch (err) {
            // Skip duplicates or errors
          }
        }
        console.log(`[Import] Imported ${imported} products for store "${store.subdomain}" (${store.user_id})`)
        totalImported += imported
      }

      console.log(`[Import] Done! Total: ${totalImported} products across ${stores.length} stores`)

      return res.json({
        success: true,
        aliexpressProducts: products.length,
        stores: stores.length,
        totalImported,
      })
    } catch (err) {
      console.error('[Import] Failed:', err)
      return res.status(500).json({ error: err.message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
