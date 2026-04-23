// Public storefront API — serves store info + products by subdomain
// No auth required — this is the customer-facing store
// Supports pagination: ?page=1&limit=20 for infinite scroll
import { sql } from '../_lib/db.js'
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

  const { subdomain } = req.query
  if (!subdomain) {
    return res.status(400).json({ error: 'subdomain parameter required' })
  }

  try {
    // Get store info — includes `niche` which gates which products this
    // storefront sees (NULL niche = general store, sees everything)
    const { rows: stores } = await sql`
      SELECT s.id, s.subdomain, s.full_domain, s.store_name, s.status, s.created_at,
             s.theme_id, s.niche,
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
    const category = req.query.category || ''
    const priceRange = req.query.priceRange || ''
    const sortBy = req.query.sort || 'newest'
    const search = req.query.search || ''

    // Build WHERE conditions
    let whereExtra = ''
    if (category) whereExtra += ` AND category = '${category.replace(/'/g, "''")}'`
    if (priceRange === 'under10') whereExtra += ' AND sale_price < 10'
    else if (priceRange === '10to20') whereExtra += ' AND sale_price >= 10 AND sale_price < 20'
    else if (priceRange === '20to50') whereExtra += ' AND sale_price >= 20 AND sale_price < 50'
    else if (priceRange === 'over50') whereExtra += ' AND sale_price >= 50'
    if (search) whereExtra += ` AND LOWER(title) LIKE '%${search.toLowerCase().replace(/'/g, "''").replace(/%/g, '')}%'`

    // Build ORDER BY
    let orderBy = 'created_at DESC'
    if (sortBy === 'price-low') orderBy = 'sale_price ASC'
    else if (sortBy === 'price-high') orderBy = 'sale_price DESC'
    else if (sortBy === 'bestsellers') orderBy = 'COALESCE(orders_count, 0) DESC, COALESCE(total_sold, 0) DESC'
    else if (sortBy === 'rating') orderBy = 'COALESCE(product_rating, 0) DESC'
    else if (sortBy === 'discount') orderBy = 'COALESCE(discount_percent, 0) DESC'

    // Try Redis cache (cache per store+page+filters, 2 min TTL)
    const cacheKey = `store:${subdomain}:p${page}:l${limit}:c${category}:pr${priceRange}:s${sortBy}:q${search}`
    if (redis && page > 0) {
      try {
        const cached = await redis.get(cacheKey)
        if (cached) {
          console.log(`[Storefront] Cache hit: ${cacheKey}`)
          return res.json(typeof cached === 'string' ? JSON.parse(cached) : cached)
        }
      } catch { /* cache miss, continue */ }
    }

    // Niche gate: a store with a `niche` set only sees products tagged with
    // that niche. NULL-niche stores (your pre-existing general stores) see
    // everything. Uses GIN index on user_products.niches for speed.
    const nicheWhere = store.niche
      ? ` AND niches @> ARRAY['${String(store.niche).replace(/'/g, "''")}']::TEXT[]`
      : ''

    // Get total product count (with filters applied)
    const countResult = await sql.query(
      `SELECT COUNT(*) as total FROM (
        SELECT DISTINCT ON (supplier_product_id) id, sale_price, category, title
        FROM user_products WHERE is_active = true${nicheWhere}
        ORDER BY supplier_product_id, created_at DESC
      ) deduped WHERE true${whereExtra}`,
      []
    )
    const totalProducts = parseInt(countResult.rows[0].total)

    // Get the store owner's products — paginated with filters and sort
    const productResult = await sql.query(
      `SELECT * FROM (
        SELECT DISTINCT ON (supplier_product_id) id, title, description, image, images, supplier, supplier_cost,
               sale_price, shipping_cost, category, total_sold, created_at, supplier_product_id,
               product_rating, orders_count, original_price, discount_percent, in_stock
        FROM user_products
        WHERE is_active = true${nicheWhere}
        ORDER BY supplier_product_id, created_at DESC
      ) products
      WHERE true${whereExtra}
      ORDER BY ${orderBy}
      LIMIT $1 OFFSET $2`,
      [limit, offset]
    )
    const ownerProducts = productResult.rows

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
      shipping: parseFloat(p.shipping_cost) || 0,
      supplierCost: parseFloat(p.supplier_cost) || 0,
      supplierProductId: p.supplier_product_id || '',
      category: p.category || 'General',
      totalSold: p.total_sold || 0,
      rating: parseFloat(p.product_rating) || 0,
      ordersCount: p.orders_count || 0,
      originalPrice: parseFloat(p.original_price) || 0,
      discountPercent: p.discount_percent || 0,
      inStock: p.in_stock !== false,
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

    // Get ALL categories with counts (not just current page). Niche-gated
    // so the sidebar only shows categories that have matching products.
    const { rows: catRows } = await sql.query(
      `SELECT category, COUNT(*) as count FROM (
        SELECT DISTINCT ON (supplier_product_id) category, supplier_product_id
        FROM user_products WHERE is_active = true${nicheWhere}
        ORDER BY supplier_product_id, created_at DESC
      ) deduped
      GROUP BY category ORDER BY count DESC`,
      []
    )
    const categories = catRows.map(r => ({ name: r.category || 'General', count: parseInt(r.count) }))

    // Get price range counts (niche-gated)
    const { rows: priceRows } = await sql.query(
      `SELECT
        COUNT(*) FILTER (WHERE sale_price < 10) as under10,
        COUNT(*) FILTER (WHERE sale_price >= 10 AND sale_price < 20) as range10to20,
        COUNT(*) FILTER (WHERE sale_price >= 20 AND sale_price < 50) as range20to50,
        COUNT(*) FILTER (WHERE sale_price >= 50) as over50
      FROM (
        SELECT DISTINCT ON (supplier_product_id) sale_price, supplier_product_id
        FROM user_products WHERE is_active = true${nicheWhere}
        ORDER BY supplier_product_id, created_at DESC
      ) deduped`,
      []
    )
    const priceRanges = priceRows[0] ? {
      under10: parseInt(priceRows[0].under10) || 0,
      '10to20': parseInt(priceRows[0].range10to20) || 0,
      '20to50': parseInt(priceRows[0].range20to50) || 0,
      over50: parseInt(priceRows[0].over50) || 0,
    } : {}

    // Read shipping fee from admin settings
    let shippingFee = 0
    try {
      const { rows: feeRows } = await sql`SELECT value FROM admin_settings WHERE key = 'shipping_fee_aud'`
      if (feeRows[0]) shippingFee = parseFloat(feeRows[0].value) || 0
    } catch { /* default 0 */ }

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
      priceRanges,
      shippingFee,
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
