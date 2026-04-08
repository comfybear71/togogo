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

export async function callAPI(method, params = {}) {
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
// WHOLESALE PRICING — aliexpress.ds.product.wholesale.get
// ============================================

export async function getWholesalePricing(productId) {
  try {
    const data = await callAuthenticatedAPI('aliexpress.ds.product.wholesale.get', {
      product_id: String(productId),
    })

    const result = data?.aliexpress_ds_product_wholesale_get_response?.result
    if (!result) {
      console.log(`[AliExpress] No wholesale pricing for product ${productId}`)
      return null
    }

    // Parse tier pricing (e.g., buy 10+ for $5, buy 50+ for $4)
    const tiers = result?.wholesale_tier_list?.wholesale_tier_d_t_o || []

    return {
      productId: String(productId),
      available: tiers.length > 0,
      tiers: tiers.map(t => ({
        minQty: parseInt(t.min_quantity || '0'),
        maxQty: t.max_quantity ? parseInt(t.max_quantity) : null,
        price: parseFloat(t.price?.amount || '0'),
        currency: t.price?.currency_code || 'USD',
        discount: t.discount || null,
      })),
      rawData: result,
    }
  } catch (err) {
    console.error(`[AliExpress] Wholesale pricing failed for ${productId}:`, err.message)
    return null
  }
}

// ============================================
// DS ORDER SUBMIT — place order on AliExpress
// ============================================

export async function submitOrder({ productId, skuId, quantity, shippingAddress, orderAmount, promotionCode, orderId }) {
  try {
    // Resolve SKU attr if not provided
    let resolvedSkuAttr = skuId || ''
    let shippingMethod = 'CAINIAO_STANDARD'
    if (!resolvedSkuAttr) {
      try {
        const details = await getProductDetails(productId)
        if (details?.variants?.length > 0) {
          resolvedSkuAttr = details.variants[0].skuAttr || ''
          console.log(`[AliExpress] Auto-resolved SKU for product ${productId}: ${resolvedSkuAttr}`)
        }
        if (details?.shipping?.length > 0) {
          shippingMethod = details.shipping[0].serviceName || shippingMethod
        }
      } catch (err) {
        console.error(`[AliExpress] Failed to auto-resolve SKU for ${productId}:`, err.message)
      }
    }

    // Map country and state
    const countryCode = mapCountryToISO(shippingAddress.country || 'AU')
    const fullName = shippingAddress.name || shippingAddress.contact_person || 'Customer'
    const phone = shippingAddress.phone?.replace(/\s/g, '') || '0400000000'
    // Combine address lines (line2 has villa/unit/apartment numbers)
    const addressLine = [shippingAddress.line1, shippingAddress.line2].filter(Boolean).join(', ')
      || shippingAddress.address || 'N/A'

    // aliexpress.ds.order.create — DS-specific order API (triggers auto-pay)
    const orderRequest = {
      logistics_address: {
        address: addressLine,
        city: shippingAddress.city || 'N/A',
        country: countryCode,
        contact_person: fullName,
        full_name: fullName,
        mobile_no: phone,
        phone_country: countryCode === 'AU' ? '+61' : '+1',
        province: mapAUState(shippingAddress.state, countryCode) || shippingAddress.state || '',
        zip: shippingAddress.zip || shippingAddress.postcode || shippingAddress.postal_code || '',
      },
      product_items: [{
        product_id: Number(productId),
        product_count: quantity || 1,
        sku_attr: resolvedSkuAttr,
        logistics_service_name: shippingMethod,
        order_memo: 'ToGoGo dropship order',
      }],
      out_order_id: orderId || undefined,
    }

    // Add promotion/coupon code if available
    if (promotionCode) {
      orderRequest.promotion = { promotion_code: promotionCode }
      console.log(`[AliExpress] Applying promo code: ${promotionCode}`)
    }

    console.log(`[AliExpress] Placing DS order: product=${productId}, sku=${resolvedSkuAttr}, qty=${quantity}, to=${fullName}, ${orderRequest.logistics_address.city}, ${orderRequest.logistics_address.province}, ${countryCode}`)

    // ds_extend_request: contains auto-pay trigger (try_to_pay)
    const dsExtendRequest = {
      payment: {
        pay_currency: 'USD',
        try_to_pay: 'true',
      },
    }

    // Add promotion to ds_extend_request if available
    if (promotionCode) {
      dsExtendRequest.promotion = { promotion_activity_id: promotionCode }
    }

    // Use wholesale pricing model for bulk orders (10+)
    if (quantity >= 10) {
      dsExtendRequest.trade_extra_param = { business_model: 'wholesale' }
      console.log(`[AliExpress] Bulk order (qty=${quantity}), using wholesale pricing`)
    }

    const params = {
      param_place_order_request4_open_api_d_t_o: JSON.stringify(orderRequest),
      ds_extend_request: JSON.stringify(dsExtendRequest),
    }

    console.log(`[AliExpress] ds_extend_request: ${JSON.stringify(dsExtendRequest)}`)

    const data = await callAuthenticatedAPI('aliexpress.ds.order.create', params)

    console.log(`[AliExpress] DS order.create raw response: ${JSON.stringify(data).slice(0, 500)}`)

    // Response can be in different formats depending on API version
    const result = data?.aliexpress_ds_order_create_response?.result
      || data?.aliexpress_trade_buy_placeorder_response?.result
      || data?.result
    if (!result) {
      console.error('[AliExpress] Order placement failed:', JSON.stringify(data).slice(0, 500))
      return { success: false, error: 'No result from AliExpress: ' + JSON.stringify(data).slice(0, 200) }
    }

    if (result.is_success === false) {
      return { success: false, error: result.error_msg || 'Order submission failed' }
    }

    console.log(`[AliExpress] Order submitted: ${JSON.stringify(result).slice(0, 300)}`)
    const aeOrderId = result.order_list?.number?.[0] || result.order_id || result.ae_order_id

    // Step 2: Trigger auto-pay — call payment API to charge the authorized PayPal/card
    // Without this, orders sit in "Awaiting Payment" even with auto-pay activated
    if (aeOrderId) {
      try {
        // Try multiple payment API endpoints
        const payApis = [
          'aliexpress.trade.order.pay',
          'aliexpress.ds.order.pay',
          'aliexpress.trade.pay.order',
        ]
        let paySuccess = false
        for (const payApi of payApis) {
          try {
            const payResult = await callAuthenticatedAPI(payApi, {
              order_id: String(aeOrderId),
              pay_type: 'autopay',
            })
            console.log(`[AliExpress] Auto-pay (${payApi}): ${JSON.stringify(payResult).slice(0, 300)}`)
            if (payResult && !payResult.error_response) {
              paySuccess = true
              break
            }
          } catch (payErr) {
            console.log(`[AliExpress] Auto-pay ${payApi} failed: ${payErr.message}`)
          }
        }
        if (!paySuccess) {
          console.log(`[AliExpress] Auto-pay APIs not available — order ${aeOrderId} may need manual payment`)
        }
      } catch (autoPayErr) {
        console.error(`[AliExpress] Auto-pay error for ${aeOrderId}:`, autoPayErr.message)
      }
    }

    return {
      success: true,
      orderId: aeOrderId,
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
    // Try multiple API paths — AliExpress DS has different endpoints
    let result = null
    const apiPaths = [
      { method: 'aliexpress.trade.ds.order.get', key: 'aliexpress_trade_ds_order_get_response', auth: false },
      { method: 'aliexpress.ds.trade.order.get', key: 'aliexpress_ds_trade_order_get_response', auth: false },
      { method: 'aliexpress.trade.ds.order.get', key: 'aliexpress_trade_ds_order_get_response', auth: true },
    ]

    for (const api of apiPaths) {
      try {
        const params = {
          single_order_query: JSON.stringify({ order_id: Number(orderId) }),
        }
        const data = api.auth
          ? await callAuthenticatedAPI(api.method, params)
          : await callAPI(api.method, params)

        // Try to find result in response (AliExpress nests results differently)
        result = data?.[api.key]?.result
          || data?.[api.key]?.data
          || data?.result
          || data?.data
        if (result) {
          console.log(`[AliExpress] Order ${orderId} found via ${api.method}`)
          break
        }
      } catch (err) {
        console.log(`[AliExpress] ${api.method} failed for ${orderId}: ${err.message}`)
      }
    }

    // Fallback: try simple param format
    if (!result) {
      try {
        const data = await callAPI('aliexpress.trade.ds.order.get', { order_id: String(orderId) })
        result = data?.aliexpress_trade_ds_order_get_response?.result || data?.result
        if (result) console.log(`[AliExpress] Order ${orderId} found via simple format`)
      } catch (err) {
        console.log(`[AliExpress] Simple format failed for ${orderId}: ${err.message}`)
      }
    }

    if (!result) {
      console.log(`[AliExpress] No tracking result for order ${orderId} — all API paths failed`)
      return null
    }

    // AliExpress uses various status strings — map them all
    const rawStatus = (result.order_status || result.logistics_status || '').toUpperCase()
    console.log(`[AliExpress] Order ${orderId} raw status: ${rawStatus}, logistics: ${JSON.stringify(result.logistics_info_list || result.logistics_info || 'none').slice(0, 200)}`)

    // Extract logistics info — can be in different locations
    const logisticsInfo = result.logistics_info_list?.logistics_info_list?.[0]
      || result.logistics_info_list?.[0]
      || result.logistics_info
      || {}

    let status = rawStatus
    // Map AliExpress statuses to our statuses
    if (['WAIT_SELLER_SEND_GOODS', 'PLACE_ORDER_SUCCESS', 'IN_CANCEL', 'WAIT_BUYER_ACCEPT_GOODS'].includes(rawStatus)) {
      if (rawStatus === 'WAIT_BUYER_ACCEPT_GOODS') status = 'shipped'
      else if (rawStatus === 'IN_CANCEL') status = 'cancelled'
      else status = 'processing'
    } else if (['SELLER_SENT_GOODS', 'PARTIAL_SEND_GOODS', 'IN_TRANSIT'].includes(rawStatus) || logisticsInfo.tracking_number) {
      status = 'shipped'
    } else if (['FINISH', 'COMPLETED', 'BUYER_ACCEPT_GOODS'].includes(rawStatus)) {
      status = 'delivered'
    } else if (['FUND_PROCESSING', 'IN_ISSUE', 'IN_FROZEN'].includes(rawStatus)) {
      status = 'processing'
    } else if (['CANCELLED', 'CANCELED', 'CLOSED'].includes(rawStatus)) {
      status = 'cancelled'
    }

    return {
      orderId: result.order_id || orderId,
      status,
      trackingNumber: logisticsInfo.tracking_number || logisticsInfo.logistics_no || '',
      trackingUrl: logisticsInfo.tracking_url || logisticsInfo.logistics_tracking_url || '',
      logisticsCompany: logisticsInfo.logistics_company || logisticsInfo.logistics_service || '',
      shippedDate: result.send_goods_date || logisticsInfo.send_goods_date || '',
      estimatedDelivery: logisticsInfo.estimated_delivery_time || '',
      rawData: result,
    }
  } catch (err) {
    console.error(`[AliExpress] Order tracking failed for ${orderId}:`, err.message)
    return null
  }
}

// ============================================
// FREIGHT CALCULATOR — exact shipping costs to any country
// No OAuth required — uses app_key + signature only
// ============================================

export async function calculateFreight(productId, quantity = 1, countryCode = 'AU', skuId = '') {
  try {
    const params = {
      param_aeop_freight_calculate_for_buyer_d_t_o: JSON.stringify({
        product_id: Number(productId),
        product_num: quantity,
        country_code: countryCode,
        send_goods_country_code: 'CN',
        ...(skuId ? { sku_id: String(skuId) } : {}),
      }),
    }

    const data = await callAPI('aliexpress.logistics.buyer.freight.calculate', params)

    const result = data?.aliexpress_logistics_buyer_freight_calculate_response?.result
    if (!result?.success) {
      console.error('[AliExpress] Freight calc failed:', result?.error_desc || JSON.stringify(data).slice(0, 300))
      return null
    }

    const options = result.aeop_freight_calculate_result_for_buyer_d_t_o_list
      ?.aeop_freight_calculate_result_for_buyer_dto || []

    return options.map(o => ({
      serviceName: o.service_name || '',
      cost: parseFloat(o.freight?.amount || '0'),
      costCents: parseInt(o.freight?.cent || '0'),
      currency: o.freight?.currency_code || 'USD',
      estimatedDays: o.estimated_delivery_time || '',
      trackingAvailable: o.tracking_available === true || o.tracking_available === 'true',
    }))
  } catch (err) {
    console.error('[AliExpress] Freight calc error:', err.message)
    return null
  }
}

// ============================================
// DS FREIGHT QUERY — aliexpress.ds.freight.query
// DS-specific freight calculation (may work without OAuth unlike the logistics API)
// ============================================

export async function queryDSFreight(productId, countryCode = 'AU', quantity = 1, skuId = '') {
  try {
    const params = {
      product_id: String(productId),
      country_code: countryCode,
      product_num: String(quantity),
      send_goods_country_code: 'CN',
      ...(skuId ? { sku_id: String(skuId) } : {}),
    }

    // Try without OAuth first, then with
    let data
    try {
      data = await callAPI('aliexpress.ds.freight.query', params)
    } catch {
      data = await callAuthenticatedAPI('aliexpress.ds.freight.query', params)
    }

    console.log(`[AliExpress] DS freight query for ${productId}: ${JSON.stringify(data).slice(0, 500)}`)

    const result = data?.aliexpress_ds_freight_query_response?.result
      || data?.result
    if (!result) return null

    const options = result.freight_list?.freight || result.aeop_freight_calculate_result_for_buyer_d_t_o_list?.aeop_freight_calculate_result_for_buyer_dto || []

    return options.map(o => ({
      serviceName: o.service_name || o.logistics_service_name || '',
      cost: parseFloat(o.freight?.amount || o.shipping_fee || '0'),
      currency: o.freight?.currency_code || o.currency || 'USD',
      estimatedDays: o.estimated_delivery_time || o.delivery_time || '',
      trackingAvailable: o.tracking_available === true || o.tracking_available === 'true',
    }))
  } catch (err) {
    console.error('[AliExpress] DS freight query error:', err.message)
    return null
  }
}

// ============================================
// DS ORDER TRACKING — aliexpress.ds.order.tracking.get
// DS-specific tracking endpoint (alternative to trade.ds.order.get)
// ============================================

export async function getDSOrderTracking(orderId) {
  try {
    const params = { order_id: String(orderId) }

    let data
    try {
      data = await callAuthenticatedAPI('aliexpress.ds.order.tracking.get', params)
    } catch {
      data = await callAPI('aliexpress.ds.order.tracking.get', params)
    }

    console.log(`[AliExpress] DS tracking for ${orderId}: ${JSON.stringify(data).slice(0, 500)}`)

    const result = data?.aliexpress_ds_order_tracking_get_response?.result
      || data?.result
    if (!result) return null

    // Extract tracking details
    const trackingInfo = result.tracking_info_list?.tracking_info || result.details?.details || []

    return {
      orderId: String(orderId),
      trackingNumber: result.tracking_number || result.logistics_no || '',
      logisticsCompany: result.logistics_company || result.service_name || '',
      trackingUrl: result.official_website || result.tracking_url || '',
      events: Array.isArray(trackingInfo) ? trackingInfo.map(e => ({
        description: e.event_desc || e.description || '',
        date: e.signed_date || e.event_date || '',
        status: e.status || '',
        location: e.address || e.location || '',
      })) : [],
      rawData: result,
    }
  } catch (err) {
    console.error('[AliExpress] DS tracking error:', err.message)
    return null
  }
}

// ============================================
// DS LEVEL REPORTING — report orders to build DS level for automatic discounts
// Level C ($1k+) = ~2% off, Level B = ~3-4%, Level A = ~5%+
// ============================================

export async function reportOrderForDSLevel({ productId, orderId, orderAmount, skuInfo, payTime }) {
  try {
    const now = new Date()
    const paytime = payTime || (
      now.getUTCFullYear().toString()
      + String(now.getUTCMonth() + 1).padStart(2, '0')
      + String(now.getUTCDate()).padStart(2, '0')
      + ':' + String(now.getUTCHours()).padStart(2, '0')
      + String(now.getUTCMinutes()).padStart(2, '0')
      + String(now.getUTCSeconds()).padStart(2, '0')
    )

    const params = {
      ae_product_id: String(productId),
      ae_orderid: String(orderId || ''),
      product_amount: parseFloat(orderAmount || 0).toFixed(2),
      order_amount: parseFloat(orderAmount || 0).toFixed(2),
      ae_sku_info: String(skuInfo || ''),
      product_url: `https://www.aliexpress.com/item/${productId}.html`,
      paytime,
    }

    const data = await callAuthenticatedAPI('aliexpress.ds.member.orderdata.submit', params)

    const result = data?.aliexpress_ds_member_orderdata_submit_response?.result
    if (result?.is_success || result?.success) {
      console.log(`[AliExpress] DS Level: reported order ${orderId} for product ${productId}`)
      return { success: true }
    } else {
      console.error('[AliExpress] DS Level report failed:', JSON.stringify(data).slice(0, 300))
      return { success: false, error: result?.error_msg || 'Report failed' }
    }
  } catch (err) {
    console.error('[AliExpress] DS Level report error:', err.message)
    return { success: false, error: err.message }
  }
}

// ============================================
// DS MEMBER BENEFITS — check DS level and available discounts
// ============================================

export async function getDSMemberBenefits() {
  try {
    const data = await callAuthenticatedAPI('aliexpress.ds.member.benefit.get', {})

    console.log(`[AliExpress] DS member benefits response: ${JSON.stringify(data).slice(0, 500)}`)

    const result = data?.aliexpress_ds_member_benefit_get_response?.result
      || data?.aliexpress_ds_member_benefit_get_response
      || data

    return {
      success: true,
      benefits: result,
      rawData: data,
    }
  } catch (err) {
    console.error('[AliExpress] DS member benefits error:', err.message)
    return { success: false, error: err.message }
  }
}

// ============================================
// DETAILED TRACKING — full tracking events for shipped orders
// ============================================

export async function getDetailedTracking(trackingNumber, orderId, serviceName = 'CAINIAO_STANDARD') {
  try {
    const data = await callAPI('aliexpress.logistics.ds.trackinginfo.query', {
      logistics_no: trackingNumber,
      origin: 'ESCROW',
      out_ref: String(orderId),
      service_name: serviceName,
      to_area: 'AU',
    })

    const response = data?.aliexpress_logistics_ds_trackinginfo_query_response
    if (!response?.result_success) {
      return null
    }

    const events = response.details?.details || []
    return {
      trackingNumber,
      trackingUrl: response.official_website || '',
      events: events.map(e => ({
        description: e.event_desc || '',
        date: e.signed_date || '',
        status: e.status || '',
        location: e.address || '',
      })),
    }
  } catch (err) {
    console.error('[AliExpress] Detailed tracking error:', err.message)
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
      country: 'AU',
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
  // Use the SALE price (what people actually pay), not the inflated "was" price
  const cost = salePrice || originalPrice
  // Add 15% tax estimate (AU GST 10% + AE platform fees ~5%)
  const costWithTax = cost * 1.15
  // 1.5x markup on cost+tax — this is the price shown on screen
  const suggestedPrice = Math.ceil(costWithTax * 1.5 * 100) / 100

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
    freeShipping: !!(p.logistics_type === 'free' || p.ship_to_days),
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
  // Deal & discount feeds (cheapest/best value products)
  'AEB_WholesalePriceGood_20241205',
  'AEB_US_LocalStock_Choice_20240830',
  'AEB_Topseller_PriceRange0~20$',
  'AEB_Topseller_PriceRange0_20',
  // Large curated selections
  'AEB_Shoplazza_SelectedItems_20241011',
  'AEB_i69_FullCategory_TopSellers_20241225',
  // Category bestsellers
  'DS_Global_topsellers',
  'DS_ConsumerElectronics_bestsellers',
  'DS_Home&Kitchen_bestsellers',
  'DS_Beauty_bestsellers',
  'DS_Sports&Outdoors_bestsellers',
  'DS_Automobile&Accessories_bestsellers',
  'DS_NewArrivals',
  // AU-specific & home
  'AEB_AU_HomeImprovement&Furniture&Lights&Tools&Luggage',
  'AEB_US_Home&Garden_TopSellers',
  'AEB_US_Lighting_TopSellers',
  'AEB_US_Furniture_TopSellers',
  // More categories
  'AEB_Fetch_Garden&Tool&Pet&AutoParts_TopSellers_20241210',
  'AEB_CETagItems_20241017',
  'AEB_EAN Items',
  'DS_ElectronicComponents_bestsellers',
  'DS_BoxingDayEssentials',
  'AEB_SurpriseBox_TechKidsWomen_20241024',
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
