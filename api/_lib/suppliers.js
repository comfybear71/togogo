// Shared supplier logic for Vercel serverless functions
// Searches ALL suppliers through ToGoGo's master API keys
// Users never need their own supplier accounts
import crypto from 'crypto'

// ============================================
// CJ DROPSHIPPING
// ============================================
let cjAccessToken = null
let cjTokenExpiry = 0

async function getCJAccessToken() {
  const apiKey = process.env.CJ_DROPSHIPPING_API_KEY
  if (!apiKey) return null

  const now = Date.now()
  if (cjAccessToken && cjTokenExpiry > now) {
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
  cjTokenExpiry = data.data.accessTokenExpiryDate
    ? new Date(data.data.accessTokenExpiryDate).getTime()
    : now + 14 * 86400000

  return cjAccessToken
}

export async function searchCJ(query, page = 1) {
  const apiKey = process.env.CJ_DROPSHIPPING_API_KEY
  if (!apiKey) return getSampleCJProducts(query)

  try {
    const token = await getCJAccessToken()
    if (!token) return getSampleCJProducts(query)

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

    if (products.length === 0) return getSampleCJProducts(query)
    return products
  } catch (err) {
    console.error('CJ search error:', err.message || err)
    return getSampleCJProducts(query)
  }
}

function normaliseCJProduct(p) {
  const cost = p.sellPrice || 0
  const shipping = p.shippingPrice || 0
  const suggestedPrice = Math.ceil((cost + shipping) * 2.5 * 100) / 100
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
  if (!apiKey) return getSamplePrintfulProducts(query)

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
  } catch {
    return getSamplePrintfulProducts(query)
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
  if (!apiKey) return getSamplePrintifyProducts(query)

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
  if (!recipeId) return getSampleGootenProducts(query)

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

    if (filtered.length === 0) return getSampleGootenProducts(query)
    return filtered.map(p => normaliseGootenProduct(p))
  } catch {
    return getSampleGootenProducts(query)
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

export async function searchAliExpress(query, page = 1) {
  const appKey = process.env.ALIEXPRESS_APP_KEY
  if (!appKey) return getSampleAliExpressProducts(query)

  try {
    const feeds = await getAliExpressFeedNames()
    const feedName = feeds[0]?.promo_name || feeds[0]?.feed_name || feeds[0] || 'DS bestselling products'

    const data = await callAliExpressAPI('aliexpress.ds.recommend.feed.get', {
      feed_name: feedName,
      target_currency: 'USD',
      target_language: 'EN',
      page_no: String(page),
      page_size: '50',
      sort: 'volumeDesc',
    })

    const feedResp = data?.aliexpress_ds_recommend_feed_get_response
    const resp = feedResp?.resp_result?.result || feedResp?.result
    // AliExpress uses either "product" or "traffic_product_d_t_o" depending on API version
    const productList = resp?.products?.product || resp?.products?.traffic_product_d_t_o || []
    if (productList.length === 0) {
      return getSampleAliExpressProducts(query)
    }

    let products = productList.map(p => normaliseAliExpressProduct(p))

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
  } catch (err) {
    console.error('AliExpress search error:', err.message || err)
    return getSampleAliExpressProducts(query)
  }
}

function normaliseAliExpressProduct(p) {
  const cost = parseFloat(p.target_sale_price || p.target_original_price || '0')
  const originalPrice = parseFloat(p.target_original_price || '0')
  const shipping = 0
  const suggestedPrice = Math.ceil(cost * 2.5 * 100) / 100

  return {
    id: `ae_${p.product_id}`,
    title: p.product_title || 'AliExpress Product',
    description: p.product_title || '',
    image: p.product_main_image_url || '',
    images: p.product_small_image_urls?.string || p.product_small_image_urls?.productSmallImageUrl || [],
    cost,
    originalPrice,
    shipping,
    totalCost: Math.round((cost + shipping) * 100) / 100,
    suggestedPrice,
    suggestedMargin: Math.round((suggestedPrice - cost - shipping) * 100) / 100,
    deliveryDays: p.ship_to_days || 14,
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

export function getSampleAliExpressProducts(query) {
  const q = query || 'Product'
  const img = getImageForQuery(q)
  return [
    { id: `ae_s_${hash(q)}_1`, title: `${q} - Hot Seller`, description: 'Top-rated AliExpress product with 10k+ orders', image: img, images: img ? [img] : [], cost: 4.99, originalPrice: 9.99, shipping: 0, totalCost: 4.99, suggestedPrice: 14.99, suggestedMargin: 10.00, deliveryDays: 14, supplier: 'AliExpress', supplierLogo: '🛒', sourceUrl: '', minOrderQty: 1, category: 'General', rating: 0.96, orders: 10532, discount: 50, _live: false },
    { id: `ae_s_${hash(q)}_2`, title: `${q} - Budget Pick`, description: 'Affordable option with free shipping worldwide', image: img, images: img ? [img] : [], cost: 2.49, originalPrice: 4.99, shipping: 0, totalCost: 2.49, suggestedPrice: 9.99, suggestedMargin: 7.50, deliveryDays: 20, supplier: 'AliExpress', supplierLogo: '🛒', sourceUrl: '', minOrderQty: 1, category: 'General', rating: 0.92, orders: 5210, discount: 50, _live: false },
    { id: `ae_s_${hash(q)}_3`, title: `${q} - Premium Quality`, description: 'Higher quality variant with faster shipping option', image: img, images: img ? [img] : [], cost: 8.99, originalPrice: 14.99, shipping: 0, totalCost: 8.99, suggestedPrice: 24.99, suggestedMargin: 16.00, deliveryDays: 10, supplier: 'AliExpress', supplierLogo: '🛒', sourceUrl: '', minOrderQty: 1, category: 'General', rating: 0.98, orders: 3420, discount: 40, _live: false },
  ]
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
  'phone case': 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=400&h=400&fit=crop',
  'led light': 'https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?w=400&h=400&fit=crop',
  't-shirt': 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop',
  'jewellery': 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&h=400&fit=crop',
  'mug': 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=400&h=400&fit=crop',
  'earbuds': 'https://images.unsplash.com/photo-1590658268037-6bf12f032f55?w=400&h=400&fit=crop',
  'wireless': 'https://images.unsplash.com/photo-1590658268037-6bf12f032f55?w=400&h=400&fit=crop',
  'sunglasses': 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&h=400&fit=crop',
  'watch': 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=400&h=400&fit=crop',
  'necklace': 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&h=400&fit=crop',
  'hoodie': 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=400&fit=crop',
  'poster': 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400&h=400&fit=crop',
  'water bottle': 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&h=400&fit=crop',
  'yoga mat': 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400&h=400&fit=crop',
  'pillow': 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=400&h=400&fit=crop',
  'dog toy': 'https://images.unsplash.com/photo-1535294435445-d7249b8f7b5f?w=400&h=400&fit=crop',
  'makeup brush': 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400&h=400&fit=crop',
  'charger': 'https://images.unsplash.com/photo-1622957461168-202e5b43174e?w=400&h=400&fit=crop',
  'bag': 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=400&h=400&fit=crop',
  'blanket': 'https://images.unsplash.com/photo-1580301762395-21ce4d7a4c1d?w=400&h=400&fit=crop',
}

function getImageForQuery(query) {
  const q = (query || '').toLowerCase()
  for (const [key, url] of Object.entries(SAMPLE_IMAGES)) {
    if (q.includes(key)) return url
  }
  return ''
}

export function getSampleCJProducts(query) {
  const q = query || 'Product'
  const img = getImageForQuery(q)
  return [
    { id: `cj_s_${hash(q)}_1`, title: `${q} - Premium Quality`, description: 'High-quality product with fast shipping from CJ warehouse', image: img, images: img ? [img] : [], cost: 5.99, shipping: 2.50, totalCost: 8.49, suggestedPrice: 21.99, suggestedMargin: 13.50, deliveryDays: 12, supplier: 'CJ Dropshipping', supplierLogo: '📦', sourceUrl: '', minOrderQty: 1, category: 'General', _live: false },
    { id: `cj_s_${hash(q)}_2`, title: `${q} - Budget Option`, description: 'Affordable option perfect for testing your market', image: img, images: img ? [img] : [], cost: 3.49, shipping: 1.99, totalCost: 5.48, suggestedPrice: 14.99, suggestedMargin: 9.51, deliveryDays: 18, supplier: 'CJ Dropshipping', supplierLogo: '📦', sourceUrl: '', minOrderQty: 1, category: 'General', _live: false },
    { id: `cj_s_${hash(q)}_3`, title: `${q} - Deluxe Version`, description: 'Premium tier with better packaging and faster shipping', image: img, images: img ? [img] : [], cost: 12.99, shipping: 3.50, totalCost: 16.49, suggestedPrice: 39.99, suggestedMargin: 23.50, deliveryDays: 8, supplier: 'CJ Dropshipping', supplierLogo: '📦', sourceUrl: '', minOrderQty: 1, category: 'General', _live: false },
  ]
}

export function getSamplePrintfulProducts(query) {
  const q = query || 'Custom'
  const img = getImageForQuery(q)
  return [
    { id: `pf_s_${hash(q)}_1`, title: `${q} T-Shirt`, description: 'Unisex cotton tee — add your own design', image: img || SAMPLE_IMAGES['t-shirt'], images: [img || SAMPLE_IMAGES['t-shirt']], cost: 12.50, shipping: 4.50, totalCost: 17.00, suggestedPrice: 29.99, suggestedMargin: 12.99, deliveryDays: 5, supplier: 'Printful', supplierLogo: '🎨', sourceUrl: '', minOrderQty: 1, category: 'Custom', customisable: true, _live: false },
    { id: `pf_s_${hash(q)}_2`, title: `${q} Mug`, description: '11oz ceramic mug — full wrap print', image: SAMPLE_IMAGES['mug'], images: [SAMPLE_IMAGES['mug']], cost: 7.50, shipping: 4.50, totalCost: 12.00, suggestedPrice: 22.99, suggestedMargin: 10.99, deliveryDays: 5, supplier: 'Printful', supplierLogo: '🎨', sourceUrl: '', minOrderQty: 1, category: 'Custom', customisable: true, _live: false },
    { id: `pf_s_${hash(q)}_3`, title: `${q} Phone Case`, description: 'Tough snap case for iPhone/Samsung — your design', image: SAMPLE_IMAGES['phone case'], images: [SAMPLE_IMAGES['phone case']], cost: 10.00, shipping: 4.50, totalCost: 14.50, suggestedPrice: 27.99, suggestedMargin: 13.49, deliveryDays: 5, supplier: 'Printful', supplierLogo: '🎨', sourceUrl: '', minOrderQty: 1, category: 'Custom', customisable: true, _live: false },
  ]
}

export function getSamplePrintifyProducts(query) {
  const q = query || 'Custom'
  const img = getImageForQuery(q)
  return [
    { id: `py_s_${hash(q)}_1`, title: `${q} T-Shirt`, description: 'Gildan 64000 unisex tee — your custom design', image: img || SAMPLE_IMAGES['t-shirt'], images: [img || SAMPLE_IMAGES['t-shirt']], cost: 8.50, shipping: 4.00, totalCost: 12.50, suggestedPrice: 27.99, suggestedMargin: 15.49, deliveryDays: 5, supplier: 'Printify', supplierLogo: '🖨️', sourceUrl: '', minOrderQty: 1, category: 'Custom', customisable: true, _live: false },
    { id: `py_s_${hash(q)}_2`, title: `${q} Mug`, description: 'Classic 11oz mug — vibrant sublimation print', image: SAMPLE_IMAGES['mug'], images: [SAMPLE_IMAGES['mug']], cost: 5.50, shipping: 4.00, totalCost: 9.50, suggestedPrice: 19.99, suggestedMargin: 10.49, deliveryDays: 5, supplier: 'Printify', supplierLogo: '🖨️', sourceUrl: '', minOrderQty: 1, category: 'Custom', customisable: true, _live: false },
    { id: `py_s_${hash(q)}_3`, title: `${q} Hoodie`, description: 'Unisex pullover hoodie — DTG printed your design', image: SAMPLE_IMAGES['hoodie'], images: [SAMPLE_IMAGES['hoodie']], cost: 20.00, shipping: 4.50, totalCost: 24.50, suggestedPrice: 49.99, suggestedMargin: 25.49, deliveryDays: 5, supplier: 'Printify', supplierLogo: '🖨️', sourceUrl: '', minOrderQty: 1, category: 'Custom', customisable: true, _live: false },
  ]
}

export function getSampleGootenProducts(query) {
  const q = query || 'Custom'
  const img = getImageForQuery(q)
  return [
    { id: `gt_s_${hash(q)}_1`, title: `${q} T-Shirt`, description: 'Next Level unisex tee — premium DTG print', image: img || SAMPLE_IMAGES['t-shirt'], images: [img || SAMPLE_IMAGES['t-shirt']], cost: 9.00, shipping: 4.50, totalCost: 13.50, suggestedPrice: 28.99, suggestedMargin: 15.49, deliveryDays: 6, supplier: 'Gooten', supplierLogo: '🏭', sourceUrl: '', minOrderQty: 1, category: 'Custom', customisable: true, _live: false },
    { id: `gt_s_${hash(q)}_2`, title: `${q} Canvas Print`, description: 'Gallery wrapped canvas — high-res print on wood frame', image: SAMPLE_IMAGES['poster'], images: [SAMPLE_IMAGES['poster']], cost: 14.00, shipping: 5.00, totalCost: 19.00, suggestedPrice: 44.99, suggestedMargin: 25.99, deliveryDays: 6, supplier: 'Gooten', supplierLogo: '🏭', sourceUrl: '', minOrderQty: 1, category: 'Custom', customisable: true, _live: false },
  ]
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

const SUPPLIER_SAMPLE_MAP = {
  'CJ Dropshipping': getSampleCJProducts,
  'AliExpress': getSampleAliExpressProducts,
  'Printful': getSamplePrintfulProducts,
  'Printify': getSamplePrintifyProducts,
  'Gooten': getSampleGootenProducts,
}

export function parseSuppliers(suppliersParam) {
  if (!suppliersParam) return Object.keys(SUPPLIER_SEARCH_MAP)
  return suppliersParam.split(',').filter(s => SUPPLIER_SEARCH_MAP[s])
}

export function getSampleForSuppliers(activeSuppliers, query) {
  return activeSuppliers.flatMap(s =>
    SUPPLIER_SAMPLE_MAP[s] ? SUPPLIER_SAMPLE_MAP[s](query) : []
  )
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
