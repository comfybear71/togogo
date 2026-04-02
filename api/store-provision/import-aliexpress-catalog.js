// Fetch AliExpress trending products and import into all stores
// This recreates the original 1,700+ product catalog from AliExpress API
import { sql, ensureSchema } from '../_lib/db.js'
import { requireAdminOrSetup } from '../_lib/auth.js'
import { searchAliExpress } from '../_lib/suppliers.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    await ensureSchema()
    await requireAdminOrSetup(req)
  } catch (err) {
    return res.status(err?.status || 401).json({ error: err?.message || 'Authentication required' })
  }

  try {
    // Get all active stores
    const { rows: stores } = await sql`
      SELECT id, user_id, subdomain, store_name FROM user_stores WHERE status = 'active'
    `

    if (stores.length === 0) {
      return res.json({ success: true, message: 'No active stores found', storesUpdated: 0, totalImported: 0 })
    }

    // Search terms to fetch diverse AliExpress products (like the original 1,700)
    const searchTerms = [
      'wireless earbuds',
      'LED lights',
      'phone case',
      'smartwatch',
      'power bank',
      'USB cable',
      'headphones',
      'portable speaker',
      'desk lamp',
      'wall organizer',
      'kitchen gadget',
      'bluetooth speaker',
      'phone charger',
      'anti-slip mat',
      'cable organizer',
      'desk fan',
      'photo display',
      'led strip',
      'screen protector',
      'phone stand',
      'car mount',
      'travel adapter',
      'mirror with light',
      'desk organizer',
      'storage box',
    ]

    let totalImported = 0
    const results = []

    // For each store, import AliExpress products
    for (const store of stores) {
      let storeImported = 0

      // Fetch products for multiple search terms
      for (const term of searchTerms) {
        try {
          console.log(`Fetching AliExpress products for: ${term}`)
          const products = await searchAliExpress(term, 1)

          if (!products || products.length === 0) {
            console.log(`No products found for: ${term}`)
            continue
          }

          // Import each product
          for (const p of products) {
            try {
              // Normalize images
              const images = [p.image, ...(p.images || [])].filter(Boolean).slice(0, 10)
              const imageJson = JSON.stringify(images)

              await sql`
                INSERT INTO user_products (
                  user_id, title, description, image, images, supplier,
                  supplier_product_id, supplier_cost, sale_price,
                  category, is_active
                ) VALUES (
                  ${store.user_id},
                  ${p.title},
                  ${p.description || ''},
                  ${p.image || ''},
                  ${imageJson},
                  'AliExpress',
                  ${p.id || p.product_id || ''},
                  ${p.cost || p.min_price || 0},
                  ${p.suggestedPrice || p.price || (p.cost || 0) * 2.5},
                  ${p.category || 'Electronics'},
                  true
                )
                ON CONFLICT DO NOTHING
              `
              storeImported++
            } catch (err) {
              console.error(`Failed to import product ${p.title}:`, err.message)
            }
          }
        } catch (err) {
          console.error(`AliExpress search failed for "${term}":`, err.message)
          // Continue with next search term
        }
      }

      totalImported += storeImported
      results.push({
        storeName: store.store_name,
        subdomain: store.subdomain,
        productsAdded: storeImported
      })
    }

    return res.json({
      success: true,
      totalImported,
      storesUpdated: results.length,
      details: results,
      message: `Imported ${totalImported} AliExpress products across ${results.length} stores`
    })
  } catch (err) {
    console.error('AliExpress catalog import error:', err)
    return res.status(500).json({ error: 'Failed to import from AliExpress', details: err.message })
  }
}
