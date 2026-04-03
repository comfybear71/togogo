// Shared supplier logic for Vercel serverless functions
// Searches AliExpress through ToGoGo's master API keys
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
    .replace(/\s*-\s*(premium|budget|deluxe|value|bulk).*$/i, '')
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

  // Convert to array, sort each group by totalCost (cheapest first)
  const result = []
  for (const [, group] of groups) {
    if (group.length > 1) {
      // Multiple entries — sort by total cost
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
