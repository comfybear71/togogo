// Public storefront API — serves store info + products by subdomain
// No auth required — this is the customer-facing store
import { sql, ensureSchema } from '../_lib/db.js'
import { searchAliExpress } from '../_lib/suppliers.js'

export default async function handler(req, res) {
  // CORS for subdomain requests
  const origin = req.headers.origin || ''
  const allowedOrigin = origin.endsWith('.togogo.me') || origin.includes('togogo.vercel.app') || origin.includes('localhost')
    ? origin
    : 'https://togogo.me'
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin)
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  await ensureSchema()

  const { subdomain } = req.query
  if (!subdomain) {
    return res.status(400).json({ error: 'subdomain parameter required' })
  }

  try {
    // Get store info
    const { rows: stores } = await sql`
      SELECT s.id, s.subdomain, s.full_domain, s.store_name, s.status, s.created_at,
             u.id AS owner_id, u.name AS owner_name, u.avatar_url AS owner_avatar, u.email AS owner_email
      FROM user_stores s
      JOIN users u ON u.id = s.user_id
      WHERE s.subdomain = ${subdomain} AND s.status = 'active'
    `

    if (!stores[0]) {
      return res.status(404).json({ error: 'Store not found' })
    }

    const store = stores[0]

    // Get the store owner's custom products
    const { rows: ownerProducts } = await sql`
      SELECT id, title, description, image, images, supplier, supplier_cost,
             sale_price, category, total_sold, created_at
      FROM user_products
      WHERE user_id = ${store.owner_id} AND is_active = true
      ORDER BY created_at DESC
    `

    let products = ownerProducts.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      image: p.image,
      images: p.images || [],
      price: parseFloat(p.sale_price) || 0,
      supplierCost: parseFloat(p.supplier_cost) || 0,
      category: p.category || 'General',
      totalSold: p.total_sold || 0,
      createdAt: p.created_at,
    }))

    // If the owner has no custom products, fetch live AliExpress products
    // so the store always has something to display
    if (products.length === 0) {
      try {
        console.log(`[Storefront] Store "${subdomain}" has no owner products — fetching AliExpress products`)
        const aliProducts = await searchAliExpress('', 1)
        if (aliProducts.length > 0) {
          products = aliProducts.slice(0, 100).map((p) => ({
            id: p.id,
            title: p.title,
            description: p.description,
            image: p.image,
            images: p.images || [],
            price: p.suggestedPrice || 0,
            supplierCost: p.cost || 0,
            category: p.category || 'General',
            totalSold: p.orders || 0,
            createdAt: new Date().toISOString(),
            supplier: 'AliExpress',
            sourceUrl: p.sourceUrl || '',
          }))
          console.log(`[Storefront] Loaded ${products.length} AliExpress products for "${subdomain}"`)
        } else {
          console.log(`[Storefront] AliExpress returned 0 products — check API keys`)
        }
      } catch (err) {
        console.error(`[Storefront] AliExpress fetch failed for "${subdomain}":`, err.message)
      }
    }

    // Get categories for filtering
    const categories = [...new Set(products.map((p) => p.category).filter(Boolean))]

    return res.json({
      store: {
        id: store.id,
        name: store.store_name,
        subdomain: store.subdomain,
        domain: store.full_domain,
        owner: store.owner_name || store.owner_email?.split('@')[0],
        ownerAvatar: store.owner_avatar,
        createdAt: store.created_at,
      },
      products,
      categories,
    })
  } catch (err) {
    console.error('Storefront API error:', err)
    return res.status(500).json({ error: 'Failed to load store' })
  }
}
