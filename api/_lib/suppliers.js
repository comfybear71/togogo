// AliExpress Affiliate API integration for ToGoGo
// Uses the official AE-Affiliate APIs (not DS APIs which require OAuth)
// Only needs ALIEXPRESS_APP_KEY + ALIEXPRESS_APP_SECRET
import crypto from 'crypto'

// ============================================
// NSFW / INAPPROPRIATE CONTENT FILTER
// ============================================
const BLOCKED_PHRASES = [
  'sex toy', 'sex doll', 'sex machine', 'sex toys',
  'adult toy', 'adult toys', 'erotic toy',
  'love doll', 'blow up doll', 'real doll',
  'butt plug', 'cock ring', 'nipple clamp',
  'sexy underwear', 'sexy lingerie',
  'prostate massag',
]
const BLOCKED_WORDS = [
  'vibrator', 'dildo', 'masturbat', 'bondage', 'fleshlight',
  'fetish', 'stripper',
]

export function filterNSFW(products) {
  return products.filter(p => {
    const text = ((p.title || '') + ' ' + (p.description || '') + ' ' + (p.name || '')).toLowerCase()
    if (BLOCKED_PHRASES.some(phrase => text.includes(phrase))) return false
    for (const word of BLOCKED_WORDS) {
      const regex = new RegExp(`\\b${word}`, 'i')
      if (regex.test(text)) return false
    }
    return true
  })
}

// ============================================
// ALIEXPRESS AFFILIATE API — Request Signing & Calling
// ============================================

function signRequest(params, appSecret) {
  // Sort params alphabetically, concatenate key+value pairs, HMAC-SHA256 with appSecret
  const sorted = Object.keys(params)
    .filter(k => k !== 'sign')
    .sort()
    .map(k => `${k}${params[k]}`)
    .join('')

  return crypto
    .createHmac('sha256', appSecret)
    .update(sorted)
    .digest('hex')
    .toUpperCase()
}

async function callAliExpressAPI(method, params = {}) {
  const appKey = process.env.ALIEXPRESS_APP_KEY
  const appSecret = process.env.ALIEXPRESS_APP_SECRET
  if (!appKey || !appSecret) {
    console.error('[AliExpress] Missing ALIEXPRESS_APP_KEY or ALIEXPRESS_APP_SECRET')
    return null
  }

  const baseParams = {
    app_key: appKey,
    method,
    sign_method: 'hmac-sha256',
    timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
    format: 'json',
    v: '2.0',
    ...params,
  }

  baseParams.sign = signRequest(baseParams, appSecret)

  const qs = new URLSearchParams(baseParams).toString()
  const url = `https://api-sg.aliexpress.com/sync?${qs}`

  console.log(`[AliExpress] Calling ${method}`)

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })

  if (!response.ok) {
    const text = await response.text()
    console.error(`[AliExpress] HTTP ${response.status}: ${text.slice(0, 500)}`)
    throw new Error(`AliExpress API HTTP ${response.status}`)
  }

  const data = await response.json()

  // Check for API-level errors
  if (data.error_response) {
    console.error(`[AliExpress] API Error:`, JSON.stringify(data.error_response))
    throw new Error(`AliExpress API: ${data.error_response.msg || data.error_response.sub_msg || 'Unknown error'}`)
  }

  return data
}

// ============================================
// PRODUCT QUERY — aliexpress.affiliate.product.query
// Search/browse products with keywords, categories, pagination
// Returns: product_id, title, images, prices, affiliate URL, etc.
// ============================================

// In-memory cache for product queries
let productCache = new Map()
let productCacheTime = new Map()
const CACHE_TTL = 10 * 60 * 1000 // 10 minutes

export async function queryProducts({ keywords, categoryId, page = 1, pageSize = 50, sort, minPrice, maxPrice } = {}) {
  const cacheKey = `query:${keywords || ''}:${categoryId || ''}:${page}:${sort || ''}`
  const cached = productCache.get(cacheKey)
  if (cached && (Date.now() - productCacheTime.get(cacheKey)) < CACHE_TTL) {
    return cached
  }

  const params = {
    target_currency: 'AUD',
    target_language: 'EN',
    page_no: String(page),
    page_size: String(Math.min(pageSize, 50)), // API max is 50
    tracking_id: process.env.ALIEXPRESS_TRACKING_ID || process.env.ALIEXPRESS_APP_KEY,
  }

  if (keywords) params.keywords = keywords
  if (categoryId) params.category_ids = String(categoryId)
  if (sort) params.sort = sort // SALE_PRICE_ASC, SALE_PRICE_DESC, LAST_VOLUME_DESC, etc.
  if (minPrice) params.min_sale_price = String(minPrice)
  if (maxPrice) params.max_sale_price = String(maxPrice)

  try {
    const data = await callAliExpressAPI('aliexpress.affiliate.product.query', params)

    const respBody = data?.aliexpress_affiliate_product_query_response?.resp_result
    if (!respBody) {
      console.error('[AliExpress] product.query — no resp_result in response:', JSON.stringify(data).slice(0, 500))
      return { products: [], total: 0, page }
    }

    if (respBody.resp_code !== 200) {
      console.error(`[AliExpress] product.query error code ${respBody.resp_code}: ${respBody.resp_msg}`)
      return { products: [], total: 0, page }
    }

    const result = respBody.result || {}
    const rawProducts = result.products?.product || []
    const total = result.total_record_count || rawProducts.length

    console.log(`[AliExpress] product.query returned ${rawProducts.length} products (page ${page}, total ${total})`)

    const products = rawProducts.map(normaliseAffiliateProduct)

    const output = { products, total, page }
    productCache.set(cacheKey, output)
    productCacheTime.set(cacheKey, Date.now())
    return output
  } catch (err) {
    console.error('[AliExpress] product.query failed:', err.message)
    return { products: [], total: 0, page }
  }
}

// ============================================
// HOT PRODUCTS — aliexpress.affiliate.hotproduct.query
// Returns trending/bestselling products
// ============================================

export async function queryHotProducts({ keywords, categoryId, page = 1, pageSize = 50, sort } = {}) {
  const cacheKey = `hot:${keywords || ''}:${categoryId || ''}:${page}`
  const cached = productCache.get(cacheKey)
  if (cached && (Date.now() - productCacheTime.get(cacheKey)) < CACHE_TTL) {
    return cached
  }

  const params = {
    target_currency: 'AUD',
    target_language: 'EN',
    page_no: String(page),
    page_size: String(Math.min(pageSize, 50)),
    tracking_id: process.env.ALIEXPRESS_TRACKING_ID || process.env.ALIEXPRESS_APP_KEY,
  }

  if (keywords) params.keywords = keywords
  if (categoryId) params.category_ids = String(categoryId)
  if (sort) params.sort = sort

  try {
    const data = await callAliExpressAPI('aliexpress.affiliate.hotproduct.query', params)

    const respBody = data?.aliexpress_affiliate_hotproduct_query_response?.resp_result
    if (!respBody) {
      console.error('[AliExpress] hotproduct.query — no resp_result:', JSON.stringify(data).slice(0, 500))
      return { products: [], total: 0, page }
    }

    if (respBody.resp_code !== 200) {
      console.error(`[AliExpress] hotproduct.query error code ${respBody.resp_code}: ${respBody.resp_msg}`)
      return { products: [], total: 0, page }
    }

    const result = respBody.result || {}
    const rawProducts = result.products?.product || []
    const total = result.total_record_count || rawProducts.length

    console.log(`[AliExpress] hotproduct.query returned ${rawProducts.length} products (page ${page}, total ${total})`)

    const products = rawProducts.map(normaliseAffiliateProduct)

    const output = { products, total, page }
    productCache.set(cacheKey, output)
    productCacheTime.set(cacheKey, Date.now())
    return output
  } catch (err) {
    console.error('[AliExpress] hotproduct.query failed:', err.message)
    return { products: [], total: 0, page }
  }
}

// ============================================
// PRODUCT DETAILS — aliexpress.affiliate.productdetail.get
// Full details: HTML description, ALL images, specs, shipping, etc.
// ============================================

export async function getProductDetails(productIds) {
  if (!productIds || productIds.length === 0) return []

  // API accepts up to 50 product IDs at once
  const ids = Array.isArray(productIds) ? productIds : [productIds]
  const batches = []
  for (let i = 0; i < ids.length; i += 50) {
    batches.push(ids.slice(i, i + 50))
  }

  const allDetails = []

  for (const batch of batches) {
    try {
      const params = {
        product_ids: batch.join(','),
        target_currency: 'AUD',
        target_language: 'EN',
        tracking_id: process.env.ALIEXPRESS_TRACKING_ID || process.env.ALIEXPRESS_APP_KEY,
      }

      const data = await callAliExpressAPI('aliexpress.affiliate.productdetail.get', params)

      const respBody = data?.aliexpress_affiliate_productdetail_get_response?.resp_result
      if (!respBody || respBody.resp_code !== 200) {
        console.error(`[AliExpress] productdetail.get error:`, respBody?.resp_msg || 'no response')
        continue
      }

      const rawProducts = respBody.result?.products?.product || []
      console.log(`[AliExpress] productdetail.get returned ${rawProducts.length} detailed products`)

      for (const p of rawProducts) {
        allDetails.push(normaliseDetailProduct(p))
      }
    } catch (err) {
      console.error('[AliExpress] productdetail.get failed:', err.message)
    }

    // Small delay between batches to respect rate limits
    if (batches.length > 1) {
      await new Promise(r => setTimeout(r, 200))
    }
  }

  return allDetails
}

// ============================================
// NORMALISE — Affiliate product query response
// ============================================

function normaliseAffiliateProduct(p) {
  const cost = parseFloat(p.target_sale_price || p.app_sale_price || '0')
  const originalPrice = parseFloat(p.target_original_price || p.original_price || '0')
  const suggestedPrice = Math.ceil(cost * 2.5 * 100) / 100

  const image = p.product_main_image_url || ''
  const smallImages = p.product_small_image_urls?.string || []

  return {
    id: `ae_${p.product_id}`,
    productId: String(p.product_id),
    title: p.product_title || '',
    description: p.product_title || '',
    image,
    images: [image, ...smallImages].filter(Boolean),
    cost,
    originalPrice,
    shipping: 0,
    totalCost: cost,
    suggestedPrice,
    suggestedMargin: Math.round((suggestedPrice - cost) * 100) / 100,
    deliveryDays: p.ship_to_days || 14,
    supplier: 'AliExpress',
    supplierLogo: '🛒',
    sourceUrl: p.product_detail_url || p.promotion_link || '',
    affiliateUrl: p.promotion_link || '',
    minOrderQty: 1,
    category: p.first_level_category_name || p.second_level_category_name || '',
    categoryId: p.first_level_category_id || p.category_id || '',
    rating: p.evaluate_rate ? parseFloat(String(p.evaluate_rate).replace('%', '')) / 20 : null,
    orders: p.lastest_volume || 0,
    discount: originalPrice > cost ? Math.round((1 - cost / originalPrice) * 100) : 0,
    commission: p.sale_price_commission || '',
    _live: true,
  }
}

// ============================================
// NORMALISE — Product detail response (richer data)
// ============================================

function normaliseDetailProduct(p) {
  const base = normaliseAffiliateProduct(p)

  // productdetail.get returns additional fields
  return {
    ...base,
    htmlDescription: p.product_video_url ? `<video src="${p.product_video_url}"></video>` : '',
    videoUrl: p.product_video_url || '',
    // All images: main + small images array
    images: [
      p.product_main_image_url,
      ...(p.product_small_image_urls?.string || []),
    ].filter(Boolean),
  }
}

// ============================================
// SEARCH — Main search function used by the app
// ============================================

export async function searchAliExpress(query, page = 1) {
  const appKey = process.env.ALIEXPRESS_APP_KEY
  if (!appKey) {
    console.error('[AliExpress] searchAliExpress: No ALIEXPRESS_APP_KEY configured')
    return []
  }

  try {
    // If no query, get hot/trending products
    if (!query || query.trim() === '') {
      const result = await queryHotProducts({ page, pageSize: 50 })
      return filterNSFW(result.products)
    }

    // Search with keywords
    const result = await queryProducts({ keywords: query, page, pageSize: 50, sort: 'LAST_VOLUME_DESC' })
    return filterNSFW(result.products)
  } catch (err) {
    console.error('[AliExpress] searchAliExpress failed:', err.message)
    return []
  }
}

// ============================================
// FETCH BULK PRODUCTS — Paginated fetching across categories
// Used by cron jobs or manual triggers to build product catalog
// ============================================

export async function fetchBulkProducts({ maxProducts = 1500 } = {}) {
  const appKey = process.env.ALIEXPRESS_APP_KEY
  if (!appKey) {
    console.error('[AliExpress] fetchBulkProducts: No API key')
    return []
  }

  const allProducts = []
  const seen = new Set()

  // Search terms to cover different categories
  const searchTerms = [
    '', // hot products (no keyword)
    'phone case', 'wireless earbuds', 'led light', 'charger',
    'sunglasses', 'watch', 'necklace', 'dress',
    'kitchen', 'home decor', 'organiser',
    'makeup', 'skincare', 'beauty',
    'dog toy', 'pet', 'cat',
    'fitness', 'water bottle', 'yoga',
    'car accessories', 'dash cam',
    'toy', 'puzzle', 'kids',
  ]

  for (const term of searchTerms) {
    if (allProducts.length >= maxProducts) break

    // Fetch up to 3 pages per term
    for (let page = 1; page <= 3; page++) {
      if (allProducts.length >= maxProducts) break

      try {
        const result = term === ''
          ? await queryHotProducts({ page, pageSize: 50 })
          : await queryProducts({ keywords: term, page, pageSize: 50, sort: 'LAST_VOLUME_DESC' })

        for (const p of result.products) {
          if (!seen.has(p.productId)) {
            seen.add(p.productId)
            allProducts.push(p)
          }
        }

        // If fewer than 50 results, no more pages
        if (result.products.length < 50) break

        // Rate limit: small delay between pages
        await new Promise(r => setTimeout(r, 300))
      } catch (err) {
        console.error(`[AliExpress] Bulk fetch error (term="${term}", page=${page}):`, err.message)
        break
      }
    }
  }

  console.log(`[AliExpress] fetchBulkProducts: collected ${allProducts.length} unique products`)
  return filterNSFW(allProducts)
}

// ============================================
// PRICE COMPARISON — Group same/similar products
// ============================================
export function groupByProduct(products) {
  const normalise = (title) => title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s*(from aliexpress).*$/i, '')

  const groups = new Map()

  for (const product of products) {
    const key = normalise(product.title)
    if (groups.has(key)) {
      groups.get(key).push(product)
    } else {
      groups.set(key, [product])
    }
  }

  const result = []
  for (const [, group] of groups) {
    if (group.length > 1) {
      group.sort((a, b) => a.totalCost - b.totalCost)
      group[0]._bestDeal = true
      const cheapest = group[0].totalCost
      for (const p of group) {
        p._supplierCount = group.length
        p._alternatives = group
          .filter(alt => alt.id !== p.id)
          .map(alt => ({
            id: alt.id,
            supplier: alt.supplier,
            totalCost: alt.totalCost,
            deliveryDays: alt.deliveryDays,
          }))
        if (p.totalCost > cheapest) {
          p._savings = Math.round((p.totalCost - cheapest) * 100) / 100
        }
      }
    }
    result.push(...group)
  }

  return result
}

// ============================================
// SUPPLIER SEARCH MAP & FILTERING
// ============================================
const SUPPLIER_SEARCH_MAP = {
  'AliExpress': (q, page) => searchAliExpress(q, page),
}

export function parseSuppliers(suppliersParam) {
  if (!suppliersParam) return Object.keys(SUPPLIER_SEARCH_MAP)
  return suppliersParam.split(',').filter(s => SUPPLIER_SEARCH_MAP[s])
}

// ============================================
// SEARCH ALL SUPPLIERS
// ============================================
export async function searchAllSuppliers(query, page = 1, suppliersParam) {
  const activeSuppliers = parseSuppliers(suppliersParam)

  const results = await Promise.allSettled(
    activeSuppliers.map(s => SUPPLIER_SEARCH_MAP[s](query, page))
  )

  let products = results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value)

  const hasLiveData = results.some(r =>
    r.status === 'fulfilled' && r.value.length > 0 && r.value[0]._live
  )

  return { products, hasLiveData }
}

// ============================================
// TRENDING TERMS
// ============================================
export const TRENDING_TERMS = {
  '': ['phone case', 'led light', 't-shirt', 'jewellery', 'mug'],
  electronics: ['wireless earbuds', 'phone case', 'led strip light', 'portable charger'],
  fashion: ['sunglasses', 'watch', 'jewellery', 'necklace'],
  home: ['led light', 'organiser', 'kitchen gadget', 'pillow'],
  beauty: ['makeup brush', 'skincare', 'hair accessories', 'beauty'],
  toys: ['fidget toy', 'puzzle', 'RC car', 'plush toy'],
  sports: ['water bottle', 'yoga mat', 'resistance band', 'gym bag'],
  pets: ['dog toy', 'pet bed', 'cat toy', 'pet bowl'],
  automotive: ['car phone mount', 'car light', 'car organiser', 'dash cam'],
}

// ============================================
// CATEGORIES
// ============================================
export const CATEGORIES = [
  { id: 'electronics', name: 'Electronics & Gadgets', emoji: '📱', popular: true },
  { id: 'fashion', name: 'Fashion & Accessories', emoji: '👗', popular: true },
  { id: 'home', name: 'Home & Garden', emoji: '🏡', popular: true },
  { id: 'beauty', name: 'Beauty & Health', emoji: '💄', popular: true },
  { id: 'toys', name: 'Toys & Hobbies', emoji: '🎮', popular: false },
  { id: 'sports', name: 'Sports & Outdoors', emoji: '⚽', popular: false },
  { id: 'pets', name: 'Pet Supplies', emoji: '🐾', popular: false },
  { id: 'automotive', name: 'Automotive', emoji: '🚗', popular: false },
]

// ============================================
// ALL SUPPLIERS (for frontend filter UI)
// ============================================
export const ALL_SUPPLIERS = [
  { value: '', label: 'All Suppliers' },
  { value: 'AliExpress', label: '🛒 AliExpress', type: 'general' },
]
