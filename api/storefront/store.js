// Public storefront API — serves store info + products by subdomain
// No auth required — this is the customer-facing store
// Supports pagination: ?page=1&limit=20 for infinite scroll
import { sql } from '../_lib/db.js'
import { searchAliExpress } from '../_lib/suppliers.js'
import { getAudRate, usdToAud } from '../_lib/pricing.js'
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
  // Bust browser, CDN and Service Worker caches. This endpoint includes
  // a per-request shuffle for the default sort; any caching layer that
  // memoises the response defeats the shuffle. Customers Ctrl+Shift+R'd
  // on jum.togogo.me and saw the same products three times in a row
  // because the PWA NetworkFirst cache served the previous payload.
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { subdomain } = req.query
  if (!subdomain) {
    return res.status(400).json({ error: 'subdomain parameter required' })
  }

  try {
    // Get store info — `niches[]` (multi-niche array) gates which
    // products this storefront sees. Each AI Builder run appends to
    // that array; storefront filters by overlap so all accumulated
    // niches stay visible. Empty/NULL array = general store, sees
    // everything. Legacy `niche` column kept for display.
    const { rows: stores } = await sql`
      SELECT s.id, s.subdomain, s.full_domain, s.store_name, s.status, s.created_at,
             s.theme_id, s.niche, s.niches, s.markup_percent,
             u.id AS owner_id, u.name AS owner_name, u.avatar_url AS owner_avatar, u.email AS owner_email
      FROM user_stores s
      JOIN users u ON u.id = s.user_id
      WHERE s.subdomain = ${subdomain} AND s.status = 'active'
    `

    if (!stores[0]) {
      return res.status(404).json({ error: 'Store not found' })
    }

    const store = stores[0]

    // Per-store markup applied to every customer-facing price.
    // Stored sale_price in user_products is break-even (our AE wholesale
    // cost); the customer sees break_even × (1 + markup/100). All price
    // thresholds in this endpoint convert the customer-facing value back
    // to break-even space before querying.
    const markupPercent = parseFloat(store.markup_percent ?? 40) || 0
    const markupMultiplier = 1 + markupPercent / 100

    // Customers see AUD throughout. Store all prices come out of the DB in
    // USD (AE's native currency); we apply markup, then convert to AUD using
    // the live admin rate before sending to the frontend. Single source of
    // truth — the storefront page never multiplies by a rate itself.
    const audRate = await getAudRate()

    // Pagination params
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const limit = Math.min(60, Math.max(1, parseInt(req.query.limit) || 30))
    const offset = (page - 1) * limit
    const category = req.query.category || ''
    const priceRange = req.query.priceRange || ''
    // Default to 'featured' (= per-request shuffle). The frontend
    // omits the `sort` param when on Featured to keep URLs clean, so
    // unspecified MUST mean shuffle here. Previously defaulted to
    // 'newest' which was mapped to `ORDER BY created_at DESC` —
    // which is why customers refreshing saw the same hero products
    // every time even after we plumbed `random()` into the SQL.
    const sortBy = req.query.sort || 'featured'
    const search = req.query.search || ''

    // Build WHERE conditions — price thresholds are filter buckets the
    // customer sees ("Under A$10", "A$10–A$20" etc). The customer-facing
    // numbers are AUD-after-markup; sale_price in the DB is pre-markup
    // USD. Convert each threshold from AUD → USD-break-even before the
    // SQL comparison: (audThreshold / audRate / markupMultiplier).
    const t10s = (10 / audRate / markupMultiplier).toFixed(4)
    const t20s = (20 / audRate / markupMultiplier).toFixed(4)
    const t50s = (50 / audRate / markupMultiplier).toFixed(4)
    let whereExtra = ''
    // Single-product filter for deep-links (`/product/:id`). When set,
    // skips category/price/search/sort entirely so the response always
    // contains the requested product even if it would normally be
    // outside the active filter or off the current page. Strict UUID
    // gate so a junk param can't broaden the WHERE clause.
    const productId = req.query.id || ''
    if (productId && /^[0-9a-f-]{36}$/i.test(productId)) {
      whereExtra += ` AND id = '${productId}'`
    } else {
      if (category) whereExtra += ` AND category = '${category.replace(/'/g, "''")}'`
      if (priceRange === 'under10') whereExtra += ` AND sale_price < ${t10s}`
      else if (priceRange === '10to20') whereExtra += ` AND sale_price >= ${t10s} AND sale_price < ${t20s}`
      else if (priceRange === '20to50') whereExtra += ` AND sale_price >= ${t20s} AND sale_price < ${t50s}`
      else if (priceRange === 'over50') whereExtra += ` AND sale_price >= ${t50s}`
      // Word-by-word search across title + description + category.
      // Each word in the query must appear SOMEWHERE in the searchable
      // text — not necessarily contiguous and not in the same order.
      // So "tiktok ring" matches a product titled "Selfie Ring Light
      // for TikTok Phone Holder" even though the literal substring
      // "tiktok ring" isn't in the title. Common words ≤2 chars are
      // dropped (the/of/in/etc) so a single noisy word doesn't ruin
      // the result. Each word is sanitised individually for SQL.
      if (search) {
        const words = search.toLowerCase()
          .replace(/[%_]/g, ' ')           // strip SQL wildcard chars
          .split(/\s+/)
          .map(w => w.replace(/'/g, "''")) // SQL-escape per word
          .filter(w => w.length > 2)       // drop noise
        for (const w of words) {
          whereExtra += ` AND LOWER(COALESCE(title, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(category, '')) LIKE '%${w}%'`
        }
        // If every word was noise (e.g. user typed "of in"), fall
        // back to a basic title substring on the original input so
        // the search isn't silently a no-op.
        if (words.length === 0) {
          whereExtra += ` AND LOWER(title) LIKE '%${search.toLowerCase().replace(/'/g, "''").replace(/[%_]/g, '')}%'`
        }
      }
    }

    // Build ORDER BY. Default 'featured' is a true per-request random
    // shuffle so every page load surfaces a different mix of products
    // — date-seeded versions felt static to customers refreshing
    // throughout the day, since all visitors saw the same daily order.
    // Explicit user sorts (price, rating, bestsellers, discount,
    // newest) bypass the shuffle and keep their natural ordering.
    let orderBy = 'random()'
    let isShuffled = true
    if (sortBy === 'price-low') { orderBy = 'sale_price ASC'; isShuffled = false }
    else if (sortBy === 'price-high') { orderBy = 'sale_price DESC'; isShuffled = false }
    else if (sortBy === 'bestsellers') { orderBy = 'COALESCE(orders_count, 0) DESC, COALESCE(total_sold, 0) DESC'; isShuffled = false }
    else if (sortBy === 'rating') { orderBy = 'COALESCE(product_rating, 0) DESC'; isShuffled = false }
    else if (sortBy === 'discount') { orderBy = 'COALESCE(discount_percent, 0) DESC'; isShuffled = false }
    else if (sortBy === 'newest') { orderBy = 'created_at DESC'; isShuffled = false }

    // Try Redis cache (cache per store+page+filters, 2 min TTL).
    // SKIP the cache when shuffling — caching a random order would
    // freeze it for every visitor who hits within the TTL, defeating
    // the "fresh on every refresh" promise. Other sorts still cache.
    const nichesForCacheKey = (Array.isArray(store.niches) ? store.niches : []).slice().sort().join(',')
    const cacheKey = `store:${subdomain}:n${nichesForCacheKey || store.niche || ''}:p${page}:l${limit}:c${category}:pr${priceRange}:s${sortBy}:q${search}`
    if (redis && page > 0 && !isShuffled) {
      try {
        const cached = await redis.get(cacheKey)
        if (cached) {
          console.log(`[Storefront] Cache hit: ${cacheKey}`)
          return res.json(typeof cached === 'string' ? JSON.parse(cached) : cached)
        }
      } catch { /* cache miss, continue */ }
    }

    // Tenant isolation: every storefront only sees products owned by
    // its store's user_id. Without this filter, any AI Builder run on
    // store A that happened to use the same niche as store B causes
    // store A's products to bleed into store B's storefront — which
    // is exactly what Stuart spotted in production. Niche filter is
    // still applied on top so a single owner with multiple niches can
    // still narrow the catalogue.
    const ownerWhere = ` AND user_id = '${store.owner_id}'`
    //
    // Backward-compat: if niches[] is empty but legacy `niche` is set
    // (only happens on a brand-new store before db.js backfill ran),
    // fall back to the single-niche behaviour.
    const storeNiches = Array.isArray(store.niches) && store.niches.length > 0
      ? store.niches
      : (store.niche ? [store.niche] : [])
    const nicheWhere = storeNiches.length > 0
      ? ` AND niches && ARRAY[${storeNiches.map(n => `'${String(n).replace(/'/g, "''")}'`).join(',')}]::TEXT[]`
      : ''

    // Price integrity gate: only surface products that have been priced
    // under the new USD+variants model. Three checks because we've been
    // burned:
    //   1. variants_updated_at set  → rebuild cron has touched the row
    //   2. price_currency = 'USD'   → not an old AUD-mislabelled row
    //   3. min_variant_price_usd>0  → we actually have a real variant price,
    //                                 not just a timestamp from a skipped
    //                                 rebuild attempt
    const pricedWhere = ` AND variants_updated_at IS NOT NULL AND price_currency = 'USD' AND COALESCE(min_variant_price_usd, 0) > 0`

    // Get total product count (with filters applied)
    const countResult = await sql.query(
      `SELECT COUNT(*) as total FROM (
        SELECT DISTINCT ON (supplier_product_id) id, sale_price, category, title
        FROM user_products WHERE is_active = true${ownerWhere}${nicheWhere}${pricedWhere}
        ORDER BY supplier_product_id, created_at DESC
      ) deduped WHERE true${whereExtra}`,
      []
    )
    const totalProducts = parseInt(countResult.rows[0].total)

    // Get the store owner's products — paginated with filters and sort
    // Single-product deep-link: bypass the niche filter and the priced
    // gate entirely. The product is referenced by an explicit UUID so
    // the customer is asking for THAT product specifically — niche
    // misalignment (legacy product imported under a different niche)
    // or stale variant pricing shouldn't hide it from a shared link.
    // The detail view will fetch live AE pricing on render anyway.
    let productResult
    if (productId && /^[0-9a-f-]{36}$/i.test(productId)) {
      // Tenant isolation: scope deep-link lookups to the requesting
      // store's owner so that an attacker can't enumerate UUIDs and
      // reach products that belong to a different shop. The product
      // also has to be active.
      productResult = await sql.query(
        `SELECT id, title, description, image, images, supplier, supplier_cost,
                sale_price, shipping_cost, price_currency, category, total_sold,
                created_at, supplier_product_id,
                product_rating, orders_count, original_price, discount_percent, in_stock,
                variants, min_variant_price_usd, max_variant_price_usd, shipping_usd, variants_updated_at
         FROM user_products
         WHERE id = $1 AND user_id = $2 AND is_active = true
         LIMIT 1`,
        [productId, store.owner_id]
      )
    } else {
      productResult = await sql.query(
        `SELECT * FROM (
          SELECT DISTINCT ON (supplier_product_id) id, title, description, image, images, supplier, supplier_cost,
                 sale_price, shipping_cost, price_currency, category, total_sold, created_at, supplier_product_id,
                 product_rating, orders_count, original_price, discount_percent, in_stock,
                 variants, min_variant_price_usd, max_variant_price_usd, shipping_usd, variants_updated_at
          FROM user_products
          WHERE is_active = true${ownerWhere}${nicheWhere}${pricedWhere}
          ORDER BY supplier_product_id, created_at DESC
        ) products
        WHERE true${whereExtra}
        ORDER BY ${orderBy}
        LIMIT $1 OFFSET $2`,
        [limit, offset]
      )
    }
    const ownerProducts = productResult.rows

    let products = ownerProducts.map((p) => {
      // Safely parse images — could be array, string, or null from Postgres TEXT[]
      let images = p.images
      if (!images) images = []
      else if (typeof images === 'string') {
        try { images = JSON.parse(images) } catch { images = images.replace(/[{}]/g, '').split(',').filter(Boolean) }
      }
      if (!Array.isArray(images)) images = []
      // Stored sale_price is break-even (our AE cost in USD). Apply the
      // store's markup, then convert USD → AUD with the live admin rate
      // so every customer-facing field (price, originalPrice) is AUD.
      // breakEvenUsd is preserved for debugging / commission math on the
      // server side.
      const breakEvenUsd = parseFloat(p.sale_price) || 0
      const markedUsd = Math.round(breakEvenUsd * markupMultiplier * 100) / 100
      const markedPrice = usdToAud(markedUsd, audRate)
      const breakEvenOriginal = parseFloat(p.original_price) || 0
      const markedOriginal = breakEvenOriginal > 0
        ? usdToAud(breakEvenOriginal * markupMultiplier, audRate)
        : 0
      return {
      id: p.id,
      supplierProductId: p.supplier_product_id || '',
      title: p.title,
      description: p.description,
      image: p.image || (images[0] || ''),
      images,
      price: markedPrice,
      breakEvenUsd,
      currency: 'AUD',
      shipping: parseFloat(p.shipping_usd ?? p.shipping_cost) || 0,
      supplierCost: parseFloat(p.supplier_cost) || 0,
      supplierProductId: p.supplier_product_id || '',
      // Real per-SKU variants — let the frontend render color/size picker
      variants: Array.isArray(p.variants) ? p.variants
        : (typeof p.variants === 'string' ? (() => { try { return JSON.parse(p.variants) } catch { return [] } })() : []),
      minPriceUsd: parseFloat(p.min_variant_price_usd) || 0,
      maxPriceUsd: parseFloat(p.max_variant_price_usd) || 0,
      variantsUpdatedAt: p.variants_updated_at || null,
      category: p.category || 'General',
      totalSold: p.total_sold || 0,
      rating: parseFloat(p.product_rating) || 0,
      ordersCount: p.orders_count || 0,
      originalPrice: markedOriginal,
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
            // Live AliExpress fallback prices come back in USD; convert
            // to AUD for the storefront's AUD-only display contract.
            price: usdToAud(p.suggestedPrice || 0, audRate),
            currency: 'AUD',
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
        FROM user_products WHERE is_active = true${ownerWhere}${nicheWhere}${pricedWhere}
        ORDER BY supplier_product_id, created_at DESC
      ) deduped
      GROUP BY category ORDER BY count DESC`,
      []
    )
    const categories = catRows.map(r => ({ name: r.category || 'General', count: parseInt(r.count) }))

    // Get price range counts (niche-gated). Reuses t10s/t20s/t50s from above.
    const { rows: priceRows } = await sql.query(
      `SELECT
        COUNT(*) FILTER (WHERE sale_price < ${t10s}) as under10,
        COUNT(*) FILTER (WHERE sale_price >= ${t10s} AND sale_price < ${t20s}) as range10to20,
        COUNT(*) FILTER (WHERE sale_price >= ${t20s} AND sale_price < ${t50s}) as range20to50,
        COUNT(*) FILTER (WHERE sale_price >= ${t50s}) as over50
      FROM (
        SELECT DISTINCT ON (supplier_product_id) sale_price, supplier_product_id
        FROM user_products WHERE is_active = true${ownerWhere}${nicheWhere}${pricedWhere}
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

    // Markup was already applied inside the product map above (on the
    // `price` field the frontend reads). No second pass needed.

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
        markupPercent,
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

    // Cache in Redis (2 min TTL). Skip for shuffled responses so the
    // random order doesn't get frozen for every subsequent visitor.
    if (redis && !isShuffled) {
      try { await redis.set(cacheKey, JSON.stringify(response), { ex: 120 }) } catch { /* non-critical */ }
    }

    return res.json(response)
  } catch (err) {
    console.error('Storefront API error:', err)
    return res.status(500).json({ error: 'Failed to load store' })
  }
}
