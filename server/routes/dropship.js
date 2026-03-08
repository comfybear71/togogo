import { Router } from 'express'
import crypto from 'crypto'
import { requireAuth, supabase } from '../middleware/auth.js'

const router = Router()

// ============================================
// UNIFIED PRODUCT SEARCH — The master gateway
// Searches ALL suppliers through ToGoGo's API keys
// Users never need their own accounts
// ============================================
// Map supplier display names to search functions
const SUPPLIER_SEARCH_MAP = {
  'CJ Dropshipping': (q, page) => searchCJ(q, page),
  'AliExpress': (q, page) => searchAliExpress(q, page),
  'Printful': (q) => searchPrintful(q),
  'Printify': (q) => searchPrintify(q),
  'Gooten': (q) => searchGooten(q),
}

function parseSuppliers(suppliersParam) {
  if (!suppliersParam) return Object.keys(SUPPLIER_SEARCH_MAP)
  return suppliersParam.split(',').filter(s => SUPPLIER_SEARCH_MAP[s])
}

router.get('/search', async (req, res, next) => {
  try {
    const { query, page = 1, category, suppliers: suppliersParam, sort = 'relevance' } = req.query

    if (!query && !category) {
      return res.status(400).json({ error: 'Search query or category is required' })
    }

    const activeSuppliers = parseSuppliers(suppliersParam)
    const searchTerm = query || category

    // Only search selected suppliers
    const results = await Promise.allSettled(
      activeSuppliers.map(s => SUPPLIER_SEARCH_MAP[s](searchTerm, Number(page)))
    )

    // Merge and normalise into unified format
    let products = results
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => r.value)

    // Sort
    if (sort === 'price_low') {
      products.sort((a, b) => a.cost - b.cost)
    } else if (sort === 'price_high') {
      products.sort((a, b) => b.cost - a.cost)
    } else if (sort === 'fastest') {
      products.sort((a, b) => a.deliveryDays - b.deliveryDays)
    } else if (sort === 'margin') {
      products.sort((a, b) => b.suggestedMargin - a.suggestedMargin)
    }

    const hasLiveData = results.some(r =>
      r.status === 'fulfilled' && r.value.length > 0 && r.value[0]._live
    )

    res.json({
      products,
      total: products.length,
      page: Number(page),
      suppliers: activeSuppliers,
      live: hasLiveData,
      message: hasLiveData ? null : 'Showing sample data. Live supplier APIs will be connected soon.',
    })
  } catch (err) {
    next(err)
  }
})

// Get trending/popular products (no search needed)
// Map category IDs to actual product search terms that return results
const TRENDING_TERMS = {
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

// Sample data fallback functions by supplier name
const SUPPLIER_SAMPLE_MAP = {
  'CJ Dropshipping': getSampleCJProducts,
  'AliExpress': getSampleAliExpressProducts,
  'Printful': getSamplePrintfulProducts,
  'Printify': getSamplePrintifyProducts,
  'Gooten': getSampleGootenProducts,
}

router.get('/trending', async (req, res, next) => {
  try {
    const { category = '', suppliers: suppliersParam } = req.query
    const activeSuppliers = parseSuppliers(suppliersParam)
    const terms = TRENDING_TERMS[category] || TRENDING_TERMS['']

    // Pick 2 random terms to get variety
    const shuffled = [...terms].sort(() => Math.random() - 0.5)
    const searchTerms = shuffled.slice(0, 2)

    // Only query selected suppliers
    const results = await Promise.allSettled(
      activeSuppliers.flatMap(s =>
        searchTerms.map(term => SUPPLIER_SEARCH_MAP[s](term, 1))
      )
    )

    let products = results
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => r.value)

    const hasLiveData = products.some(p => p._live)

    // If live APIs returned nothing, use sample data from selected suppliers
    if (products.length === 0) {
      products = activeSuppliers.flatMap(s =>
        SUPPLIER_SAMPLE_MAP[s] ? SUPPLIER_SAMPLE_MAP[s](searchTerms[0]) : []
      )
    }

    // Deduplicate by id, shuffle, and limit
    const seen = new Set()
    products = products
      .filter(p => { if (seen.has(p.id)) return false; seen.add(p.id); return true })
      .sort(() => Math.random() - 0.5)
      .slice(0, 20)

    res.json({ products, live: hasLiveData })
  } catch (err) {
    next(err)
  }
})

// Get product categories
router.get('/categories', async (_req, res) => {
  res.json({
    categories: [
      { id: 'electronics', name: 'Electronics & Gadgets', emoji: '📱', popular: true },
      { id: 'fashion', name: 'Fashion & Accessories', emoji: '👗', popular: true },
      { id: 'home', name: 'Home & Garden', emoji: '🏡', popular: true },
      { id: 'beauty', name: 'Beauty & Health', emoji: '💄', popular: true },
      { id: 'toys', name: 'Toys & Hobbies', emoji: '🎮', popular: false },
      { id: 'sports', name: 'Sports & Outdoors', emoji: '⚽', popular: false },
      { id: 'pets', name: 'Pet Supplies', emoji: '🐾', popular: false },
      { id: 'automotive', name: 'Automotive', emoji: '🚗', popular: false },
      { id: 'custom', name: 'Custom / Print-on-Demand', emoji: '🎨', popular: true },
    ],
  })
})

// Import product from supplier URL
router.post('/import', requireAuth, async (req, res, next) => {
  try {
    const { url, supplierType } = req.body

    let productData

    if (supplierType === 'cj' || url.includes('cjdropshipping.com')) {
      productData = await importFromCJ(url)
    } else if (url.includes('aliexpress.com')) {
      productData = await importFromAliExpress(url)
    } else {
      productData = {
        title: 'Imported Product',
        description: 'Product imported from external supplier. Please edit details.',
        images: [],
        supplierCost: 0,
        supplierUrl: url,
        source: 'manual',
      }
    }

    res.json(productData)
  } catch (err) {
    next(err)
  }
})

// Search CJ Dropshipping products (existing endpoint kept for direct access)
router.get('/cj/search', requireAuth, async (req, res, next) => {
  try {
    const { query, page = 1 } = req.query
    const products = await searchCJ(query, Number(page))
    const hasLiveData = products.length > 0 && products[0]._live

    res.json({
      products,
      source: hasLiveData ? 'cj_api' : 'sample_data',
      message: hasLiveData ? null : 'CJ Dropshipping API key not configured. Showing sample data.',
    })
  } catch (err) {
    next(err)
  }
})

// Search AliExpress products
router.get('/aliexpress/search', async (req, res, next) => {
  try {
    const { query, page = 1 } = req.query
    const products = await searchAliExpress(query, Number(page))
    const hasLiveData = products.length > 0 && products[0]._live

    res.json({
      products,
      source: hasLiveData ? 'aliexpress_api' : 'sample_data',
      message: hasLiveData ? null : 'AliExpress API keys not configured. Showing sample data.',
    })
  } catch (err) {
    next(err)
  }
})

// AliExpress categories
router.get('/aliexpress/categories', async (_req, res, next) => {
  try {
    const data = await callAliExpressAPI('aliexpress.ds.category.get', {})
    const categories = data?.aliexpress_ds_category_get_response?.result?.categories?.category || []
    res.json({ categories })
  } catch (err) {
    // Return empty if API not configured
    res.json({ categories: [], message: 'AliExpress API keys not configured.' })
  }
})

// AliExpress shipping calculator
router.get('/aliexpress/shipping', async (req, res, next) => {
  try {
    const { product_id, country = 'US', quantity = 1 } = req.query
    if (!product_id) return res.status(400).json({ error: 'product_id required' })

    const data = await callAliExpressAPI('aliexpress.logistics.buyer.freight.calculate', {
      product_id,
      country_code: country,
      product_num: String(quantity),
      send_goods_country_code: 'CN',
    })

    const options = data?.aliexpress_logistics_buyer_freight_calculate_response?.result?.aeop_freight_calculate_result_for_buyer_d_t_o_list?.aeop_freight_calculate_result_for_buyer_dto || []
    res.json({
      shipping_options: options.map(o => ({
        service: o.service_name || o.logistics_company || '',
        cost: parseFloat(o.freight?.cent || o.freight?.amount || '0') / 100,
        currency: o.freight?.currency_code || o.freight?.currency || 'USD',
        estimated_days: o.estimated_delivery_time || o.ship_to_days || null,
        tracking: o.tracking_available !== false,
      })),
    })
  } catch (err) {
    next(err)
  }
})

// AliExpress hot products / recommended feed
router.get('/aliexpress/hot', async (req, res, next) => {
  try {
    const { category, page = 1, country = 'US' } = req.query

    const feeds = await getAliExpressFeedNames()
    const feedName = feeds[0]?.feed_name || feeds[0] || 'DS bestselling products'

    const data = await callAliExpressAPI('aliexpress.ds.recommend.feed.get', {
      feed_name: feedName,
      country: country,
      target_currency: 'USD',
      target_language: 'EN',
      page_no: String(page),
      page_size: '20',
      sort: 'volumeDesc',
      ...(category ? { category_id: category } : {}),
    })

    const resp = data?.aliexpress_ds_recommend_feed_get_response?.result
    const products = (resp?.products?.product || []).map(p => normaliseAliExpressProduct(p))

    res.json({
      products,
      total: resp?.total_record_count || products.length,
      live: products.length > 0 && products[0]?._live,
    })
  } catch (err) {
    // Fallback to sample data
    res.json({ products: getSampleAliExpressProducts('trending'), live: false })
  }
})

// Search Printful products
router.get('/printful/search', async (req, res, next) => {
  try {
    const { query } = req.query
    const products = await searchPrintful(query)
    const hasLiveData = products.length > 0 && products[0]._live

    res.json({
      products,
      source: hasLiveData ? 'printful_api' : 'sample_data',
      message: hasLiveData ? null : 'Printful API key not configured. Showing sample data.',
    })
  } catch (err) {
    next(err)
  }
})

// Best supplier finder - compare across suppliers
router.post('/compare', requireAuth, async (req, res, next) => {
  try {
    const { productName } = req.body

    const results = await Promise.allSettled([
      searchCJ(productName, 1),
      searchAliExpress(productName, 1),
      searchPrintful(productName),
      searchPrintify(productName),
      searchGooten(productName),
      searchManualSuppliers(productName),
    ])

    const suppliers = results
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => r.value)
      .sort((a, b) => a.cost - b.cost)

    if (suppliers.length > 0) {
      suppliers[0].recommended = true
    }

    res.json({ suppliers })
  } catch (err) {
    next(err)
  }
})

// Get saved suppliers for user
router.get('/suppliers', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    res.json(data)
  } catch (err) {
    next(err)
  }
})

// ============================================
// SUPPLIER API HELPERS
// All use ToGoGo's master API keys
// ============================================

// --- CJ Dropshipping ---
// --- CJ Dropshipping access token management ---
// CJ API key must be exchanged for an access token (valid 15 days)
let cjAccessToken = null
let cjTokenExpiry = 0

async function getCJAccessToken() {
  const apiKey = process.env.CJ_DROPSHIPPING_API_KEY
  if (!apiKey) return null

  const now = Date.now()
  // Return cached token if still valid (refresh 1 day early)
  if (cjAccessToken && cjTokenExpiry > now + 86400000) {
    return cjAccessToken
  }

  const response = await fetch('https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey }),
  })

  if (!response.ok) throw new Error(`CJ auth failed: ${response.status}`)

  const data = await response.json()
  if (!data.data?.accessToken) throw new Error(`CJ auth error: ${data.message || 'no token'}`)

  cjAccessToken = data.data.accessToken
  // Parse expiry or default to 14 days
  cjTokenExpiry = data.data.accessTokenExpiryDate
    ? new Date(data.data.accessTokenExpiryDate).getTime()
    : now + 14 * 86400000

  return cjAccessToken
}

async function searchCJ(query, page = 1) {
  const apiKey = process.env.CJ_DROPSHIPPING_API_KEY
  if (!apiKey) {
    return getSampleCJProducts(query)
  }

  try {
    const token = await getCJAccessToken()
    if (!token) return getSampleCJProducts(query)

    const response = await fetch('https://developers.cjdropshipping.com/api2.0/v1/product/list', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CJ-Access-Token': token,
      },
      body: JSON.stringify({
        productNameEn: query,
        pageNum: page,
        pageSize: 20,
      }),
    })

    if (!response.ok) throw new Error('CJ API error')

    const data = await response.json()
    const products = (data.data?.list || []).map(p => normaliseCJProduct(p))

    // If API returned 0 results for this query, fall back to samples
    if (products.length === 0) {
      return getSampleCJProducts(query)
    }

    return products
  } catch {
    return getSampleCJProducts(query)
  }
}

function normaliseCJProduct(p) {
  const cost = p.sellPrice || 0
  const shipping = p.shippingPrice || 0
  const suggestedPrice = Math.ceil((cost + shipping) * 2.5 * 100) / 100 // 2.5x markup
  return {
    id: `cj_${p.pid}`,
    title: p.productNameEn,
    description: p.description || '',
    image: p.productImage || (p.productImageSet?.[0]) || '',
    images: p.productImageSet || [],
    cost,
    shipping,
    totalCost: Math.round((cost + shipping) * 100) / 100,
    suggestedPrice,
    suggestedMargin: Math.round((suggestedPrice - cost - shipping) * 100) / 100,
    deliveryDays: p.logisticsDays || 14,
    supplier: 'CJ Dropshipping',
    supplierLogo: '📦',
    sourceUrl: p.productUrl || '',
    minOrderQty: p.moqNum || 1,
    category: p.categoryName || '',
    _live: true,
  }
}

async function importFromCJ(url) {
  const apiKey = process.env.CJ_DROPSHIPPING_API_KEY
  if (!apiKey) {
    return {
      title: 'CJ Dropshipping Product',
      description: 'Configure CJ API key to auto-import product details.',
      images: [],
      supplierCost: 0,
      source: 'cj',
      supplierUrl: url,
    }
  }

  const match = url.match(/product\/(\d+)/)
  const productId = match?.[1]

  if (!productId) {
    return { title: 'CJ Product', description: 'Could not extract product ID from URL.', images: [], supplierCost: 0, source: 'cj', supplierUrl: url }
  }

  const token = await getCJAccessToken()
  if (!token) {
    return { title: 'CJ Product', description: 'Could not authenticate with CJ API.', images: [], supplierCost: 0, source: 'cj', supplierUrl: url }
  }

  const response = await fetch('https://developers.cjdropshipping.com/api2.0/v1/product/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'CJ-Access-Token': token },
    body: JSON.stringify({ pid: productId }),
  })

  const data = await response.json()
  const p = data.data

  return {
    title: p?.productNameEn || 'CJ Product',
    description: p?.description || '',
    images: p?.productImageSet || [],
    supplierCost: p?.sellPrice || 0,
    shippingCost: p?.shippingPrice || 0,
    source: 'cj',
    supplierUrl: url,
  }
}

// --- Printful ---
// Cache the catalog since it changes rarely (avoid burning rate limit)
let printfulCatalogCache = null
let printfulCacheTime = 0
const PRINTFUL_CACHE_TTL = 30 * 60 * 1000 // 30 minutes

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

// Cache individual product pricing to avoid hitting rate limits
const printfulPriceCache = new Map()
const PRINTFUL_PRICE_CACHE_TTL = 60 * 60 * 1000 // 1 hour

async function fetchPrintfulProductPrice(apiKey, productId) {
  const cacheKey = `pf_price_${productId}`
  const cached = printfulPriceCache.get(cacheKey)
  if (cached && (Date.now() - cached.time) < PRINTFUL_PRICE_CACHE_TTL) {
    return cached.price
  }

  try {
    const response = await fetch(`https://api.printful.com/products/${productId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    })
    if (!response.ok) return null

    const data = await response.json()
    const variants = data.result?.variants || []
    if (variants.length === 0) return null

    // Get the lowest variant price (Printful wholesale cost)
    const lowestPrice = variants.reduce((min, v) => {
      const price = parseFloat(v.price || '999')
      return price < min ? price : min
    }, 999)

    const result = lowestPrice < 999 ? lowestPrice : null
    printfulPriceCache.set(cacheKey, { price: result, time: Date.now() })
    return result
  } catch {
    return null
  }
}

async function searchPrintful(query) {
  const apiKey = process.env.PRINTFUL_API_KEY
  if (!apiKey) {
    return getSamplePrintfulProducts(query)
  }

  try {
    const catalog = await fetchPrintfulCatalog(apiKey)
    const q = (query || '').toLowerCase().trim()

    let matches
    // If no query or very broad, return a curated mix of popular product types
    if (!q || q.length < 2) {
      matches = catalog
        .filter(p => !p.is_discontinued)
        .slice(0, 10)
    } else {
      // Split query into words for flexible matching
      const words = q.split(/\s+/).filter(w => w.length >= 2)

      matches = catalog
        .filter(p => {
          if (p.is_discontinued) return false
          const text = [p.title, p.type_name, p.brand, p.model]
            .map(f => (f || '').toLowerCase())
            .join(' ')
          return words.some(w => text.includes(w)) || text.includes(q)
        })
        .slice(0, 15)

      // If strict search returned nothing, try looser single-word match
      if (matches.length === 0 && words.length > 0) {
        matches = catalog
          .filter(p => {
            if (p.is_discontinued) return false
            const text = [p.title, p.type_name].map(f => (f || '').toLowerCase()).join(' ')
            return text.includes(words[0]) || text.includes(q.slice(0, 3))
          })
          .slice(0, 10)
      }
    }

    // Fetch real pricing for up to 5 products in parallel (rate limit friendly)
    const priceFetches = matches.slice(0, 5).map(p =>
      fetchPrintfulProductPrice(apiKey, p.id)
    )
    const prices = await Promise.allSettled(priceFetches)

    return matches.map((p, i) => {
      const realPrice = i < 5 && prices[i].status === 'fulfilled' ? prices[i].value : null
      return normalisePrintfulProduct(p, realPrice)
    })
  } catch {
    return getSamplePrintfulProducts(query)
  }
}

function normalisePrintfulProduct(p, realPrice = null) {
  // Use real variant pricing if available, otherwise fall back to known base costs
  const baseCost = realPrice || PRINTFUL_BASE_COSTS[p.type_name] || 15.00
  const shipping = 4.50
  const suggestedPrice = Math.ceil(baseCost * 2.2 * 100) / 100
  const fulfillmentDays = p.avg_fulfillment_time || 3
  const deliveryDays = fulfillmentDays + 4 // fulfillment + shipping transit

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

// Approximate base costs by product type (Printful public pricing)
const PRINTFUL_BASE_COSTS = {
  'T-SHIRT': 9.50,
  'HOODIE': 22.00,
  'TANK TOP': 10.00,
  'LONG SLEEVE SHIRT': 14.00,
  'CROP TOP': 12.00,
  'DRESS': 25.00,
  'LEGGINGS': 22.00,
  'SHORTS': 18.00,
  'SWIMSUIT': 26.00,
  'MUG': 6.50,
  'POSTER': 7.00,
  'CANVAS': 14.00,
  'PHONE CASE': 8.50,
  'TOTE BAG': 10.00,
  'BACKPACK': 28.00,
  'HAT': 12.00,
  'BEANIE': 14.00,
  'SOCKS': 8.00,
  'FACE MASK': 6.00,
  'PILLOW': 14.00,
  'BLANKET': 30.00,
  'STICKER': 2.00,
  'NOTEBOOK': 10.00,
  'MOUSE PAD': 8.00,
  'APRON': 16.00,
  'ONESIE': 12.00,
  'KIDS T-SHIRT': 9.00,
}

// --- Printify ---
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

async function searchPrintify(query) {
  const apiKey = process.env.PRINTIFY_API_KEY
  if (!apiKey) return getSamplePrintifyProducts(query)

  try {
    const catalog = await fetchPrintifyCatalog(apiKey)
    const q = (query || '').toLowerCase().trim()

    if (!q || q.length < 2) {
      return catalog.slice(0, 10).map(p => normalisePrintifyProduct(p))
    }

    const words = q.split(/\s+/).filter(w => w.length >= 2)
    const filtered = catalog
      .filter(p => {
        const text = [p.title, p.description].map(f => (f || '').toLowerCase()).join(' ')
        return words.some(w => text.includes(w)) || text.includes(q)
      })
      .slice(0, 15)

    if (filtered.length === 0) return getSamplePrintifyProducts(query)
    return filtered.map(p => normalisePrintifyProduct(p))
  } catch {
    return getSamplePrintifyProducts(query)
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
    description: p.description || 'Custom print-on-demand product',
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

// --- Gooten ---
let gootenCatalogCache = null
let gootenCacheTime = 0

async function searchGooten(query) {
  const recipeId = process.env.GOOTEN_RECIPE_ID
  if (!recipeId) return getSampleGootenProducts(query)

  try {
    const now = Date.now()
    if (!gootenCatalogCache || (now - gootenCacheTime) > PRINTFUL_CACHE_TTL) {
      const response = await fetch(`https://api.print.io/api/v/4/source/api/products?recipeId=${recipeId}&countryCode=US&showAllProducts=true`)
      if (!response.ok) throw new Error(`Gooten API ${response.status}`)
      const data = await response.json()
      // v4 API returns categories with nested items
      const rawProducts = data.Products || data.products || []
      // Flatten if categories contain items arrays
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
      return gootenCatalogCache.slice(0, 10).map(p => normaliseGootenProduct(p))
    }

    const words = q.split(/\s+/).filter(w => w.length >= 2)
    const filtered = gootenCatalogCache
      .filter(p => {
        const text = [p.Name, p.Description, p.Category].map(f => (f || '').toLowerCase()).join(' ')
        return words.some(w => text.includes(w)) || text.includes(q)
      })
      .slice(0, 15)

    if (filtered.length === 0) return getSampleGootenProducts(query)
    return filtered.map(p => normaliseGootenProduct(p))
  } catch {
    return getSampleGootenProducts(query)
  }
}

function normaliseGootenProduct(p) {
  // v4 API uses different field casing/names
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

// --- AliExpress (Drop Shipping API) ---
// Uses ToGoGo's app credentials (AppKey: configured via env)
// Token management for AliExpress DS API
let aliexpressAccessToken = null
let aliexpressTokenExpiry = 0

async function getAliExpressAccessToken() {
  const appKey = process.env.ALIEXPRESS_APP_KEY
  const appSecret = process.env.ALIEXPRESS_APP_SECRET
  if (!appKey || !appSecret) return null

  const now = Date.now()
  // Return cached token if still valid (refresh 1 day early)
  if (aliexpressAccessToken && aliexpressTokenExpiry > now + 86400000) {
    return aliexpressAccessToken
  }

  // For server-to-server DS API calls, use the system-level token
  // This is obtained via the OAuth flow and stored; for product search
  // we use the app-level API which only needs app_key + sign
  return null
}

// Sign AliExpress API requests (HMAC-SHA256)
function signAliExpressRequest(params, appSecret) {
  const sorted = Object.keys(params)
    .filter(k => k !== 'sign')
    .sort()
    .map(k => `${k}${params[k]}`)
    .join('')

  const signStr = `${appSecret}${sorted}${appSecret}`
  return crypto
    .createHmac('sha256', appSecret)
    .update(signStr)
    .digest('hex')
    .toUpperCase()
}

// Call AliExpress DS API
async function callAliExpressAPI(method, params = {}) {
  const appKey = process.env.ALIEXPRESS_APP_KEY
  const appSecret = process.env.ALIEXPRESS_APP_SECRET
  if (!appKey || !appSecret) return null

  const baseParams = {
    app_key: appKey,
    method,
    sign_method: 'sha256',
    timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
    format: 'json',
    v: '2.0',
    ...params,
  }

  baseParams.sign = signAliExpressRequest(baseParams, appSecret)

  const response = await fetch(`https://api-sg.aliexpress.com/sync?${new URLSearchParams(baseParams).toString()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })

  if (!response.ok) throw new Error(`AliExpress API error: ${response.status}`)
  return response.json()
}

// Cache feed names so we don't call feedname.get on every search
let aliexpressFeedNames = null
let aliexpressFeedNamesFetchedAt = 0

async function getAliExpressFeedNames() {
  const now = Date.now()
  if (aliexpressFeedNames && (now - aliexpressFeedNamesFetchedAt) < 60 * 60 * 1000) {
    return aliexpressFeedNames
  }

  try {
    const data = await callAliExpressAPI('aliexpress.ds.feedname.get', {})
    const feeds = data?.aliexpress_ds_feedname_get_response?.result?.feed_names?.feed_name || []
    if (feeds.length > 0) {
      aliexpressFeedNames = feeds
      aliexpressFeedNamesFetchedAt = now
    }
    return feeds
  } catch {
    return aliexpressFeedNames || []
  }
}

async function searchAliExpress(query, page = 1) {
  const appKey = process.env.ALIEXPRESS_APP_KEY
  if (!appKey) return getSampleAliExpressProducts(query)

  try {
    // AliExpress DS API has no product.search — use recommend.feed.get instead
    const feeds = await getAliExpressFeedNames()
    const feedName = feeds[0]?.feed_name || feeds[0] || 'DS bestselling products'

    const data = await callAliExpressAPI('aliexpress.ds.recommend.feed.get', {
      feed_name: feedName,
      target_currency: 'USD',
      target_language: 'EN',
      page_no: String(page),
      page_size: '20',
      sort: 'volumeDesc',
      ...(query ? { category_id: '' } : {}),
    })

    const resp = data?.aliexpress_ds_recommend_feed_get_response?.result
    if (!resp?.products?.product || resp.products.product.length === 0) {
      // Try product detail if query looks like a product ID
      if (/^\d{8,}$/.test(query)) {
        return searchAliExpressByProductId(query)
      }
      return getSampleAliExpressProducts(query)
    }

    let products = resp.products.product.map(p => normaliseAliExpressProduct(p))

    // Client-side keyword filter since feed API doesn't support keyword search
    if (query) {
      const q = query.toLowerCase()
      const filtered = products.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      )
      if (filtered.length > 0) products = filtered
    }

    return products
  } catch {
    return getSampleAliExpressProducts(query)
  }
}

async function searchAliExpressByProductId(productId) {
  try {
    const data = await callAliExpressAPI('aliexpress.ds.product.get', {
      product_id: productId,
      target_currency: 'USD',
      target_language: 'EN',
    })

    const p = data?.aliexpress_ds_product_get_response?.result
    if (!p) return []

    const baseInfo = p.ae_item_base_info_dto || {}
    const skus = p.ae_item_sku_info_dtos?.ae_item_sku_info_d_t_o || []
    const images = (p.ae_multimedia_info_dto?.image_urls || '').split(';').filter(Boolean)
    const lowestPrice = skus.reduce((min, s) => {
      const price = parseFloat(s.offer_sale_price || s.sku_price || '999')
      return price < min ? price : min
    }, 999)
    const cost = lowestPrice < 999 ? lowestPrice : 0

    return [{
      id: `ae_${baseInfo.product_id}`,
      title: baseInfo.subject || 'AliExpress Product',
      description: baseInfo.subject || '',
      image: images[0] || '',
      images,
      cost,
      originalPrice: cost,
      shipping: 0,
      totalCost: cost,
      suggestedPrice: Math.ceil(cost * 2.5 * 100) / 100,
      suggestedMargin: Math.round((Math.ceil(cost * 2.5 * 100) / 100 - cost) * 100) / 100,
      deliveryDays: 14,
      supplier: 'AliExpress',
      supplierLogo: '🛒',
      sourceUrl: `https://www.aliexpress.com/item/${baseInfo.product_id}.html`,
      minOrderQty: 1,
      category: baseInfo.category_id ? String(baseInfo.category_id) : '',
      variantCount: skus.length,
      _live: true,
    }]
  } catch {
    return []
  }
}

function normaliseAliExpressProduct(p) {
  const cost = parseFloat(p.target_sale_price || p.target_original_price || '0')
  const originalPrice = parseFloat(p.target_original_price || '0')
  const shipping = 0 // Most AliExpress DS products have free shipping
  const suggestedPrice = Math.ceil(cost * 2.5 * 100) / 100

  return {
    id: `ae_${p.product_id}`,
    title: p.product_title || 'AliExpress Product',
    description: p.product_title || '',
    image: p.product_main_image_url || '',
    images: p.product_small_image_urls?.string || [],
    cost,
    originalPrice,
    shipping,
    totalCost: Math.round((cost + shipping) * 100) / 100,
    suggestedPrice,
    suggestedMargin: Math.round((suggestedPrice - cost - shipping) * 100) / 100,
    deliveryDays: 14,
    supplier: 'AliExpress',
    supplierLogo: '🛒',
    sourceUrl: p.product_detail_url || `https://www.aliexpress.com/item/${p.product_id}.html`,
    minOrderQty: 1,
    category: p.first_level_category_name || p.second_level_category_name || '',
    rating: p.evaluate_rate ? parseFloat(p.evaluate_rate.replace('%', '')) / 100 : null,
    orders: p.lastest_volume || 0,
    discount: originalPrice > cost ? Math.round((1 - cost / originalPrice) * 100) : 0,
    _live: true,
  }
}

async function importFromAliExpress(url) {
  const appKey = process.env.ALIEXPRESS_APP_KEY
  if (!appKey) {
    return {
      title: 'AliExpress Product',
      description: 'Configure ALIEXPRESS_APP_KEY and ALIEXPRESS_APP_SECRET to auto-import.',
      images: [],
      supplierCost: 0,
      source: 'aliexpress',
      supplierUrl: url,
    }
  }

  // Extract product ID from URL
  const match = url.match(/\/(\d{8,})/)
  const productId = match?.[1]

  if (!productId) {
    return {
      title: 'AliExpress Product',
      description: 'Could not extract product ID from URL.',
      images: [],
      supplierCost: 0,
      source: 'aliexpress',
      supplierUrl: url,
    }
  }

  try {
    const data = await callAliExpressAPI('aliexpress.ds.product.get', {
      product_id: productId,
      target_currency: 'USD',
      target_language: 'en',
    })

    const p = data?.aliexpress_ds_product_get_response?.result
    if (!p) throw new Error('Product not found')

    const images = p.ae_multimedia_info_dto?.image_urls?.split(';') || []
    const skus = p.ae_item_sku_info_dtos?.ae_item_sku_info_d_t_o || []
    const lowestPrice = skus.reduce((min, s) => {
      const price = parseFloat(s.sku_price || '999')
      return price < min ? price : min
    }, parseFloat(p.ae_item_base_info_dto?.target_sale_price || '0'))

    return {
      title: p.ae_item_base_info_dto?.subject || 'AliExpress Product',
      description: p.ae_item_base_info_dto?.detail || p.ae_item_base_info_dto?.subject || '',
      images,
      supplierCost: lowestPrice,
      shippingCost: 0,
      source: 'aliexpress',
      supplierUrl: url,
      productId,
      variants: skus.map(s => ({
        sku: s.id,
        price: parseFloat(s.sku_price || '0'),
        stock: s.sku_available_stock || 0,
        attributes: s.ae_sku_property_dtos?.ae_sku_property_d_t_o?.map(a => ({
          name: a.sku_property_name,
          value: a.property_value_definition_name || a.sku_property_value,
        })) || [],
      })),
    }
  } catch {
    return {
      title: 'AliExpress Product',
      description: 'Failed to fetch product details. Please try again.',
      images: [],
      supplierCost: 0,
      source: 'aliexpress',
      supplierUrl: url,
    }
  }
}

function getSampleAliExpressProducts(query) {
  const q = query || 'Product'
  return [
    { id: 'ae_sample_1', title: `${q} - Hot Seller`, description: 'Top-rated AliExpress product with 10k+ orders', image: '', images: [], cost: 4.99, originalPrice: 9.99, shipping: 0, totalCost: 4.99, suggestedPrice: 14.99, suggestedMargin: 10.00, deliveryDays: 14, supplier: 'AliExpress', supplierLogo: '🛒', sourceUrl: '', minOrderQty: 1, category: 'General', rating: 0.96, orders: 10532, discount: 50, _live: false },
    { id: 'ae_sample_2', title: `${q} - Budget Pick`, description: 'Affordable option with free shipping worldwide', image: '', images: [], cost: 2.49, originalPrice: 4.99, shipping: 0, totalCost: 2.49, suggestedPrice: 9.99, suggestedMargin: 7.50, deliveryDays: 20, supplier: 'AliExpress', supplierLogo: '🛒', sourceUrl: '', minOrderQty: 1, category: 'General', rating: 0.92, orders: 5210, discount: 50, _live: false },
    { id: 'ae_sample_3', title: `${q} - Premium Quality`, description: 'Higher quality variant with faster shipping option', image: '', images: [], cost: 8.99, originalPrice: 14.99, shipping: 0, totalCost: 8.99, suggestedPrice: 24.99, suggestedMargin: 16.00, deliveryDays: 10, supplier: 'AliExpress', supplierLogo: '🛒', sourceUrl: '', minOrderQty: 1, category: 'General', rating: 0.98, orders: 3420, discount: 40, _live: false },
    { id: 'ae_sample_4', title: `${q} - Bundle (5 Pack)`, description: 'Multi-pack for better per-unit margins', image: '', images: [], cost: 11.99, originalPrice: 19.99, shipping: 0, totalCost: 11.99, suggestedPrice: 34.99, suggestedMargin: 23.00, deliveryDays: 14, supplier: 'AliExpress', supplierLogo: '🛒', sourceUrl: '', minOrderQty: 1, category: 'General', rating: 0.94, orders: 1876, discount: 40, _live: false },
  ]
}

// --- Manual/DB suppliers ---
async function searchManualSuppliers(query) {
  const { data } = await supabase
    .from('suppliers')
    .select('*')
    .eq('is_active', true)
    .eq('api_type', 'manual')

  return (data || []).map(s => ({
    id: `manual_${s.id}`,
    title: query,
    description: '',
    image: '',
    images: [],
    cost: 0,
    shipping: s.base_shipping_cost || 0,
    totalCost: s.base_shipping_cost || 0,
    suggestedPrice: 0,
    suggestedMargin: 0,
    deliveryDays: s.avg_delivery_days || 14,
    supplier: s.name,
    supplierLogo: '📋',
    sourceUrl: '',
    minOrderQty: 1,
    category: '',
    _live: false,
  }))
}

// ============================================
// SAMPLE DATA (shown when API keys not configured)
// ============================================
function getSampleCJProducts(query) {
  const q = query || 'Product'
  return [
    { id: 'cj_sample_1', title: `${q} - Premium Quality`, description: 'High-quality product with fast shipping from CJ warehouse', image: '', images: [], cost: 5.99, shipping: 2.50, totalCost: 8.49, suggestedPrice: 21.99, suggestedMargin: 13.50, deliveryDays: 12, supplier: 'CJ Dropshipping', supplierLogo: '📦', sourceUrl: '', minOrderQty: 1, category: 'General', _live: false },
    { id: 'cj_sample_2', title: `${q} - Budget Option`, description: 'Affordable option perfect for testing your market', image: '', images: [], cost: 3.49, shipping: 1.99, totalCost: 5.48, suggestedPrice: 14.99, suggestedMargin: 9.51, deliveryDays: 18, supplier: 'CJ Dropshipping', supplierLogo: '📦', sourceUrl: '', minOrderQty: 1, category: 'General', _live: false },
    { id: 'cj_sample_3', title: `${q} - Deluxe Version`, description: 'Premium tier with better packaging and faster shipping', image: '', images: [], cost: 12.99, shipping: 3.50, totalCost: 16.49, suggestedPrice: 39.99, suggestedMargin: 23.50, deliveryDays: 8, supplier: 'CJ Dropshipping', supplierLogo: '📦', sourceUrl: '', minOrderQty: 1, category: 'General', _live: false },
    { id: 'cj_sample_4', title: `${q} - Value Pack (3x)`, description: 'Bundle pack — sell individually for higher margins', image: '', images: [], cost: 9.99, shipping: 3.99, totalCost: 13.98, suggestedPrice: 34.99, suggestedMargin: 21.01, deliveryDays: 14, supplier: 'CJ Dropshipping', supplierLogo: '📦', sourceUrl: '', minOrderQty: 1, category: 'General', _live: false },
  ]
}

function getSamplePrintfulProducts(query) {
  const q = query || 'Custom'
  return [
    { id: 'pf_sample_1', title: `${q} T-Shirt`, description: 'Unisex cotton tee — add your own design', image: '', images: [], cost: 12.50, shipping: 4.50, totalCost: 17.00, suggestedPrice: 29.99, suggestedMargin: 12.99, deliveryDays: 5, supplier: 'Printful', supplierLogo: '🎨', sourceUrl: '', minOrderQty: 1, category: 'Custom', customisable: true, _live: false },
    { id: 'pf_sample_2', title: `${q} Mug`, description: '11oz ceramic mug — full wrap print', image: '', images: [], cost: 7.50, shipping: 4.50, totalCost: 12.00, suggestedPrice: 22.99, suggestedMargin: 10.99, deliveryDays: 5, supplier: 'Printful', supplierLogo: '🎨', sourceUrl: '', minOrderQty: 1, category: 'Custom', customisable: true, _live: false },
    { id: 'pf_sample_3', title: `${q} Phone Case`, description: 'Tough snap case for iPhone/Samsung — your design', image: '', images: [], cost: 10.00, shipping: 4.50, totalCost: 14.50, suggestedPrice: 27.99, suggestedMargin: 13.49, deliveryDays: 5, supplier: 'Printful', supplierLogo: '🎨', sourceUrl: '', minOrderQty: 1, category: 'Custom', customisable: true, _live: false },
    { id: 'pf_sample_4', title: `${q} Poster Print`, description: 'Museum-quality poster on thick matte paper', image: '', images: [], cost: 8.00, shipping: 4.50, totalCost: 12.50, suggestedPrice: 24.99, suggestedMargin: 12.49, deliveryDays: 5, supplier: 'Printful', supplierLogo: '🎨', sourceUrl: '', minOrderQty: 1, category: 'Custom', customisable: true, _live: false },
  ]
}

function getSamplePrintifyProducts(query) {
  const q = query || 'Custom'
  return [
    { id: 'py_sample_1', title: `${q} T-Shirt`, description: 'Gildan 64000 unisex tee — your custom design', image: '', images: [], cost: 8.50, shipping: 4.00, totalCost: 12.50, suggestedPrice: 27.99, suggestedMargin: 15.49, deliveryDays: 5, supplier: 'Printify', supplierLogo: '🖨️', sourceUrl: '', minOrderQty: 1, category: 'Custom', customisable: true, _live: false },
    { id: 'py_sample_2', title: `${q} Mug`, description: 'Classic 11oz mug — vibrant sublimation print', image: '', images: [], cost: 5.50, shipping: 4.00, totalCost: 9.50, suggestedPrice: 19.99, suggestedMargin: 10.49, deliveryDays: 5, supplier: 'Printify', supplierLogo: '🖨️', sourceUrl: '', minOrderQty: 1, category: 'Custom', customisable: true, _live: false },
    { id: 'py_sample_3', title: `${q} Hoodie`, description: 'Unisex pullover hoodie — DTG printed your design', image: '', images: [], cost: 20.00, shipping: 4.50, totalCost: 24.50, suggestedPrice: 49.99, suggestedMargin: 25.49, deliveryDays: 5, supplier: 'Printify', supplierLogo: '🖨️', sourceUrl: '', minOrderQty: 1, category: 'Custom', customisable: true, _live: false },
  ]
}

function getSampleGootenProducts(query) {
  const q = query || 'Custom'
  return [
    { id: 'gt_sample_1', title: `${q} T-Shirt`, description: 'Next Level unisex tee — premium DTG print', image: '', images: [], cost: 9.00, shipping: 4.50, totalCost: 13.50, suggestedPrice: 28.99, suggestedMargin: 15.49, deliveryDays: 6, supplier: 'Gooten', supplierLogo: '🏭', sourceUrl: '', minOrderQty: 1, category: 'Custom', customisable: true, _live: false },
    { id: 'gt_sample_2', title: `${q} Canvas Print`, description: 'Gallery wrapped canvas — high-res print on wood frame', image: '', images: [], cost: 14.00, shipping: 5.00, totalCost: 19.00, suggestedPrice: 44.99, suggestedMargin: 25.99, deliveryDays: 6, supplier: 'Gooten', supplierLogo: '🏭', sourceUrl: '', minOrderQty: 1, category: 'Custom', customisable: true, _live: false },
  ]
}

export default router
