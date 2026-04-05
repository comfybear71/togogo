// Public storefront API — serves store info + products by subdomain
// No auth required — this is the customer-facing store
// Supports pagination: ?page=1&limit=20 for infinite scroll
import { sql, ensureSchema } from '../_lib/db.js'
import { searchAliExpress } from '../_lib/suppliers.js'
import { Redis } from '@upstash/redis'

// Redis caching (optional — works with Upstash REST API)
// Needs UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (https:// format)
// Falls back gracefully if not configured
let redis = null
try {
  const restUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
  const restToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN
  if (restUrl && restToken) {
    redis = new Redis({ url: restUrl, token: restToken })
  }
} catch { /* Redis optional — storefront works without it */ }

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
             s.theme_id,
             u.id AS owner_id, u.name AS owner_name, u.avatar_url AS owner_avatar, u.email AS owner_email
      FROM user_stores s
      JOIN users u ON u.id = s.user_id
      WHERE s.subdomain = ${subdomain} AND s.status = 'active'
    `

    if (!stores[0]) {
      return res.status(404).json({ error: 'Store not found' })
    }

    const store = stores[0]

    // Pagination params
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const limit = Math.min(60, Math.max(1, parseInt(req.query.limit) || 30))
    const offset = (page - 1) * limit

    // Try Redis cache first (cache per store+page, 2 min TTL)
    const cacheKey = `store:${subdomain}:p${page}:l${limit}`
    if (redis && page > 0) {
      try {
        const cached = await redis.get(cacheKey)
        if (cached) {
          console.log(`[Storefront] Cache hit: ${cacheKey}`)
          return res.json(typeof cached === 'string' ? JSON.parse(cached) : cached)
        }
      } catch { /* cache miss, continue */ }
    }

    // Get total product count
    const { rows: countRows } = await sql`
      SELECT COUNT(*) as total FROM user_products
      WHERE user_id = ${store.owner_id} AND is_active = true
    `
    const totalProducts = parseInt(countRows[0].total)

    // Get the store owner's products — paginated, stable sort by created_at
    const { rows: ownerProducts } = await sql`
      SELECT id, title, description, image, images, supplier, supplier_cost,
             sale_price, category, total_sold, created_at, supplier_product_id,
             product_rating, orders_count, original_price, discount_percent
      FROM user_products
      WHERE user_id = ${store.owner_id} AND is_active = true
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `

    let products = ownerProducts.map((p) => {
      // Safely parse images — could be array, string, or null from Postgres TEXT[]
      let images = p.images
      if (!images) images = []
      else if (typeof images === 'string') {
        try { images = JSON.parse(images) } catch { images = images.replace(/[{}]/g, '').split(',').filter(Boolean) }
      }
      if (!Array.isArray(images)) images = []
      return {
      id: p.id,
      supplierProductId: p.supplier_product_id || '',
      title: p.title,
      description: p.description,
      image: p.image || (images[0] || ''),
      images,
      price: parseFloat(p.sale_price) || 0,
      supplierCost: parseFloat(p.supplier_cost) || 0,
      supplierProductId: p.supplier_product_id || '',
      category: p.category || 'General',
      totalSold: p.total_sold || 0,
      rating: parseFloat(p.product_rating) || 0,
      ordersCount: p.orders_count || 0,
      originalPrice: parseFloat(p.original_price) || 0,
      discountPercent: p.discount_percent || 0,
      createdAt: p.created_at,
    }})

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

    // Get ALL categories with counts (not just current page)
    const { rows: catRows } = await sql`
      SELECT category, COUNT(*) as count FROM user_products
      WHERE user_id = ${store.owner_id} AND is_active = true
      GROUP BY category ORDER BY count DESC
    `
    const categories = catRows.map(r => ({ name: r.category || 'General', count: parseInt(r.count) }))

    const response = {
      store: {
        id: store.id,
        name: store.store_name,
        subdomain: store.subdomain,
        domain: store.full_domain,
        owner: store.owner_name || store.owner_email?.split('@')[0],
        ownerAvatar: store.owner_avatar,
        themeId: store.theme_id || 'midnight',
        createdAt: store.created_at,
      },
      products,
      categories,
      pagination: {
        page,
        limit,
        totalProducts,
        totalPages: Math.ceil(totalProducts / limit),
        hasMore: offset + products.length < totalProducts,
      },
    }

    // Cache in Redis (2 min TTL)
    if (redis) {
      try { await redis.set(cacheKey, JSON.stringify(response), { ex: 120 }) } catch { /* non-critical */ }
    }

    return res.json(response)
  } catch (err) {
    console.error('Storefront API error:', err)
    return res.status(500).json({ error: 'Failed to load store' })
  }
}
