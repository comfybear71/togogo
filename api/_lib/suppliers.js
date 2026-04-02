// Shared supplier logic for Vercel serverless functions
// Searches ALL suppliers through ToGoGo's master API keys
// Users never need their own supplier accounts
import crypto from 'crypto'
import { sql } from './db.js'

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
// These are checked as whole words (word boundary matching)
const BLOCKED_WORDS = [
  'vibrator', 'dildo', 'masturbat', 'bondage', 'fleshlight',
  'fetish', 'stripper',
]

export function filterNSFW(products) {
  return products.filter(p => {
    const text = ((p.title || '') + ' ' + (p.description || '') + ' ' + (p.name || '')).toLowerCase()
    // Check exact phrases
    if (BLOCKED_PHRASES.some(phrase => text.includes(phrase))) return false
    // Check whole-word matches (avoid matching "unisex" for "sex", "analysis" for "anal", etc.)
    for (const word of BLOCKED_WORDS) {
      const regex = new RegExp(`\\b${word}`, 'i')
      if (regex.test(text)) return false
    }
    return true
  })
}

// ============================================
// CJ DROPSHIPPING
// ============================================
let cjAccessToken = null
let cjTokenExpiry = 0
let cjAuthPromise = null

async function loadCJTokenFromDB() {
  try {
    const result = await sql`SELECT value FROM admin_settings WHERE key = 'cj_access_token'`
    if (result.rows.length > 0) {
      const stored = JSON.parse(result.rows[0].value)
      if (stored.token && stored.expiry > Date.now()) {
        cjAccessToken = stored.token
        cjTokenExpiry = stored.expiry
        return stored.token
      }
    }
  } catch { /* DB not available, continue to API */ }
  return null
}

async function saveCJTokenToDB(token, expiry) {
  try {
    await sql`
      INSERT INTO admin_settings (key, value, category, label, is_secret)
      VALUES ('cj_access_token', ${JSON.stringify({ token, expiry })}, 'supplier', 'CJ Access Token', true)
      ON CONFLICT (key) DO UPDATE SET value = ${JSON.stringify({ token, expiry })}, updated_at = NOW()
    `
  } catch { /* DB save failed, token still works in memory */ }
}

async function getCJAccessToken() {
  const apiKey = process.env.CJ_DROPSHIPPING_API_KEY
  if (!apiKey) return null

  const now = Date.now()
  if (cjAccessToken && cjTokenExpiry > now) {
    return cjAccessToken
  }

  // Try loading from DB (persists across cold starts)
  const dbToken = await loadCJTokenFromDB()
  if (dbToken) return dbToken

  // Deduplicate concurrent auth requests (CJ rate limits to 1/300s)
  if (cjAuthPromise) return cjAuthPromise

  cjAuthPromise = (async () => {
    try {
      const response = await fetch('https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      })

      if (!response.ok) {
        if (response.status === 429 && cjAccessToken) {
          cjTokenExpiry = now + 300000
          return cjAccessToken
        }
        throw new Error(`CJ auth failed: ${response.status}`)
      }

      const data = await response.json()
      if (data.code === 1600200 && cjAccessToken) {
        cjTokenExpiry = now + 300000
        return cjAccessToken
      }
      if (!data.data?.accessToken) throw new Error(`CJ auth error: ${data.message || 'no token'}`)

      cjAccessToken = data.data.accessToken
      cjTokenExpiry = data.data.accessTokenExpiryDate
        ? new Date(data.data.accessTokenExpiryDate).getTime()
        : now + 14 * 86400000

      // Persist to DB so other cold starts can use it
      await saveCJTokenToDB(cjAccessToken, cjTokenExpiry)

      return cjAccessToken
    } finally {
      cjAuthPromise = null
    }
  })()

  return cjAuthPromise
}

export async function searchCJ(query, page = 1) {
  const apiKey = process.env.CJ_DROPSHIPPING_API_KEY
  if (!apiKey) {
    console.warn('CJ Dropshipping: No API key configured')
    return []
  }

  try {
    const token = await getCJAccessToken()
    if (!token) {
      console.warn('CJ Dropshipping: Failed to obtain access token')
      return []
    }

    const params = new URLSearchParams({
      productNameEn: query,
      pageNum: String(page),
      pageSize: '50',
    })

    const response = await fetch(`https://developers.cjdropshipping.com/api2.0/v1/product/list?${params}`, {
      method: 'GET',
      headers: { 'CJ-Access-Token': token },
    })

    if (!response.ok) throw new Error(`CJ API ${response.status}`)

    const data = await response.json()
    if (data.code !== 200) throw new Error(`CJ code ${data.code}: ${data.message}`)
    const list = data.data?.list || data.data?.pageList || []
    const products = list.map(p => normaliseCJProduct(p))

    return products
  } catch (err) {
    console.error('CJ search error:', err.message || err)
    return []
  }
}

function normaliseCJProduct(p) {
  const cost = parseFloat(p.sellPrice) || 0
  const shipping = parseFloat(p.shippingPrice) || 0
  const suggestedPrice = Math.ceil((cost + shipping) * 2.5 * 100) / 100
  return {
    id: `cj_${p.pid}`,
    title: p.productNameEn || 'CJ Product',
    description: p.description || '',
    image: p.productImage || (p.productImageSet?.[0]) || '',
    images: p.productImageSet || [],
    cost,
    shipping,
    totalCost: Math.round((cost + shipping) * 100) / 100,
    suggestedPrice,
    suggestedMargin: Math.round((suggestedPrice - cost - shipping) * 100) / 100,
    deliveryDays: parseInt(p.logisticsDays) || 14,
    supplier: 'CJ Dropshipping',
    supplierLogo: '📦',
    sourceUrl: p.productUrl || '',
    minOrderQty: p.moqNum || 1,
    category: p.categoryName || '',
    _live: true,
  }
}

// ============================================
// PRINTFUL (print-on-demand)
// ============================================
let printfulCatalogCache = null
let printfulCacheTime = 0
const PRINTFUL_CACHE_TTL = 30 * 60 * 1000

async function fetchPrintfulCatalog(apiKey) {
  const now = Date.now()
  if (printfulCatalogCache && (now - printfulCacheTime) < PRINTFUL_CACHE_TTL) {
    return printfulCatalogCache
  }

  const response = await fetch('https://api.printful.com/products', {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  })

  if (!response.ok) throw new Error(`Printful API ${response.status}`)

  const data = await response.json()
  printfulCatalogCache = data.result || []
  printfulCacheTime = now
  return printfulCatalogCache
}

export async function searchPrintful(query) {
  const apiKey = process.env.PRINTFUL_API_KEY
  if (!apiKey) {
    console.warn('Printful: No API key configured')
    return []
  }

  try {
    const catalog = await fetchPrintfulCatalog(apiKey)
    const q = (query || '').toLowerCase().trim()

    if (!q || q.length < 2) {
      const popular = catalog.filter(p => !p.is_discontinued).slice(0, 30)
      return popular.map(p => normalisePrintfulProduct(p))
    }

    const words = q.split(/\s+/).filter(w => w.length >= 2)

    const filtered = catalog
      .filter(p => {
        if (p.is_discontinued) return false
        const text = [p.title, p.type_name, p.brand, p.model]
          .map(f => (f || '').toLowerCase()).join(' ')
        return words.some(w => text.includes(w)) || text.includes(q)
      })
      .slice(0, 40)

    if (filtered.length === 0 && words.length > 0) {
      const loose = catalog
        .filter(p => {
          if (p.is_discontinued) return false
          const text = [p.title, p.type_name].map(f => (f || '').toLowerCase()).join(' ')
          return text.includes(words[0]) || text.includes(q.slice(0, 3))
        })
        .slice(0, 30)
      return loose.map(p => normalisePrintfulProduct(p))
    }

    return filtered.map(p => normalisePrintfulProduct(p))
  } catch (err) {
    console.error('Printful search error:', err.message || err)
    return []
  }
}

const PRINTFUL_BASE_COSTS = {
  'T-SHIRT': 9.50, 'HOODIE': 22.00, 'TANK TOP': 10.00,
  'LONG SLEEVE SHIRT': 14.00, 'CROP TOP': 12.00, 'DRESS': 25.00,
  'LEGGINGS': 22.00, 'SHORTS': 18.00, 'SWIMSUIT': 26.00,
  'MUG': 6.50, 'POSTER': 7.00, 'CANVAS': 14.00,
  'PHONE CASE': 8.50, 'TOTE BAG': 10.00, 'BACKPACK': 28.00,
  'HAT': 12.00, 'BEANIE': 14.00, 'SOCKS': 8.00,
  'FACE MASK': 6.00, 'PILLOW': 14.00, 'BLANKET': 30.00,
  'STICKER': 2.00, 'NOTEBOOK': 10.00, 'MOUSE PAD': 8.00,
  'APRON': 16.00, 'ONESIE': 12.00, 'KIDS T-SHIRT': 9.00,
}

function normalisePrintfulProduct(p) {
  const baseCost = PRINTFUL_BASE_COSTS[p.type_name] || 15.00
  const shipping = 4.50
  const suggestedPrice = Math.ceil(baseCost * 2.2 * 100) / 100
  const fulfillmentDays = p.avg_fulfillment_time || 3
  const deliveryDays = fulfillmentDays + 4

  return {
    id: `pf_${p.id}`,
    title: p.title || 'Printful Product',
    description: p.description || `Custom ${p.type_name || 'product'} by ${p.brand || 'Printful'} — print your own design`,
    image: p.image || '',
    images: [p.image].filter(Boolean),
    cost: baseCost,
    shipping,
    totalCost: Math.round((baseCost + shipping) * 100) / 100,
    suggestedPrice,
    suggestedMargin: Math.round((suggestedPrice - baseCost - shipping) * 100) / 100,
    deliveryDays,
    supplier: 'Printful',
    supplierLogo: '🎨',
    sourceUrl: `https://www.printful.com/custom/${p.type_name?.toLowerCase().replace(/\s+/g, '-') || 'products'}`,
    minOrderQty: 1,
    category: p.type_name || 'Custom',
    brand: p.brand || '',
    variantCount: p.variant_count || 0,
    customisable: true,
    _live: true,
  }
}

// ============================================
// PRINTIFY (print-on-demand)
// ============================================
let printifyCatalogCache = null
let printifyCacheTime = 0

async function fetchPrintifyCatalog(apiKey) {
  const now = Date.now()
  if (printifyCatalogCache && (now - printifyCacheTime) < PRINTFUL_CACHE_TTL) {
    return printifyCatalogCache
  }

  const response = await fetch('https://api.printify.com/v1/catalog/blueprints.json', {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  })

  if (!response.ok) throw new Error(`Printify API ${response.status}`)

  const data = await response.json()
  printifyCatalogCache = Array.isArray(data) ? data : (data.data || [])
  printifyCacheTime = now
  return printifyCatalogCache
}

export async function searchPrintify(query) {
  const apiKey = process.env.PRINTIFY_API_KEY
  if (!apiKey) {
    console.warn('Printify: No API key configured')
    return []
  }

  try {
    const catalog = await fetchPrintifyCatalog(apiKey)
    const q = (query || '').toLowerCase().trim()

    if (!q || q.length < 2) {
      return catalog.slice(0, 30).map(p => normalisePrintifyProduct(p))
    }

    const words = q.split(/\s+/).filter(w => w.length >= 2)

    const filtered = catalog
      .filter(p => {
        const text = [p.title, p.description].map(f => (f || '').toLowerCase()).join(' ')
        return words.some(w => text.includes(w)) || text.includes(q)
      })
      .slice(0, 40)

    if (filtered.length === 0) return []
    return filtered.map(p => normalisePrintifyProduct(p))
  } catch (err) {
    console.error('Printify search error:', err.message || err)
    return []
  }
}

const PRINTIFY_BASE_COSTS = {
  't-shirt': 8.50, 'hoodie': 20.00, 'sweatshirt': 18.00,
  'tank top': 9.00, 'mug': 5.50, 'poster': 6.00,
  'canvas': 12.00, 'phone case': 7.50, 'tote bag': 9.00,
  'hat': 11.00, 'pillow': 12.00, 'blanket': 28.00,
  'sticker': 1.80, 'notebook': 8.50, 'backpack': 26.00,
}

function normalisePrintifyProduct(p) {
  const titleLower = (p.title || '').toLowerCase()
  let baseCost = 13.00
  for (const [key, cost] of Object.entries(PRINTIFY_BASE_COSTS)) {
    if (titleLower.includes(key)) { baseCost = cost; break }
  }
  const shipping = 4.00
  const suggestedPrice = Math.ceil(baseCost * 2.3 * 100) / 100

  return {
    id: `py_${p.id}`,
    title: p.title || 'Printify Product',
    description: p.description || `Custom print-on-demand product`,
    image: p.images?.[0] || '',
    images: p.images || [],
    cost: baseCost,
    shipping,
    totalCost: Math.round((baseCost + shipping) * 100) / 100,
    suggestedPrice,
    suggestedMargin: Math.round((suggestedPrice - baseCost - shipping) * 100) / 100,
    deliveryDays: 5,
    supplier: 'Printify',
    supplierLogo: '🖨️',
    sourceUrl: 'https://printify.com',
    minOrderQty: 1,
    category: 'Custom',
    customisable: true,
    _live: true,
  }
}

// ============================================
// GOOTEN (print-on-demand)
// ============================================
let gootenCatalogCache = null
let gootenCacheTime = 0

export async function searchGooten(query) {
  const recipeId = process.env.GOOTEN_RECIPE_ID
  if (!recipeId) {
    console.warn('Gooten: No API key configured')
    return []
  }

  try {
    const now = Date.now()
    if (!gootenCatalogCache || (now - gootenCacheTime) > PRINTFUL_CACHE_TTL) {
      const response = await fetch(`https://api.print.io/api/v/4/source/api/products?recipeId=${recipeId}&countryCode=US&showAllProducts=true`)
      if (!response.ok) throw new Error(`Gooten API ${response.status}`)
      const data = await response.json()
      // v4 API returns categories with nested items
      const rawProducts = data.Products || data.products || []
      if (rawProducts.length > 0 && rawProducts[0]?.items) {
        gootenCatalogCache = rawProducts.flatMap(cat =>
          (cat.items || []).map(item => ({ ...item, Category: cat.name || cat.Name || '' }))
        )
      } else {
        gootenCatalogCache = rawProducts
      }
      gootenCacheTime = now
    }

    const q = (query || '').toLowerCase().trim()
    if (!q || q.length < 2) {
      return gootenCatalogCache.slice(0, 30).map(p => normaliseGootenProduct(p))
    }

    const words = q.split(/\s+/).filter(w => w.length >= 2)
    const filtered = gootenCatalogCache
      .filter(p => {
        const text = [p.Name, p.name, p.Description, p.description, p.Category, p.category]
          .map(f => (f || '').toLowerCase()).join(' ')
        return words.some(w => text.includes(w)) || text.includes(q)
      })
      .slice(0, 40)

    if (filtered.length === 0) return []
    return filtered.map(p => normaliseGootenProduct(p))
  } catch (err) {
    console.error('Gooten search error:', err.message || err)
    return []
  }
}

function normaliseGootenProduct(p) {
  const baseCost = p.MinPrice || p.min_price || p.RetailPrice?.Price || p.retail_price?.price || 12.00
  const cheapestShip = p.CheapestShippingPrice || p.cheapest_shipping_price || 4.50
  const shipping = typeof cheapestShip === 'object' ? (cheapestShip.Price || cheapestShip.price || 4.50) : cheapestShip
  const suggestedPrice = Math.ceil(baseCost * 2.2 * 100) / 100

  return {
    id: `gt_${p.Id || p.ProductId || p.id || p.product_id}`,
    title: p.Name || p.name || 'Gooten Product',
    description: p.Description || p.description || p.meta_description || 'Custom print product by Gooten',
    image: p.Images?.[0]?.Url || p.images?.[0]?.url || p.FeaturedImage?.Url || '',
    images: (p.Images || p.images || []).map(i => i.Url || i.url).filter(Boolean),
    cost: baseCost,
    shipping,
    totalCost: Math.round((baseCost + shipping) * 100) / 100,
    suggestedPrice,
    suggestedMargin: Math.round((suggestedPrice - baseCost - shipping) * 100) / 100,
    deliveryDays: 6,
    supplier: 'Gooten',
    supplierLogo: '🏭',
    sourceUrl: 'https://gooten.com',
    minOrderQty: 1,
    category: p.Category || p.category || 'Custom',
    customisable: true,
    _live: true,
  }
}

// ============================================
// ALIEXPRESS (Drop Shipping API)
// ============================================
let aliexpressFeedNames = null
let aliexpressFeedNamesFetchedAt = 0

function signAliExpressRequest(params, appSecret) {
  const sorted = Object.keys(params)
    .filter(k => k !== 'sign')
    .sort()
    .map(k => `${k}${params[k]}`)
    .join('')

  // HMAC-SHA256: key is appSecret, message is sorted params (no prefix/suffix)
  return crypto
    .createHmac('sha256', appSecret)
    .update(sorted)
    .digest('hex')
    .toUpperCase()
}

async function callAliExpressAPI(method, params = {}) {
  const appKey = process.env.ALIEXPRESS_APP_KEY
  const appSecret = process.env.ALIEXPRESS_APP_SECRET
  if (!appKey || !appSecret) return null

  const baseParams = {
    app_key: appKey,
    method,
    sign_method: 'hmac-sha256',
    timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
    format: 'json',
    v: '2.0',
    ...params,
  }

  baseParams.sign = signAliExpressRequest(baseParams, appSecret)

  const qs = new URLSearchParams(baseParams).toString()
  const response = await fetch(`https://api-sg.aliexpress.com/sync?${qs}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })

  if (!response.ok) throw new Error(`AliExpress API error: ${response.status}`)
  return response.json()
}

async function getAliExpressFeedNames() {
  const now = Date.now()
  if (aliexpressFeedNames && (now - aliexpressFeedNamesFetchedAt) < 60 * 60 * 1000) {
    return aliexpressFeedNames
  }

  try {
    const data = await callAliExpressAPI('aliexpress.ds.feedname.get', {})
    const respResult = data?.aliexpress_ds_feedname_get_response?.resp_result?.result
    const feeds = respResult?.promos?.promo || respResult?.feed_names?.feed_name || []
    if (feeds.length > 0) {
      aliexpressFeedNames = feeds
      aliexpressFeedNamesFetchedAt = now
    }
    return feeds
  } catch {
    return aliexpressFeedNames || []
  }
}

// Map our category system to AliExpress first_level_category_name values
// These must be specific enough to avoid false matches (e.g. "accessories" alone matches auto)
const ALIEXPRESS_CATEGORY_FILTER = {
  pets: ['pet supplies', 'pet product', 'dog', 'cat supplies'],
  sports: ['sports & entertainment', 'sports shoes', 'outdoor', 'camping', 'fitness', 'cycling', 'fishing'],
  electronics: ['consumer electronics', 'computer & office', 'phones & telecom', 'electronic component', 'security & protection'],
  fashion: ['women\'s clothing', 'men\'s clothing', 'shoes', 'jewelry & accessor', 'watches', 'apparel accessor', 'luggage & bags', 'hair extensions'],
  home: ['home & garden', 'home appliance', 'home improvement', 'furniture', 'lights & lighting', 'kitchen'],
  beauty: ['beauty & health', 'hair extensions & wigs'],
  toys: ['toys & hobbies', 'mother & kids'],
  automotive: ['automobiles', 'motorcycle', 'car accessori'],
}

// Map search queries to relevant AliExpress feed categories
const FEED_KEYWORDS = {
  pet: ['pet', 'dog', 'cat', 'animal'],
  phone: ['phone', 'mobile', 'case', 'charger', 'cable'],
  computer: ['computer', 'laptop', 'keyboard', 'mouse', 'usb', 'headphone', 'earbuds'],
  fashion: ['fashion', 'dress', 'shirt', 'clothing', 'watch', 'sunglasses', 'jewel', 'necklace', 'ring', 'bracelet'],
  home: ['home', 'kitchen', 'garden', 'light', 'lamp', 'pillow', 'organis', 'decor', 'furniture'],
  beauty: ['beauty', 'makeup', 'skincare', 'hair', 'nail', 'brush', 'cosmetic'],
  toy: ['toy', 'puzzle', 'game', 'fidget', 'rc', 'plush', 'doll'],
  sport: ['sport', 'fitness', 'gym', 'yoga', 'water bottle', 'outdoor', 'camping', 'bike'],
  auto: ['car', 'auto', 'vehicle', 'dash', 'motor'],
  baby: ['baby', 'kid', 'child', 'infant'],
}

// Cache for AliExpress product pool (products from multiple feeds)
let aliexpressProductPool = []
let aliexpressPoolFetchedAt = 0

async function getAliExpressProductPool() {
  const now = Date.now()
  // Cache for 10 minutes
  if (aliexpressProductPool.length > 0 && (now - aliexpressPoolFetchedAt) < 10 * 60 * 1000) {
    return aliexpressProductPool
  }

  const feeds = await getAliExpressFeedNames()
  if (feeds.length === 0) return []

  // Fetch from up to 20 different feeds in parallel for maximum category coverage
  const getName = (f) => f?.promo_name || f?.feed_name || f || ''
  // Spread feed selection across the list for variety (not just first 20)
  const step = Math.max(1, Math.floor(feeds.length / 20))
  const selectedFeeds = []
  for (let i = 0; i < feeds.length && selectedFeeds.length < 20; i += step) {
    selectedFeeds.push(feeds[i])
  }
  const feedsToFetch = selectedFeeds.map(getName)

  const feedResults = await Promise.allSettled(
    feedsToFetch.map(feedName =>
      callAliExpressAPI('aliexpress.ds.recommend.feed.get', {
        feed_name: feedName,
        target_currency: 'USD',
        target_language: 'EN',
        page_no: '1',
        page_size: '50',
        sort: 'volumeDesc',
      })
    )
  )

  const allProducts = []
  for (const result of feedResults) {
    if (result.status !== 'fulfilled' || !result.value) continue
    const feedResp = result.value?.aliexpress_ds_recommend_feed_get_response
    const resp = feedResp?.resp_result?.result || feedResp?.result
    const items = resp?.products?.product || resp?.products?.traffic_product_d_t_o || []
    allProducts.push(...items)
  }

  // Deduplicate by product_id
  const seen = new Set()
  const unique = allProducts.filter(p => {
    const id = p.product_id
    if (seen.has(id)) return false
    seen.add(id)
    return true
  })

  if (unique.length > 0) {
    aliexpressProductPool = unique
    aliexpressPoolFetchedAt = now
  }

  return unique
}

function pickBestFeeds(feeds, query, count = 3) {
  const getName = (f) => f?.promo_name || f?.feed_name || f || ''
  if (!feeds.length) return ['DS bestselling products']
  if (!query) {
    return feeds.slice(0, count).map(getName)
  }

  const q = query.toLowerCase()
  const matched = []

  const matchedCategories = []
  for (const [cat, keywords] of Object.entries(FEED_KEYWORDS)) {
    if (keywords.some(kw => q.includes(kw))) {
      matchedCategories.push(cat)
    }
  }

  for (const feed of feeds) {
    const name = getName(feed).toLowerCase()
    if (matchedCategories.some(cat => name.includes(cat))) {
      matched.push(getName(feed))
    } else {
      const queryWords = q.split(/\s+/)
      if (queryWords.some(w => w.length > 2 && name.includes(w))) {
        matched.push(getName(feed))
      }
    }
    if (matched.length >= count) break
  }

  if (matched.length === 0) {
    for (const feed of feeds) {
      const n = getName(feed).toLowerCase()
      if (n.includes('bestsell') || n.includes('best_sell') || n.includes('hot') || n.includes('summer') || n.includes('general')) {
        matched.push(getName(feed))
        if (matched.length >= count) break
      }
    }
  }

  return matched.length > 0 ? matched : feeds.slice(0, count).map(getName)
}

// Determine which our-category a search query belongs to
function getOurCategoryForQuery(query) {
  if (!query) return null
  const q = query.toLowerCase()
  // Direct mapping from trending terms back to categories
  for (const [cat, terms] of Object.entries(TRENDING_TERMS)) {
    if (cat && terms.some(t => q.includes(t.toLowerCase()) || t.toLowerCase().includes(q))) return cat
  }
  // Check ALIEXPRESS_CATEGORY_FILTER keywords
  for (const [ourCat, filterTerms] of Object.entries(ALIEXPRESS_CATEGORY_FILTER)) {
    if (filterTerms.some(ft => q.includes(ft))) return ourCat
  }
  return null
}

// Filter products by AliExpress category name matching our category
function filterByAliExpressCategory(products, ourCategory) {
  if (!ourCategory) return products
  const catFilters = ALIEXPRESS_CATEGORY_FILTER[ourCategory]
  if (!catFilters) return products

  const filtered = products.filter(p => {
    const cat = (p.category || '').toLowerCase()
    return catFilters.some(f => cat.includes(f))
  })
  return filtered
}

export async function searchAliExpress(query, page = 1) {
  const appKey = process.env.ALIEXPRESS_APP_KEY
  if (!appKey) {
    console.warn('AliExpress: No API key configured')
    return []
  }

  try {
    // Get the large product pool from multiple feeds (cached 10 min)
    const pool = await getAliExpressProductPool()

    if (pool.length === 0) {
      return []
    }

    let products = pool.map(p => normaliseAliExpressProduct(p))

    // Deduplicate
    const seen = new Set()
    products = products.filter(p => {
      if (seen.has(p.id)) return false
      seen.add(p.id)
      return true
    })

    if (query) {
      const ourCat = getOurCategoryForQuery(query)

      // Filter by AliExpress category name (most reliable method)
      if (ourCat) {
        const catFiltered = filterByAliExpressCategory(products, ourCat)
        if (catFiltered.length >= 5) {
          // Within category, further filter by keyword for relevance
          const q = query.toLowerCase()
          const keywords = q.split(/\s+/).filter(kw => kw.length > 2)
          if (keywords.length > 0) {
            const kwFiltered = catFiltered.filter(p => {
              const text = (p.title + ' ' + p.category).toLowerCase()
              return keywords.some(kw => text.includes(kw))
            })
            return kwFiltered.length >= 3 ? kwFiltered : catFiltered
          }
          return catFiltered
        }
        // Category is known but no products in pool — no products found
        return []
      }

      // No known category — do general keyword search
      const q = query.toLowerCase()
      const keywords = q.split(/\s+/).filter(kw => kw.length > 2)
      const filtered = products.filter(p => {
        const text = (p.title + ' ' + p.category).toLowerCase()
        return keywords.some(kw => text.includes(kw))
      })
      if (filtered.length >= 3) return filtered

      return []
    }

    return products
  } catch (err) {
    console.error('AliExpress search error:', err.message || err)
    return []
  }
}

function normaliseAliExpressProduct(p) {
  // Handle both feed API and affiliate API response formats
  const cost = parseFloat(p.target_sale_price || p.app_sale_price || p.target_original_price || p.original_price || '0')
  const originalPrice = parseFloat(p.target_original_price || p.original_price || '0')
  const shipping = 0
  const suggestedPrice = Math.ceil(cost * 2.5 * 100) / 100

  const title = p.product_title || p.product_detail_url?.split('/item/')?.pop()?.replace('.html', '') || 'AliExpress Product'
  const image = p.product_main_image_url || p.product_main_image || ''
  const smallImages = p.product_small_image_urls?.string
    || p.product_small_image_urls?.productSmallImageUrl
    || (p.product_small_image_list ? [p.product_small_image_list] : [])
    || []
  const evalRate = p.evaluate_rate || p.evaluation_rate || ''

  return {
    id: `ae_${p.product_id}`,
    title,
    description: title,
    image,
    images: smallImages,
    cost,
    originalPrice,
    shipping,
    totalCost: Math.round((cost + shipping) * 100) / 100,
    suggestedPrice,
    suggestedMargin: Math.round((suggestedPrice - cost - shipping) * 100) / 100,
    deliveryDays: p.ship_to_days || 14,
    supplier: 'AliExpress',
    supplierLogo: '🛒',
    sourceUrl: p.product_detail_url || p.promotion_link || `https://www.aliexpress.com/item/${p.product_id}.html`,
    minOrderQty: 1,
    category: p.first_level_category_name || p.second_level_category_name || p.first_level_category_id || '',
    rating: evalRate ? parseFloat(String(evalRate).replace('%', '')) / (String(evalRate).includes('%') ? 100 : 1) : null,
    orders: p.lastest_volume || p.product_volume || 0,
    discount: originalPrice > cost ? Math.round((1 - cost / originalPrice) * 100) : 0,
    _live: true,
  }
}

export function getSampleAliExpressProducts() {
  return []
}

// ============================================
// CURATED TRENDING CATALOG
// Real product data with images for the home screen
// These are the best-selling dropshipping products
// ============================================
const CURATED_TRENDING = [
  // --- Electronics & Gadgets ---
  { id: 'cur_1', title: 'Wireless Bluetooth Earbuds Pro', description: 'TWS earbuds with noise cancellation, 30hr battery life, touch controls. Top seller worldwide.', image: 'https://images.unsplash.com/photo-1590658268037-6bf12f032f55?w=400&h=400&fit=crop', cost: 6.50, shipping: 2.00, suggestedPrice: 29.99, deliveryDays: 10, supplier: 'CJ Dropshipping', supplierLogo: '📦', category: 'Electronics', tags: ['earbuds', 'wireless', 'bluetooth', 'electronics'] },
  { id: 'cur_2', title: 'LED Strip Lights RGB 5M', description: 'Smart RGB LED strip with app control, music sync, 16M colours. Room decor essential.', image: 'https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?w=400&h=400&fit=crop', cost: 3.20, shipping: 1.50, suggestedPrice: 19.99, deliveryDays: 12, supplier: 'CJ Dropshipping', supplierLogo: '📦', category: 'Electronics', tags: ['led', 'light', 'strip', 'rgb', 'room', 'decor'] },
  { id: 'cur_3', title: 'MagSafe Wireless Charger 15W', description: 'Fast wireless charging pad, compatible with iPhone & Android. Slim design.', image: 'https://images.unsplash.com/photo-1622957461168-202e5b43174e?w=400&h=400&fit=crop', cost: 4.80, shipping: 1.50, suggestedPrice: 24.99, deliveryDays: 10, supplier: 'CJ Dropshipping', supplierLogo: '📦', category: 'Electronics', tags: ['charger', 'wireless', 'phone', 'magsafe'] },
  { id: 'cur_4', title: 'Portable Mini Projector HD', description: 'Pocket-sized 1080p projector with WiFi, HDMI. Perfect for movie nights.', image: 'https://images.unsplash.com/photo-1626379953822-baec19c3accd?w=400&h=400&fit=crop', cost: 28.00, shipping: 5.00, suggestedPrice: 89.99, deliveryDays: 14, supplier: 'CJ Dropshipping', supplierLogo: '📦', category: 'Electronics', tags: ['projector', 'mini', 'portable', 'hd'] },

  // --- Phone Cases ---
  { id: 'cur_5', title: 'iPhone 15 Clear MagSafe Case', description: 'Crystal clear case with MagSafe ring, shock-absorbent edges. Best seller.', image: 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=400&h=400&fit=crop', cost: 2.20, shipping: 1.00, suggestedPrice: 14.99, deliveryDays: 10, supplier: 'CJ Dropshipping', supplierLogo: '📦', category: 'Electronics', tags: ['phone', 'case', 'iphone', 'clear'] },
  { id: 'cur_5b', title: 'Custom Phone Case — Your Design', description: 'Upload your own design. Tough snap case for all iPhone & Samsung models.', image: 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400&h=400&fit=crop', cost: 8.50, shipping: 4.50, suggestedPrice: 27.99, deliveryDays: 5, supplier: 'Printful', supplierLogo: '🎨', category: 'Custom', tags: ['phone', 'case', 'custom', 'print'], customisable: true },
  { id: 'cur_5c', title: 'Snap Phone Case — Print on Demand', description: 'Glossy or matte finish, lightweight snap case. Print your brand logo.', image: 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400&h=400&fit=crop', cost: 7.50, shipping: 4.00, suggestedPrice: 24.99, deliveryDays: 5, supplier: 'Printify', supplierLogo: '🖨️', category: 'Custom', tags: ['phone', 'case', 'custom', 'print'], customisable: true },

  // --- Fashion & Accessories ---
  { id: 'cur_6', title: 'Oversized Vintage Sunglasses', description: 'Retro thick-frame sunglasses, UV400. Trending on TikTok. Multiple colours.', image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&h=400&fit=crop', cost: 1.80, shipping: 1.00, suggestedPrice: 14.99, deliveryDays: 12, supplier: 'CJ Dropshipping', supplierLogo: '📦', category: 'Fashion', tags: ['sunglasses', 'fashion', 'vintage', 'accessories'] },
  { id: 'cur_7', title: 'Minimalist Watch — Unisex', description: 'Stainless steel mesh band, Japanese movement. Elegant everyday watch.', image: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=400&h=400&fit=crop', cost: 5.50, shipping: 2.00, suggestedPrice: 34.99, deliveryDays: 14, supplier: 'CJ Dropshipping', supplierLogo: '📦', category: 'Fashion', tags: ['watch', 'minimalist', 'fashion', 'unisex'] },
  { id: 'cur_8', title: 'Gold Layered Necklace Set', description: '3-piece layered necklace set, 18K gold plated. Dainty everyday jewellery.', image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&h=400&fit=crop', cost: 2.50, shipping: 1.00, suggestedPrice: 19.99, deliveryDays: 12, supplier: 'CJ Dropshipping', supplierLogo: '📦', category: 'Fashion', tags: ['necklace', 'jewellery', 'gold', 'layered', 'fashion'] },

  // --- T-Shirts & Apparel (multiple suppliers for price comparison) ---
  { id: 'cur_9', title: 'Unisex Cotton T-Shirt — Custom Print', description: 'Premium cotton tee, DTG printed. Upload your design. Bella+Canvas 3001.', image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop', cost: 9.50, shipping: 4.50, suggestedPrice: 29.99, deliveryDays: 5, supplier: 'Printful', supplierLogo: '🎨', category: 'Custom', tags: ['t-shirt', 'tee', 'custom', 'print', 'apparel'], customisable: true },
  { id: 'cur_9b', title: 'Unisex Cotton T-Shirt — Custom Print', description: 'Gildan 64000 or Bella+Canvas. Full colour DTG print. Your design.', image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop', cost: 8.50, shipping: 4.00, suggestedPrice: 27.99, deliveryDays: 5, supplier: 'Printify', supplierLogo: '🖨️', category: 'Custom', tags: ['t-shirt', 'tee', 'custom', 'print', 'apparel'], customisable: true },
  { id: 'cur_9c', title: 'Unisex Cotton T-Shirt — Custom Print', description: 'Next Level or Gildan. Premium DTG. Low minimums.', image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop', cost: 9.00, shipping: 4.50, suggestedPrice: 28.99, deliveryDays: 6, supplier: 'Gooten', supplierLogo: '🏭', category: 'Custom', tags: ['t-shirt', 'tee', 'custom', 'print', 'apparel'], customisable: true },

  // --- Mugs (multiple suppliers) ---
  { id: 'cur_10', title: 'Custom 11oz Ceramic Mug', description: 'White ceramic mug, full-wrap sublimation print. Dishwasher safe.', image: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=400&h=400&fit=crop', cost: 6.50, shipping: 4.50, suggestedPrice: 22.99, deliveryDays: 5, supplier: 'Printful', supplierLogo: '🎨', category: 'Custom', tags: ['mug', 'ceramic', 'custom', 'print'], customisable: true },
  { id: 'cur_10b', title: 'Custom 11oz Ceramic Mug', description: 'Classic white mug, vibrant sublimation. Your artwork or logo.', image: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=400&h=400&fit=crop', cost: 5.50, shipping: 4.00, suggestedPrice: 19.99, deliveryDays: 5, supplier: 'Printify', supplierLogo: '🖨️', category: 'Custom', tags: ['mug', 'ceramic', 'custom', 'print'], customisable: true },
  { id: 'cur_10c', title: 'Custom 11oz Ceramic Mug', description: 'High-quality sublimation. Ships from US & EU. Gooten quality.', image: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=400&h=400&fit=crop', cost: 5.80, shipping: 4.50, suggestedPrice: 21.99, deliveryDays: 6, supplier: 'Gooten', supplierLogo: '🏭', category: 'Custom', tags: ['mug', 'ceramic', 'custom', 'print'], customisable: true },
  { id: 'cur_10d', title: 'Ceramic Mug 11oz — Bulk', description: 'Plain white mug, bulk orders. Add your own branding via print house.', image: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=400&h=400&fit=crop', cost: 1.80, shipping: 2.50, suggestedPrice: 12.99, deliveryDays: 14, supplier: 'CJ Dropshipping', supplierLogo: '📦', category: 'Home', tags: ['mug', 'ceramic', 'bulk'] },

  // --- Home & Living ---
  { id: 'cur_11', title: 'Smart Sunset Lamp Projector', description: 'USB sunset projection lamp, 180-degree rotation. TikTok viral product.', image: 'https://images.unsplash.com/photo-1543332164-6e82f355badc?w=400&h=400&fit=crop', cost: 4.50, shipping: 2.00, suggestedPrice: 24.99, deliveryDays: 12, supplier: 'CJ Dropshipping', supplierLogo: '📦', category: 'Home', tags: ['lamp', 'sunset', 'home', 'decor', 'tiktok'] },
  { id: 'cur_12', title: 'Kitchen Organiser Spice Rack', description: 'Rotating 360-degree spice rack, holds 20+ jars. Space saver.', image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=400&fit=crop', cost: 5.80, shipping: 3.00, suggestedPrice: 29.99, deliveryDays: 14, supplier: 'CJ Dropshipping', supplierLogo: '📦', category: 'Home', tags: ['kitchen', 'organiser', 'spice', 'rack', 'home'] },
  { id: 'cur_13', title: 'Custom Throw Pillow 18x18', description: 'Double-sided print, concealed zipper. Spun polyester cover.', image: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=400&h=400&fit=crop', cost: 14.00, shipping: 5.00, suggestedPrice: 39.99, deliveryDays: 5, supplier: 'Printful', supplierLogo: '🎨', category: 'Custom', tags: ['pillow', 'custom', 'home', 'decor'], customisable: true },

  // --- Beauty & Health ---
  { id: 'cur_14', title: 'LED Face Mask — Red Light Therapy', description: '7-colour LED therapy mask. Anti-ageing, acne treatment. Viral beauty product.', image: 'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=400&h=400&fit=crop', cost: 8.50, shipping: 3.00, suggestedPrice: 39.99, deliveryDays: 14, supplier: 'CJ Dropshipping', supplierLogo: '📦', category: 'Beauty', tags: ['beauty', 'led', 'face', 'mask', 'skincare'] },
  { id: 'cur_15', title: 'Ice Roller Face Massager', description: 'Stainless steel ice roller, reduces puffiness & redness. Self-care essential.', image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400&h=400&fit=crop', cost: 1.50, shipping: 1.00, suggestedPrice: 12.99, deliveryDays: 12, supplier: 'CJ Dropshipping', supplierLogo: '📦', category: 'Beauty', tags: ['beauty', 'ice', 'roller', 'skincare', 'massage'] },
  { id: 'cur_16', title: 'Professional Makeup Brush Set 12pc', description: 'Soft synthetic brushes, rose gold handles. Complete set for face & eyes.', image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400&h=400&fit=crop', cost: 4.80, shipping: 2.00, suggestedPrice: 24.99, deliveryDays: 12, supplier: 'CJ Dropshipping', supplierLogo: '📦', category: 'Beauty', tags: ['makeup', 'brush', 'beauty', 'cosmetics'] },

  // --- Hoodies (multiple suppliers) ---
  { id: 'cur_17', title: 'Custom Hoodie — Your Design', description: 'Unisex pullover hoodie, cotton/poly blend. DTG or embroidery.', image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=400&fit=crop', cost: 22.00, shipping: 5.00, suggestedPrice: 54.99, deliveryDays: 5, supplier: 'Printful', supplierLogo: '🎨', category: 'Custom', tags: ['hoodie', 'custom', 'print', 'apparel'], customisable: true },
  { id: 'cur_17b', title: 'Custom Hoodie — Your Design', description: 'Gildan or independent brand hoodie. Full colour print.', image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=400&fit=crop', cost: 20.00, shipping: 4.50, suggestedPrice: 49.99, deliveryDays: 5, supplier: 'Printify', supplierLogo: '🖨️', category: 'Custom', tags: ['hoodie', 'custom', 'print', 'apparel'], customisable: true },

  // --- Posters & Wall Art ---
  { id: 'cur_18', title: 'Custom Poster Print — Museum Quality', description: 'Thick matte paper, vibrant colours. Upload any artwork or photo.', image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400&h=400&fit=crop', cost: 7.00, shipping: 4.50, suggestedPrice: 24.99, deliveryDays: 5, supplier: 'Printful', supplierLogo: '🎨', category: 'Custom', tags: ['poster', 'print', 'wall', 'art', 'custom'], customisable: true },
  { id: 'cur_18b', title: 'Custom Poster Print — Premium', description: 'Giclée quality, archival paper. Perfect for art prints.', image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400&h=400&fit=crop', cost: 6.00, shipping: 4.00, suggestedPrice: 22.99, deliveryDays: 5, supplier: 'Printify', supplierLogo: '🖨️', category: 'Custom', tags: ['poster', 'print', 'wall', 'art', 'custom'], customisable: true },

  // --- Sports & Fitness ---
  { id: 'cur_19', title: 'Insulated Water Bottle 750ml', description: 'Double-wall vacuum insulated, keeps drinks cold 24hrs. Powder coated.', image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&h=400&fit=crop', cost: 4.50, shipping: 2.50, suggestedPrice: 24.99, deliveryDays: 12, supplier: 'CJ Dropshipping', supplierLogo: '📦', category: 'Sports', tags: ['water', 'bottle', 'sports', 'fitness', 'insulated'] },
  { id: 'cur_20', title: 'Resistance Bands Set (5 Pack)', description: 'Latex-free resistance bands with carry bag. 5 resistance levels.', image: 'https://images.unsplash.com/photo-1598289431512-b97b0917affc?w=400&h=400&fit=crop', cost: 2.80, shipping: 1.50, suggestedPrice: 16.99, deliveryDays: 12, supplier: 'CJ Dropshipping', supplierLogo: '📦', category: 'Sports', tags: ['resistance', 'bands', 'fitness', 'gym', 'sports'] },
  { id: 'cur_21', title: 'Yoga Mat 6mm — Non-Slip', description: 'TPE eco-friendly yoga mat, alignment lines, carrying strap included.', image: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400&h=400&fit=crop', cost: 6.00, shipping: 3.00, suggestedPrice: 29.99, deliveryDays: 14, supplier: 'CJ Dropshipping', supplierLogo: '📦', category: 'Sports', tags: ['yoga', 'mat', 'fitness', 'sports'] },

  // --- Pets ---
  { id: 'cur_22', title: 'Interactive Dog Toy — Treat Ball', description: 'Slow feeder puzzle toy, durable rubber. Keeps dogs entertained for hours.', image: 'https://images.unsplash.com/photo-1535294435445-d7249b8f7b5f?w=400&h=400&fit=crop', cost: 2.50, shipping: 1.50, suggestedPrice: 14.99, deliveryDays: 12, supplier: 'CJ Dropshipping', supplierLogo: '📦', category: 'Pets', tags: ['dog', 'toy', 'pet', 'interactive'] },
  { id: 'cur_23', title: 'Elevated Pet Bowl Set', description: 'Raised stainless steel bowls with bamboo stand. Better for pet digestion.', image: 'https://images.unsplash.com/photo-1583337130417-13104dec14a1?w=400&h=400&fit=crop', cost: 5.00, shipping: 2.50, suggestedPrice: 24.99, deliveryDays: 14, supplier: 'CJ Dropshipping', supplierLogo: '📦', category: 'Pets', tags: ['pet', 'bowl', 'dog', 'cat', 'elevated'] },

  // --- Tote Bags (multiple suppliers) ---
  { id: 'cur_24', title: 'Custom Canvas Tote Bag', description: 'Heavy-duty canvas, full-colour print. Perfect for brand merch.', image: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=400&h=400&fit=crop', cost: 10.00, shipping: 4.50, suggestedPrice: 29.99, deliveryDays: 5, supplier: 'Printful', supplierLogo: '🎨', category: 'Custom', tags: ['tote', 'bag', 'canvas', 'custom'], customisable: true },
  { id: 'cur_24b', title: 'Custom Canvas Tote Bag', description: 'Eco-friendly cotton canvas. Print your logo or design.', image: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=400&h=400&fit=crop', cost: 9.00, shipping: 4.00, suggestedPrice: 27.99, deliveryDays: 5, supplier: 'Printify', supplierLogo: '🖨️', category: 'Custom', tags: ['tote', 'bag', 'canvas', 'custom'], customisable: true },

  // --- Stickers ---
  { id: 'cur_25', title: 'Custom Die-Cut Stickers', description: 'Vinyl stickers, waterproof, UV resistant. Upload any design.', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=400&fit=crop', cost: 2.00, shipping: 2.00, suggestedPrice: 8.99, deliveryDays: 5, supplier: 'Printful', supplierLogo: '🎨', category: 'Custom', tags: ['sticker', 'vinyl', 'custom', 'die-cut'], customisable: true },

  // --- Automotive ---
  { id: 'cur_26', title: 'Magnetic Car Phone Mount', description: 'Strong magnet, 360-degree rotation, dashboard or vent mount.', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=400&fit=crop', cost: 2.00, shipping: 1.50, suggestedPrice: 14.99, deliveryDays: 12, supplier: 'CJ Dropshipping', supplierLogo: '📦', category: 'Automotive', tags: ['car', 'phone', 'mount', 'magnetic', 'automotive'] },
  { id: 'cur_27', title: 'LED Car Interior Lights', description: 'RGB ambient lighting strip, app controlled, music sync. Easy install.', image: 'https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?w=400&h=400&fit=crop', cost: 4.00, shipping: 2.00, suggestedPrice: 19.99, deliveryDays: 12, supplier: 'CJ Dropshipping', supplierLogo: '📦', category: 'Automotive', tags: ['car', 'led', 'light', 'interior', 'automotive'] },
]

// Normalise curated products to full format
function normaliseCuratedProduct(p) {
  const cost = p.cost
  const shipping = p.shipping
  const totalCost = Math.round((cost + shipping) * 100) / 100
  const suggestedPrice = p.suggestedPrice
  const suggestedMargin = Math.round((suggestedPrice - totalCost) * 100) / 100

  return {
    id: p.id,
    title: p.title,
    description: p.description,
    image: p.image,
    images: [p.image],
    cost,
    shipping,
    totalCost,
    suggestedPrice,
    suggestedMargin,
    deliveryDays: p.deliveryDays,
    supplier: p.supplier,
    supplierLogo: p.supplierLogo,
    sourceUrl: '',
    minOrderQty: 1,
    category: p.category,
    customisable: p.customisable || false,
    tags: p.tags || [],
    _live: false,
    _curated: true,
  }
}

// Get curated trending products filtered by category/search
export function getCuratedTrending(category, query) {
  let items = CURATED_TRENDING

  if (category) {
    const catLower = category.toLowerCase()
    items = items.filter(p =>
      p.category.toLowerCase() === catLower ||
      p.tags.some(t => t === catLower)
    )
  }

  if (query) {
    const words = query.toLowerCase().split(/\s+/).filter(w => w.length >= 2)
    items = items.filter(p => {
      const text = [p.title, p.description, p.category, ...p.tags].join(' ').toLowerCase()
      return words.some(w => text.includes(w))
    })
  }

  return items.map(normaliseCuratedProduct)
}

// ============================================
// SAMPLE DATA (when no API keys configured)
// Now with real Unsplash images
// ============================================
const SAMPLE_IMAGES = {
  // Electronics
  'phone case': 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=400&h=400&fit=crop',
  'led light': 'https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?w=400&h=400&fit=crop',
  'led strip': 'https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?w=400&h=400&fit=crop',
  'earbuds': 'https://images.unsplash.com/photo-1590658268037-6bf12f032f55?w=400&h=400&fit=crop',
  'wireless': 'https://images.unsplash.com/photo-1590658268037-6bf12f032f55?w=400&h=400&fit=crop',
  'charger': 'https://images.unsplash.com/photo-1622957461168-202e5b43174e?w=400&h=400&fit=crop',
  'portable charger': 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=400&h=400&fit=crop',
  // Fashion
  'sunglasses': 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&h=400&fit=crop',
  'watch': 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=400&h=400&fit=crop',
  'jewellery': 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&h=400&fit=crop',
  'necklace': 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&h=400&fit=crop',
  // Apparel
  't-shirt': 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop',
  'hoodie': 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=400&fit=crop',
  'mug': 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=400&h=400&fit=crop',
  'poster': 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400&h=400&fit=crop',
  // Home
  'pillow': 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=400&h=400&fit=crop',
  'blanket': 'https://images.unsplash.com/photo-1580301762395-21ce4d7a4c1d?w=400&h=400&fit=crop',
  'kitchen': 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=400&fit=crop',
  'organiser': 'https://images.unsplash.com/photo-1506806732259-39c2d0268443?w=400&h=400&fit=crop',
  // Beauty
  'makeup brush': 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400&h=400&fit=crop',
  'makeup': 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400&h=400&fit=crop',
  'skincare': 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400&h=400&fit=crop',
  'beauty': 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=400&fit=crop',
  'hair': 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&h=400&fit=crop',
  // Sports
  'water bottle': 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&h=400&fit=crop',
  'yoga mat': 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400&h=400&fit=crop',
  'resistance band': 'https://images.unsplash.com/photo-1598289431512-b97b0917affc?w=400&h=400&fit=crop',
  'gym bag': 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=400&h=400&fit=crop',
  'bag': 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=400&h=400&fit=crop',
  // Pets
  'dog toy': 'https://images.unsplash.com/photo-1535294435445-d7249b8f7b5f?w=400&h=400&fit=crop',
  'pet bed': 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=400&h=400&fit=crop',
  'cat toy': 'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=400&h=400&fit=crop',
  'pet bowl': 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400&h=400&fit=crop',
  'pet': 'https://images.unsplash.com/photo-1535294435445-d7249b8f7b5f?w=400&h=400&fit=crop',
  // Toys
  'fidget toy': 'https://images.unsplash.com/photo-1622297845775-5ff3fef71d13?w=400&h=400&fit=crop',
  'fidget': 'https://images.unsplash.com/photo-1622297845775-5ff3fef71d13?w=400&h=400&fit=crop',
  'puzzle': 'https://images.unsplash.com/photo-1606503153255-59d8b8b82176?w=400&h=400&fit=crop',
  'rc car': 'https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?w=400&h=400&fit=crop',
  'plush': 'https://images.unsplash.com/photo-1559715541-5daf8a0296d0?w=400&h=400&fit=crop',
  'toy': 'https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=400&h=400&fit=crop',
  // Automotive
  'car phone': 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=400&h=400&fit=crop',
  'car light': 'https://images.unsplash.com/photo-1489824904134-891ab64532f1?w=400&h=400&fit=crop',
  'car organiser': 'https://images.unsplash.com/photo-1502877338535-766e1452684a?w=400&h=400&fit=crop',
  'dash cam': 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&h=400&fit=crop',
  'car': 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=400&h=400&fit=crop',
  // Category name fallbacks (when search term is just the category name)
  'fashion': 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=400&fit=crop',
  'electronics': 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=400&h=400&fit=crop',
  'sports': 'https://images.unsplash.com/photo-1461896836934-bd45ba74d23f?w=400&h=400&fit=crop',
  'automotive': 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=400&h=400&fit=crop',
  'custom': 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop',
}

function getImageForQuery(query) {
  const q = (query || '').toLowerCase()
  for (const [key, url] of Object.entries(SAMPLE_IMAGES)) {
    if (q.includes(key)) return url
  }
  return ''
}

export function getSampleCJProducts() {
  return []
}

export function getSamplePrintfulProducts() {
  return []
}

export function getSamplePrintifyProducts() {
  return []
}

export function getSampleGootenProducts() {
  return []
}

// Simple hash for deterministic sample IDs
function hash(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h).toString(36)
}

// ============================================
// PRICE COMPARISON — Group same/similar products
// ============================================
export function groupByProduct(products) {
  // Normalise title for matching
  const normalise = (title) => title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    // Remove supplier-specific suffixes
    .replace(/\s*-\s*(premium|budget|deluxe|value|bulk|custom|print|your design).*$/i, '')
    .replace(/\s*(by printful|by printify|by gooten|from cj).*$/i, '')

  const groups = new Map()

  for (const product of products) {
    const key = normalise(product.title)

    if (groups.has(key)) {
      groups.get(key).push(product)
    } else {
      groups.set(key, [product])
    }
  }

  // Convert to array, sort each group by totalCost (cheapest first)
  const result = []
  for (const [, group] of groups) {
    if (group.length > 1) {
      // Multiple suppliers — sort by total cost
      group.sort((a, b) => a.totalCost - b.totalCost)
      // Mark the cheapest as best deal
      group[0]._bestDeal = true
      // Add comparison info to each product
      const cheapest = group[0].totalCost
      for (const p of group) {
        p._supplierCount = group.length
        p._alternatives = group
          .filter(alt => alt.id !== p.id)
          .map(alt => ({
            id: alt.id,
            supplier: alt.supplier,
            supplierLogo: alt.supplierLogo,
            totalCost: alt.totalCost,
            deliveryDays: alt.deliveryDays,
          }))
        if (p.totalCost > cheapest) {
          p._savings = Math.round((p.totalCost - cheapest) * 100) / 100
        }
      }
    }
    // Push the best deal (or only product) first
    result.push(...group)
  }

  return result
}

// ============================================
// SUPPLIER SEARCH MAP & FILTERING
// ============================================
const SUPPLIER_SEARCH_MAP = {
  'CJ Dropshipping': (q, page) => searchCJ(q, page),
  'AliExpress': (q, page) => searchAliExpress(q, page),
  'Printful': (q) => searchPrintful(q),
  'Printify': (q) => searchPrintify(q),
  'Gooten': (q) => searchGooten(q),
}

export function parseSuppliers(suppliersParam) {
  if (!suppliersParam) return Object.keys(SUPPLIER_SEARCH_MAP)
  return suppliersParam.split(',').filter(s => SUPPLIER_SEARCH_MAP[s])
}

export function getSampleForSuppliers() {
  return []
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

  // Also include matching curated products
  const curated = getCuratedTrending(null, query)
  if (curated.length > 0) {
    const existingIds = new Set(products.map(p => p.id))
    for (const c of curated) {
      // Only include curated items from active suppliers
      if (!existingIds.has(c.id) && activeSuppliers.includes(c.supplier)) {
        products.push(c)
        existingIds.add(c.id)
      }
    }
  }

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
  custom: ['t-shirt', 'mug', 'phone case', 'hoodie', 'poster'],
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
  { id: 'custom', name: 'Custom / Print-on-Demand', emoji: '🎨', popular: true },
]

// ============================================
// ALL SUPPLIERS (for frontend filter UI)
// ============================================
export const ALL_SUPPLIERS = [
  { value: '', label: 'All Suppliers' },
  { value: 'CJ Dropshipping', label: '📦 CJ Dropshipping', type: 'general' },
  { value: 'AliExpress', label: '🛒 AliExpress', type: 'general' },
  { value: 'Printful', label: '🎨 Printful', type: 'pod' },
  { value: 'Printify', label: '🖨️ Printify', type: 'pod' },
  { value: 'Gooten', label: '🏭 Gooten', type: 'pod' },
]

// ============================================
// SUPPLIER ORDER PLACEMENT
// ============================================

/**
 * Place an order with CJ Dropshipping
 * API docs: https://developers.cjdropshipping.com/api2.0/v1/shopping/order/createOrder
 */
export async function placeCJOrder({ productId, quantity, shippingAddress }) {
  const token = await getCJAccessToken()
  if (!token) return { success: false, error: 'CJ auth failed — no API key or token' }

  try {
    // Strip the cj_ prefix if present
    const cjProductId = productId.replace(/^cj_/, '')

    const orderPayload = {
      orderNumber: `TG-${Date.now().toString(36).toUpperCase()}`,
      shippingZip: shippingAddress.zip || shippingAddress.postcode || '',
      shippingCountryCode: shippingAddress.country_code || 'AU',
      shippingCountry: shippingAddress.country || 'Australia',
      shippingProvince: shippingAddress.state || shippingAddress.province || '',
      shippingCity: shippingAddress.city || '',
      shippingAddress: shippingAddress.line1 || shippingAddress.address || '',
      shippingCustomerName: shippingAddress.name || '',
      shippingPhone: shippingAddress.phone || '',
      products: [{
        vid: cjProductId,
        quantity: quantity || 1,
      }],
    }

    const response = await fetch('https://developers.cjdropshipping.com/api2.0/v1/shopping/order/createOrder', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CJ-Access-Token': token,
      },
      body: JSON.stringify(orderPayload),
    })

    const data = await response.json()
    if (data.code === 200 && data.data) {
      return {
        success: true,
        supplier_order_id: data.data.orderId || data.data.orderNum || data.data,
        status: 'processing',
      }
    }
    return { success: false, error: data.message || `CJ order failed (code ${data.code})` }
  } catch (err) {
    console.error('CJ place order error:', err.message)
    return { success: false, error: err.message }
  }
}

/**
 * Place an order with Printful
 * API docs: https://developers.printful.com/docs/#tag/Orders/operation/createOrder
 */
export async function placePrintfulOrder({ productId, quantity, shippingAddress }) {
  const apiKey = process.env.PRINTFUL_API_KEY
  if (!apiKey) return { success: false, error: 'Printful API key not configured' }

  try {
    const pfProductId = productId.replace(/^pf_/, '')

    const orderPayload = {
      recipient: {
        name: shippingAddress.name || '',
        address1: shippingAddress.line1 || shippingAddress.address || '',
        city: shippingAddress.city || '',
        state_code: shippingAddress.state || '',
        country_code: shippingAddress.country_code || 'AU',
        zip: shippingAddress.zip || shippingAddress.postcode || '',
        phone: shippingAddress.phone || '',
        email: shippingAddress.email || '',
      },
      items: [{
        sync_variant_id: pfProductId,
        quantity: quantity || 1,
      }],
    }

    const response = await fetch('https://api.printful.com/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(orderPayload),
    })

    const data = await response.json()
    if (response.ok && data.result) {
      return {
        success: true,
        supplier_order_id: String(data.result.id),
        status: data.result.status || 'pending',
      }
    }
    return { success: false, error: data.result?.message || data.error?.message || 'Printful order failed' }
  } catch (err) {
    console.error('Printful place order error:', err.message)
    return { success: false, error: err.message }
  }
}

/**
 * Place an order with Printify
 * API docs: https://developers.printify.com/#create-a-new-order
 */
export async function placePrintifyOrder({ productId, quantity, shippingAddress }) {
  const apiKey = process.env.PRINTIFY_API_KEY
  if (!apiKey) return { success: false, error: 'Printify API key not configured' }

  try {
    const pyProductId = productId.replace(/^py_/, '')

    // Printify requires a shop_id — read from admin_settings
    let shopId = process.env.PRINTIFY_SHOP_ID
    if (!shopId) {
      try {
        const r = await sql`SELECT value FROM admin_settings WHERE key = 'printify_shop_id'`
        shopId = r.rows[0]?.value
      } catch { /* continue without */ }
    }
    if (!shopId) return { success: false, error: 'Printify shop ID not configured' }

    const orderPayload = {
      external_id: `TG-${Date.now().toString(36).toUpperCase()}`,
      line_items: [{
        product_id: pyProductId,
        variant_id: 1,
        quantity: quantity || 1,
      }],
      shipping_method: 1,
      address_to: {
        first_name: (shippingAddress.name || '').split(' ')[0] || '',
        last_name: (shippingAddress.name || '').split(' ').slice(1).join(' ') || '',
        email: shippingAddress.email || '',
        phone: shippingAddress.phone || '',
        country: shippingAddress.country_code || 'AU',
        region: shippingAddress.state || '',
        address1: shippingAddress.line1 || shippingAddress.address || '',
        city: shippingAddress.city || '',
        zip: shippingAddress.zip || shippingAddress.postcode || '',
      },
    }

    const response = await fetch(`https://api.printify.com/v1/shops/${shopId}/orders.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(orderPayload),
    })

    const data = await response.json()
    if (response.ok && data.id) {
      return {
        success: true,
        supplier_order_id: data.id,
        status: data.status || 'pending',
      }
    }
    return { success: false, error: data.message || data.errors?.[0] || 'Printify order failed' }
  } catch (err) {
    console.error('Printify place order error:', err.message)
    return { success: false, error: err.message }
  }
}

/**
 * Place an order with Gooten
 * API docs: https://www.gooten.com/api
 */
export async function placeGootenOrder({ productId, quantity, shippingAddress }) {
  const recipeId = process.env.GOOTEN_RECIPE_ID
  const billingKey = process.env.GOOTEN_PARTNER_BILLING_KEY
  if (!recipeId || !billingKey) return { success: false, error: 'Gooten API keys not configured' }

  try {
    const gtProductId = productId.replace(/^gt_/, '')

    const orderPayload = {
      ShipToAddress: {
        FirstName: (shippingAddress.name || '').split(' ')[0] || '',
        LastName: (shippingAddress.name || '').split(' ').slice(1).join(' ') || '',
        Line1: shippingAddress.line1 || shippingAddress.address || '',
        City: shippingAddress.city || '',
        State: shippingAddress.state || '',
        CountryCode: shippingAddress.country_code || 'AU',
        PostalCode: shippingAddress.zip || shippingAddress.postcode || '',
        Phone: shippingAddress.phone || '',
        Email: shippingAddress.email || '',
      },
      Items: [{
        ProductId: parseInt(gtProductId) || gtProductId,
        Quantity: quantity || 1,
        SKUs: [{ SKU: gtProductId, Quantity: quantity || 1 }],
      }],
      Payment: { PartnerBillingKey: billingKey },
    }

    const response = await fetch(`https://api.print.io/api/v/4/source/api/orders?recipeId=${recipeId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload),
    })

    const data = await response.json()
    if (response.ok && (data.Id || data.id)) {
      return {
        success: true,
        supplier_order_id: String(data.Id || data.id),
        status: 'processing',
      }
    }
    return { success: false, error: data.ErrorMessage || data.error || 'Gooten order failed' }
  } catch (err) {
    console.error('Gooten place order error:', err.message)
    return { success: false, error: err.message }
  }
}

/**
 * Route an order to the correct supplier based on supplier name
 */
export async function placeSupplierOrder(supplier, orderDetails) {
  const name = (supplier || '').toLowerCase()
  if (name.includes('cj')) return placeCJOrder(orderDetails)
  if (name.includes('printful')) return placePrintfulOrder(orderDetails)
  if (name.includes('printify')) return placePrintifyOrder(orderDetails)
  if (name.includes('gooten')) return placeGootenOrder(orderDetails)
  // AliExpress doesn't support direct order placement via their DS API
  return { success: false, error: `Order placement not supported for supplier: ${supplier}` }
}

// ============================================
// SUPPLIER ORDER TRACKING
// ============================================

/**
 * Query CJ for order status and tracking
 */
export async function getCJOrderTracking(supplierOrderId) {
  const token = await getCJAccessToken()
  if (!token) return { success: false, error: 'CJ auth failed' }

  try {
    const response = await fetch(`https://developers.cjdropshipping.com/api2.0/v1/shopping/order/getOrderDetail?orderId=${encodeURIComponent(supplierOrderId)}`, {
      headers: { 'CJ-Access-Token': token },
    })

    const data = await response.json()
    if (data.code === 200 && data.data) {
      const order = data.data
      return {
        success: true,
        status: mapCJStatus(order.orderStatus),
        tracking_number: order.trackingNumber || order.logisticInfo?.trackNumber || null,
        tracking_url: order.logisticInfo?.trackingUrl || null,
        supplier_status: order.orderStatus,
        updated_at: order.updateTime || order.createTime,
      }
    }
    return { success: false, error: data.message || 'CJ tracking query failed' }
  } catch (err) {
    console.error('CJ tracking error:', err.message)
    return { success: false, error: err.message }
  }
}

function mapCJStatus(cjStatus) {
  const map = {
    CREATED: 'processing',
    IN_CART: 'processing',
    UNPAID: 'processing',
    UNSHIPPED: 'processing',
    SHIPPED: 'shipped',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled',
  }
  return map[(cjStatus || '').toUpperCase()] || 'processing'
}

/**
 * Query Printful for order status and tracking
 */
export async function getPrintfulOrderTracking(supplierOrderId) {
  const apiKey = process.env.PRINTFUL_API_KEY
  if (!apiKey) return { success: false, error: 'Printful API key not configured' }

  try {
    const response = await fetch(`https://api.printful.com/orders/${encodeURIComponent(supplierOrderId)}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    })

    const data = await response.json()
    if (response.ok && data.result) {
      const order = data.result
      const shipment = order.shipments?.[0]
      return {
        success: true,
        status: mapPrintfulStatus(order.status),
        tracking_number: shipment?.tracking_number || null,
        tracking_url: shipment?.tracking_url || null,
        supplier_status: order.status,
        updated_at: order.updated,
      }
    }
    return { success: false, error: data.error?.message || 'Printful tracking query failed' }
  } catch (err) {
    console.error('Printful tracking error:', err.message)
    return { success: false, error: err.message }
  }
}

function mapPrintfulStatus(pfStatus) {
  const map = {
    draft: 'pending',
    pending: 'processing',
    failed: 'processing',
    canceled: 'cancelled',
    inprocess: 'processing',
    onhold: 'processing',
    partial: 'shipped',
    fulfilled: 'shipped',
    returned: 'cancelled',
  }
  return map[(pfStatus || '').toLowerCase()] || 'processing'
}

/**
 * Query Printify for order status and tracking
 */
export async function getPrintifyOrderTracking(supplierOrderId) {
  const apiKey = process.env.PRINTIFY_API_KEY
  if (!apiKey) return { success: false, error: 'Printify API key not configured' }

  let shopId = process.env.PRINTIFY_SHOP_ID
  if (!shopId) {
    try {
      const r = await sql`SELECT value FROM admin_settings WHERE key = 'printify_shop_id'`
      shopId = r.rows[0]?.value
    } catch { /* continue */ }
  }
  if (!shopId) return { success: false, error: 'Printify shop ID not configured' }

  try {
    const response = await fetch(`https://api.printify.com/v1/shops/${shopId}/orders/${encodeURIComponent(supplierOrderId)}.json`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    })

    const data = await response.json()
    if (response.ok && data.id) {
      const shipment = data.shipments?.[0]
      return {
        success: true,
        status: mapPrintifyStatus(data.status),
        tracking_number: shipment?.tracking_number || null,
        tracking_url: shipment?.tracking_url || null,
        supplier_status: data.status,
        updated_at: data.updated_at,
      }
    }
    return { success: false, error: data.message || 'Printify tracking query failed' }
  } catch (err) {
    console.error('Printify tracking error:', err.message)
    return { success: false, error: err.message }
  }
}

function mapPrintifyStatus(pyStatus) {
  const map = {
    'on-hold': 'pending',
    'sending-to-production': 'processing',
    'in-production': 'processing',
    'shipping': 'shipped',
    'fulfilled': 'delivered',
    'canceled': 'cancelled',
  }
  return map[(pyStatus || '').toLowerCase()] || 'processing'
}

/**
 * Query Gooten for order status and tracking
 */
export async function getGootenOrderTracking(supplierOrderId) {
  const recipeId = process.env.GOOTEN_RECIPE_ID
  if (!recipeId) return { success: false, error: 'Gooten API keys not configured' }

  try {
    const response = await fetch(`https://api.print.io/api/v/4/source/api/orders/${encodeURIComponent(supplierOrderId)}?recipeId=${recipeId}`)
    const data = await response.json()

    if (response.ok && (data.Id || data.id)) {
      const shipment = data.Shipments?.[0] || data.shipments?.[0]
      return {
        success: true,
        status: mapGootenStatus(data.Status || data.status),
        tracking_number: shipment?.TrackingNumber || shipment?.tracking_number || null,
        tracking_url: shipment?.TrackingUrl || shipment?.tracking_url || null,
        supplier_status: data.Status || data.status,
        updated_at: data.DateModified || data.date_modified,
      }
    }
    return { success: false, error: 'Gooten tracking query failed' }
  } catch (err) {
    console.error('Gooten tracking error:', err.message)
    return { success: false, error: err.message }
  }
}

function mapGootenStatus(gtStatus) {
  const s = (gtStatus || '').toLowerCase()
  if (s.includes('ship')) return 'shipped'
  if (s.includes('deliver') || s.includes('complete')) return 'delivered'
  if (s.includes('cancel')) return 'cancelled'
  return 'processing'
}

/**
 * Route a tracking query to the correct supplier
 */
export async function getSupplierOrderTracking(supplier, supplierOrderId) {
  if (!supplierOrderId) return { success: false, error: 'No supplier order ID' }
  const name = (supplier || '').toLowerCase()
  if (name.includes('cj')) return getCJOrderTracking(supplierOrderId)
  if (name.includes('printful')) return getPrintfulOrderTracking(supplierOrderId)
  if (name.includes('printify')) return getPrintifyOrderTracking(supplierOrderId)
  if (name.includes('gooten')) return getGootenOrderTracking(supplierOrderId)
  return { success: false, error: `Tracking not supported for supplier: ${supplier}` }
}
