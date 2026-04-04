// AliExpress DS (Dropshipping) API integration for ToGoGo
// Uses aliexpress.ds.feedname.get + aliexpress.ds.recommend.feed.get
// OAuth token unlocks: ds.product.get, ds.order.submit, ds.order.get
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
// API SIGNING & CALLING
// ============================================

function signRequest(params, appSecret) {
  const sorted = Object.keys(params)
    .filter(k => k !== 'sign')
    .sort()
    .map(k => `${k}${params[k]}`)
    .join('')
  return crypto.createHmac('sha256', appSecret).update(sorted).digest('hex').toUpperCase()
}

async function callAPI(method, params = {}) {
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
  const response = await fetch(`https://api-sg.aliexpress.com/sync?${qs}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })

  if (!response.ok) {
    const text = await response.text()
    console.error(`[AliExpress] HTTP ${response.status}: ${text.slice(0, 300)}`)
    throw new Error(`AliExpress HTTP ${response.status}`)
  }

  const data = await response.json()
  if (data.error_response) {
    console.error(`[AliExpress] API Error (${method}):`, JSON.stringify(data.error_response).slice(0, 300))
    throw new Error(`AliExpress: ${data.error_response.msg || 'API error'}`)
  }
  return data
}

// ============================================
// OAUTH TOKEN — retrieve saved access_token from DB
// ============================================

async function getAccessToken() {
  try {
    const { rows } = await sql`SELECT value FROM admin_settings WHERE key = 'aliexpress_access_token'`
    if (!rows[0]) return null
    const data = JSON.parse(rows[0].value)
    // Check if expired
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      console.warn('[AliExpress] OAuth token expired, needs refresh')
      return null
    }
    return data.access_token
  } catch {
    return null
  }
}

// Call DS API with OAuth access_token
async function callAuthenticatedAPI(method, params = {}) {
  const accessToken = await getAccessToken()
  if (!accessToken) {
    throw new Error('No AliExpress OAuth token. Authorize at /api/platforms/callback/aliexpress')
  }
  return callAPI(method, { ...params, access_token: accessToken })
}

// ============================================
// DS PRODUCT DETAILS — full info with all images, description, specs
// ============================================

export async function getProductDetails(productId) {
  try {
    const data = await callAuthenticatedAPI('aliexpress.ds.product.get', {
      product_id: String(productId),
      target_currency: 'AUD',
      target_language: 'EN',
      ship_to_country: 'AU',
    })

    const result = data?.aliexpress_ds_product_get_response?.result
    if (!result) return null

    const baseInfo = result.ae_item_base_info_dto || {}
    const multimedia = result.ae_multimedia_info_dto || {}
    const skuInfo = result.ae_item_sku_info_dtos?.ae_item_sku_info_d_t_o || []
    const storeInfo = result.ae_store_info || {}
    const shippingInfo = result.logistics_info_dto?.logistics_info_list?.logistics_info_d_t_o || []

    // All images
    const imageUrls = multimedia.image_urls ? multimedia.image_urls.split(';').filter(Boolean) : []

    return {
      productId: String(productId),
      title: baseInfo.subject || '',
      description: baseInfo.detail || baseInfo.mobile_detail || '',
      images: imageUrls,
      image: imageUrls[0] || '',
      videoUrl: multimedia.ae_video_dtos?.ae_video_d_t_o?.[0]?.media_url || '',
      cost: parseFloat(baseInfo.sale_price?.amount || baseInfo.price?.amount || '0'),
      originalPrice: parseFloat(baseInfo.price?.amount || '0'),
      currency: baseInfo.sale_price?.currency_code || 'AUD',
      category: baseInfo.category_id || '',
      categoryName: baseInfo.product_category_name || '',
      // SKU variants (sizes, colors, etc.)
      variants: skuInfo.map(sku => {
        const props = sku.ae_sku_property_dtos?.ae_sku_property_d_t_o || []
        // Build human-readable label from property values
        const labelParts = props.map(p => p.property_value_definition_name || p.sku_property_value || '').filter(Boolean)
        const image = props.find(p => p.sku_image)?.sku_image || ''
        return {
          skuId: sku.id,
          skuAttr: sku.sku_attr || '',
          label: labelParts.join(' / ') || '',
          properties: props.map(p => ({
            name: p.sku_property_name || '',
            value: p.property_value_definition_name || p.sku_property_value || '',
            image: p.sku_image || '',
          })),
          price: parseFloat(sku.offer_sale_price || sku.sku_price || '0'),
          stock: sku.sku_stock ? parseInt(sku.sku_stock) : null,
          image,
        }
      }),
      // Shipping options
      shipping: shippingInfo.map(s => ({
        company: s.logistics_company || '',
        serviceName: s.service_name || '',
        estimatedDays: s.estimated_delivery_time || '',
        shippingFee: parseFloat(s.freight?.amount || '0'),
        trackingAvailable: s.tracking_available || false,
      })),
      // Store info
      store: {
        id: storeInfo.store_id || '',
        name: storeInfo.store_name || '',
        rating: storeInfo.evaluation_positive_rate || '',
      },
      orders: baseInfo.sales_count || 0,
      rating: baseInfo.avg_evaluation_rating || null,
    }
  } catch (err) {
    console.error(`[AliExpress] ds.product.get failed for ${productId}:`, err.message)
    return null
  }
}

// ============================================
// DS ORDER SUBMIT — place order on AliExpress
// ============================================

export async function submitOrder({ productId, skuId, quantity, shippingAddress, orderAmount }) {
  try {
    // If no SKU attr provided, fetch product details to get the first/default SKU
    let resolvedSkuAttr = ''
    let shippingMethod = 'CAINIAO_STANDARD'
    if (!skuId) {
      try {
        const details = await getProductDetails(productId)
        if (details?.variants?.length > 0) {
          resolvedSkuAttr = details.variants[0].skuAttr || ''
          console.log(`[AliExpress] Auto-resolved SKU for product ${productId}: ${resolvedSkuAttr}`)
        }
        // Use first available shipping method
        if (details?.shipping?.length > 0) {
          shippingMethod = details.shipping[0].serviceName || shippingMethod
        }
      } catch (err) {
        console.error(`[AliExpress] Failed to auto-resolve SKU for ${productId}:`, err.message)
      }
    } else {
      resolvedSkuAttr = skuId
    }

    // aliexpress.trade.buy.placeorder — ACTUALLY places the order on AliExpress
    // Creates "Awaiting Payment" order. Store owner pays in bulk on AliExpress.
    const countryCode = mapCountryToISO(shippingAddress.country || 'AU')
    const fullName = shippingAddress.name || 'Customer'
    const phone = shippingAddress.phone || '0400000000'

    const orderRequest = {
      logistics_address: {
        address: shippingAddress.line1 || shippingAddress.address || 'N/A',
        city: shippingAddress.city || 'N/A',
        country: countryCode,
        contact_person: fullName,
        full_name: fullName,
        mobile_no: phone,
        phone_country: countryCode === 'AU' ? '+61' : '+1',
        province: mapAUState(shippingAddress.state, countryCode) || shippingAddress.state || '',
        zip: shippingAddress.zip || '',
      },
      product_items: [{
        product_id: Number(productId),
        product_count: quantity || 1,
        sku_attr: resolvedSkuAttr,
        logistics_service_name: shippingMethod,
        order_memo: 'ToGoGo dropship order',
      }],
    }

    console.log(`[AliExpress] Placing order: product=${productId}, sku=${resolvedSkuAttr}, qty=${quantity}, ship=${shippingMethod}, to=${orderRequest.logistics_address.full_name}, ${orderRequest.logistics_address.address}, ${orderRequest.logistics_address.city}, ${orderRequest.logistics_address.province}, ${orderRequest.logistics_address.zip}, ${orderRequest.logistics_address.country}`)

    const params = {
      param_place_order_request4_open_api_d_t_o: JSON.stringify(orderRequest),
    }

    const data = await callAuthenticatedAPI('aliexpress.trade.buy.placeorder', params)

    // Response can be in different formats depending on API version
    const result = data?.aliexpress_trade_buy_placeorder_response?.result
      || data?.result
    if (!result) {
      console.error('[AliExpress] Order placement failed:', JSON.stringify(data).slice(0, 500))
      return { success: false, error: 'No result from AliExpress: ' + JSON.stringify(data).slice(0, 200) }
    }

    if (result.is_success === false) {
      return { success: false, error: result.error_msg || 'Order submission failed' }
    }

    console.log(`[AliExpress] Order submitted: ${JSON.stringify(result).slice(0, 300)}`)
    return {
      success: true,
      orderId: result.order_list?.number?.[0] || result.order_id || result.ae_order_id,
      orderData: result,
    }
  } catch (err) {
    console.error('[AliExpress] Order submit error:', err.message)
    return { success: false, error: err.message }
  }
}

// ============================================
// DS ORDER TRACKING — get order status and tracking
// ============================================

// Map AU state abbreviations to full names (AliExpress may require full names)
function mapAUState(state, country) {
  if (!state || country !== 'AU') return state || ''
  const map = {
    'NT': 'Northern Territory', 'NSW': 'New South Wales', 'VIC': 'Victoria',
    'QLD': 'Queensland', 'SA': 'South Australia', 'WA': 'Western Australia',
    'TAS': 'Tasmania', 'ACT': 'Australian Capital Territory',
  }
  return map[state.toUpperCase()] || state
}

// Map common country names to 2-letter ISO codes
function mapCountryToISO(country) {
  if (!country || country.length === 2) return (country || 'AU').toUpperCase()
  const map = {
    'australia': 'AU', 'united states': 'US', 'usa': 'US', 'united kingdom': 'GB',
    'uk': 'GB', 'canada': 'CA', 'new zealand': 'NZ', 'germany': 'DE',
    'france': 'FR', 'italy': 'IT', 'spain': 'ES', 'japan': 'JP',
    'china': 'CN', 'india': 'IN', 'brazil': 'BR', 'mexico': 'MX',
    'south korea': 'KR', 'singapore': 'SG', 'malaysia': 'MY',
    'indonesia': 'ID', 'thailand': 'TH', 'philippines': 'PH',
    'vietnam': 'VN', 'ireland': 'IE', 'netherlands': 'NL',
    'sweden': 'SE', 'norway': 'NO', 'denmark': 'DK', 'finland': 'FI',
    'poland': 'PL', 'austria': 'AT', 'switzerland': 'CH',
    'belgium': 'BE', 'portugal': 'PT', 'russia': 'RU',
  }
  return map[country.toLowerCase()] || country.slice(0, 2).toUpperCase()
}

export async function getOrderTracking(orderId) {
  try {
    // Try the member order query API
    const data = await callAuthenticatedAPI('aliexpress.ds.member.order.get', {
      order_id: String(orderId),
    })

    const result = data?.aliexpress_ds_member_order_get_response?.result
    if (!result) return null

    return {
      orderId: result.order_id || orderId,
      status: result.order_status || result.logistics_status || '',
      trackingNumber: result.logistics_info?.tracking_number || '',
      trackingUrl: result.logistics_info?.tracking_url || '',
      logisticsCompany: result.logistics_info?.logistics_company || '',
      shippedDate: result.send_goods_date || '',
      estimatedDelivery: result.logistics_info?.estimated_delivery_time || '',
      rawData: result,
    }
  } catch (err) {
    console.error(`[AliExpress] Order tracking failed for ${orderId}:`, err.message)
    return null
  }
}

// ============================================
// FEED NAMES — aliexpress.ds.feedname.get
// ============================================

let feedNamesCache = null
let feedNamesCacheTime = 0
const FEED_CACHE_TTL = 60 * 60 * 1000 // 1 hour

async function getFeedNames() {
  const now = Date.now()
  if (feedNamesCache && (now - feedNamesCacheTime) < FEED_CACHE_TTL) {
    return feedNamesCache
  }

  try {
    const data = await callAPI('aliexpress.ds.feedname.get', {})
    const respResult = data?.aliexpress_ds_feedname_get_response?.resp_result?.result
    const feeds = respResult?.promos?.promo || []
    console.log(`[AliExpress] feedname.get returned ${feeds.length} feeds`)
    if (feeds.length > 0) {
      feedNamesCache = feeds
      feedNamesCacheTime = now
    }
    return feeds
  } catch (err) {
    console.error('[AliExpress] feedname.get failed:', err.message)
    return feedNamesCache || []
  }
}

// ============================================
// FEED PRODUCTS — aliexpress.ds.recommend.feed.get
// This is the main product fetching method
// ============================================

async function fetchFeedProducts(feedName, page = 1, pageSize = 50) {
  try {
    const data = await callAPI('aliexpress.ds.recommend.feed.get', {
      feed_name: feedName,
      target_currency: 'AUD',
      target_language: 'EN',
      page_no: String(page),
      page_size: String(Math.min(pageSize, 50)),
      sort: 'volumeDesc',
    })

    const resp = data?.aliexpress_ds_recommend_feed_get_response?.result
    const rawProducts = resp?.products?.traffic_product_d_t_o
      || resp?.products?.product
      || []
    const total = resp?.total_record_count || 0
    const finished = resp?.is_finished || false

    console.log(`[AliExpress] feed "${feedName}" page ${page}: ${rawProducts.length} products (total: ${total}, finished: ${finished})`)
    return { products: rawProducts, total, finished }
  } catch (err) {
    console.error(`[AliExpress] feed "${feedName}" failed:`, err.message)
    return { products: [], total: 0, finished: true }
  }
}

// ============================================
// NORMALISE — Convert raw API product to our format
// ============================================

function normaliseProduct(p) {
  const salePrice = parseFloat(p.target_sale_price || p.app_sale_price || '0')
  const originalPrice = parseFloat(p.target_original_price || p.original_price || '0')
  // Use the HIGHER price as cost base — feed sale prices are often fake promos
  const cost = Math.max(salePrice, originalPrice) || salePrice || originalPrice
  // 3.5x markup ensures profit after AliExpress actual price + currency conversion
  const suggestedPrice = Math.ceil(cost * 3.5 * 100) / 100

  const title = p.product_title || ''
  const image = p.product_main_image_url || p.product_main_image || ''
  // All images: main + small image array
  const smallImages = p.product_small_image_urls?.string
    || p.product_small_image_urls?.productSmallImageUrl
    || []
  const allImages = [image, ...(Array.isArray(smallImages) ? smallImages : [smallImages])].filter(Boolean)

  const evalRate = p.evaluate_rate || p.evaluation_rate || ''

  return {
    id: `ae_${p.product_id}`,
    productId: String(p.product_id),
    title,
    description: title,
    image,
    images: allImages,
    cost,
    originalPrice,
    shipping: 0,
    totalCost: cost,
    suggestedPrice,
    suggestedMargin: Math.round((suggestedPrice - cost) * 100) / 100,
    deliveryDays: p.ship_to_days || 14,
    supplier: 'AliExpress',
    supplierLogo: '🛒',
    sourceUrl: p.product_detail_url || p.promotion_link || `https://www.aliexpress.com/item/${p.product_id}.html`,
    affiliateUrl: p.promotion_link || '',
    minOrderQty: 1,
    category: p.first_level_category_name || p.second_level_category_name || '',
    categoryId: p.first_level_category_id || '',
    rating: evalRate ? parseFloat(String(evalRate).replace('%', '')) / (String(evalRate).includes('%') ? 100 : 1) : null,
    orders: p.lastest_volume || p.product_volume || 0,
    discount: originalPrice > cost ? Math.round((1 - cost / originalPrice) * 100) : 0,
    _live: true,
  }
}

// ============================================
// PRODUCT POOL — Cached pool from multiple feeds
// ============================================

let productPool = []
let productPoolTime = 0
const POOL_CACHE_TTL = 10 * 60 * 1000 // 10 minutes

// Best feeds for an Australian dropshipping store
const PRIORITY_FEEDS = [
  'DS_Global_topsellers',
  'DS_ConsumerElectronics_bestsellers',
  'DS_Home&Kitchen_bestsellers',
  'DS_Beauty_bestsellers',
  'DS_Sports&Outdoors_bestsellers',
  'DS_Automobile&Accessories_bestsellers',
  'DS_NewArrivals',
  'AEB_Topseller_PriceRange0_20',
  'AEB_AU_HomeImprovement&Furniture&Lights&Tools&Luggage',
  'AEB_Fetch_Garden&Tool&Pet&AutoParts_TopSellers_20241210',
  'AEB_i69_FullCategory_TopSellers_20241225',
  'AEB_CETagItems_20241017',
  'AEB_EAN Items',
  'DS_ElectronicComponents_bestsellers',
  'DS_BoxingDayEssentials',
]

async function getProductPool() {
  const now = Date.now()
  if (productPool.length > 0 && (now - productPoolTime) < POOL_CACHE_TTL) {
    console.log(`[AliExpress] Using cached pool: ${productPool.length} products`)
    return productPool
  }

  const feeds = await getFeedNames()
  if (feeds.length === 0) return productPool

  // Use priority feeds first, then fill with others
  const feedNames = feeds.map(f => f.promo_name || f.feed_name || '')
  const selectedFeeds = []

  // Add priority feeds that exist
  for (const pf of PRIORITY_FEEDS) {
    if (feedNames.includes(pf)) selectedFeeds.push(pf)
    if (selectedFeeds.length >= 15) break
  }

  // If we don't have enough, add more from the full list (skip sex/adult feeds)
  if (selectedFeeds.length < 15) {
    for (const name of feedNames) {
      if (selectedFeeds.includes(name)) continue
      if (name.toLowerCase().includes('sex') || name.toLowerCase().includes('adult')) continue
      selectedFeeds.push(name)
      if (selectedFeeds.length >= 15) break
    }
  }

  console.log(`[AliExpress] Fetching from ${selectedFeeds.length} feeds: ${selectedFeeds.slice(0, 5).join(', ')}...`)

  // Fetch page 1 from each feed in parallel
  const results = await Promise.allSettled(
    selectedFeeds.map(feedName => fetchFeedProducts(feedName, 1, 50))
  )

  const allProducts = []
  const seen = new Set()

  for (const result of results) {
    if (result.status !== 'fulfilled') continue
    for (const rawProduct of result.value.products) {
      const id = rawProduct.product_id
      if (!seen.has(id)) {
        seen.add(id)
        allProducts.push(normaliseProduct(rawProduct))
      }
    }
  }

  console.log(`[AliExpress] Product pool: ${allProducts.length} unique products from ${selectedFeeds.length} feeds`)

  if (allProducts.length > 0) {
    productPool = allProducts
    productPoolTime = now
  }

  return allProducts
}

// ============================================
// SEARCH — Main search function
// ============================================

// Map search queries to feed categories
const QUERY_TO_FEEDS = {
  electronics: ['DS_ConsumerElectronics_bestsellers', 'AEB_CETagItems_20241017'],
  phone: ['AEB_ PhoneAccessories_EG', 'DS_ConsumerElectronics_bestsellers'],
  computer: ['AEB_ ComputerAccessories_EG', 'DS_ConsumerElectronics_bestsellers'],
  home: ['DS_Home&Kitchen_bestsellers', 'AEB_AU_HomeImprovement&Furniture&Lights&Tools&Luggage'],
  kitchen: ['DS_Home&Kitchen_bestsellers'],
  beauty: ['DS_Beauty_bestsellers', 'USA_beauty&health_topsellers'],
  sport: ['DS_Sports&Outdoors_bestsellers', 'DS_Sports-Clothing&Shoes'],
  fitness: ['DS_Sports&Outdoors_bestsellers'],
  car: ['DS_Automobile&Accessories_bestsellers'],
  auto: ['DS_Automobile&Accessories_bestsellers'],
  pet: ['AEB_Fetch_Garden&Tool&Pet&AutoParts_TopSellers_20241210', 'pets&supplies_ZA topsellers_ 20240423'],
  dog: ['pets&supplies_ZA topsellers_ 20240423'],
  cat: ['pets&supplies_ZA topsellers_ 20240423'],
  toy: ['toys_ZA topsellers_ 20240423'],
  kid: ['AEB_SHOPLAZZA_Mother&Kids_$10~30_20241115'],
  fashion: ['AEB_SHOPLAZZA_WomenClothing_$10~30_20241115', 'AEB_SHOPLAZZA_MenClothing_$10~30_20241115'],
  watch: ['AEB_SHOPLAZZA_ApparelAccessories_$10~30_20241115'],
  jewel: ['AEB_SHOPLAZZA_ApparelAccessories_$10~30_20241115'],
  bag: ['AEB_SHOPLAZZA_Luggage&Bags_$10~30_20241115'],
  shoe: ['AEB_SHOPLAZZA_Shoes_$10~30_20241115'],
  summer: ['AEB_ SummerProducts_EG'],
}

export async function searchAliExpress(query, page = 1) {
  const appKey = process.env.ALIEXPRESS_APP_KEY
  if (!appKey) {
    console.error('[AliExpress] No ALIEXPRESS_APP_KEY')
    return []
  }

  try {
    // If specific query, try to find matching feeds
    if (query && query.trim()) {
      const q = query.toLowerCase().trim()

      // Check if we have category-specific feeds for this query
      for (const [keyword, feedNames] of Object.entries(QUERY_TO_FEEDS)) {
        if (q.includes(keyword)) {
          console.log(`[AliExpress] Query "${q}" matched keyword "${keyword}", fetching specific feeds`)
          const results = await Promise.allSettled(
            feedNames.map(fn => fetchFeedProducts(fn, page, 50))
          )
          let products = []
          const seen = new Set()
          for (const r of results) {
            if (r.status !== 'fulfilled') continue
            for (const p of r.value.products) {
              if (!seen.has(p.product_id)) {
                seen.add(p.product_id)
                products.push(normaliseProduct(p))
              }
            }
          }

          // Further filter by keyword in title
          if (products.length > 10) {
            const keywords = q.split(/\s+/).filter(w => w.length > 2)
            const filtered = products.filter(p => {
              const text = (p.title + ' ' + p.category).toLowerCase()
              return keywords.some(kw => text.includes(kw))
            })
            if (filtered.length >= 5) products = filtered
          }

          return filterNSFW(products)
        }
      }

      // No specific feed match — search the product pool by keyword
      const pool = await getProductPool()
      const keywords = q.split(/\s+/).filter(w => w.length > 2)
      const filtered = pool.filter(p => {
        const text = (p.title + ' ' + p.category).toLowerCase()
        return keywords.some(kw => text.includes(kw))
      })
      return filterNSFW(filtered.length > 0 ? filtered : pool.slice(0, 100))
    }

    // No query — return the full product pool (trending/bestsellers)
    const pool = await getProductPool()
    return filterNSFW(pool)
  } catch (err) {
    console.error('[AliExpress] searchAliExpress error:', err.message)
    return []
  }
}

// ============================================
// FETCH BULK — For cron jobs / catalog building
// ============================================

export async function fetchBulkProducts({ maxProducts = 1500 } = {}) {
  const feeds = await getFeedNames()
  if (feeds.length === 0) return []

  const allProducts = []
  const seen = new Set()

  // Filter out adult feeds
  const safeFeedNames = feeds
    .map(f => f.promo_name || '')
    .filter(n => !n.toLowerCase().includes('sex') && !n.toLowerCase().includes('adult'))

  for (const feedName of safeFeedNames) {
    if (allProducts.length >= maxProducts) break

    for (let page = 1; page <= 3; page++) {
      if (allProducts.length >= maxProducts) break

      const result = await fetchFeedProducts(feedName, page, 50)
      for (const p of result.products) {
        if (!seen.has(p.product_id)) {
          seen.add(p.product_id)
          allProducts.push(normaliseProduct(p))
        }
      }

      if (result.finished || result.products.length < 50) break
      await new Promise(r => setTimeout(r, 300))
    }
  }

  console.log(`[AliExpress] fetchBulkProducts: ${allProducts.length} unique products`)
  return filterNSFW(allProducts)
}

// ============================================
// PRICE COMPARISON — Group same/similar products
// ============================================
export function groupByProduct(products) {
  const normalise = (title) => title
    .toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim()

  const groups = new Map()
  for (const product of products) {
    const key = normalise(product.title)
    if (groups.has(key)) groups.get(key).push(product)
    else groups.set(key, [product])
  }

  const result = []
  for (const [, group] of groups) {
    if (group.length > 1) {
      group.sort((a, b) => a.totalCost - b.totalCost)
      group[0]._bestDeal = true
    }
    result.push(...group)
  }
  return result
}

// ============================================
// SUPPLIER SEARCH MAP
// ============================================
const SUPPLIER_SEARCH_MAP = {
  'AliExpress': (q, page) => searchAliExpress(q, page),
}

export function parseSuppliers(suppliersParam) {
  if (!suppliersParam) return Object.keys(SUPPLIER_SEARCH_MAP)
  return suppliersParam.split(',').filter(s => SUPPLIER_SEARCH_MAP[s])
}

export async function searchAllSuppliers(query, page = 1, suppliersParam) {
  const activeSuppliers = parseSuppliers(suppliersParam)
  const results = await Promise.allSettled(
    activeSuppliers.map(s => SUPPLIER_SEARCH_MAP[s](query, page))
  )
  let products = results.filter(r => r.status === 'fulfilled').flatMap(r => r.value)
  const hasLiveData = products.some(p => p._live)
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
