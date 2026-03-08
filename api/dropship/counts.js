// Returns approximate product catalog sizes for each supplier
// These are cached for 1 hour since catalog sizes don't change often
import crypto from 'crypto'

let cachedCounts = null
let cachedAt = 0
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

function signAliExpressRequest(params, appSecret) {
  const sorted = Object.keys(params)
    .filter(k => k !== 'sign')
    .sort()
    .map(k => `${k}${params[k]}`)
    .join('')
  const signStr = `${appSecret}${sorted}${appSecret}`
  return crypto.createHmac('sha256', appSecret).update(signStr).digest('hex').toUpperCase()
}

async function getCJCount() {
  const apiKey = process.env.CJ_DROPSHIPPING_API_KEY
  if (!apiKey) return { count: 500000, estimated: true }

  try {
    // Get access token
    const authRes = await fetch('https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey }),
    })
    const authData = await authRes.json()
    const token = authData.data?.accessToken
    if (!token) return { count: 500000, estimated: true }

    // Query with empty search to get total
    const res = await fetch('https://developers.cjdropshipping.com/api2.0/v1/product/list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'CJ-Access-Token': token },
      body: JSON.stringify({ pageNum: 1, pageSize: 1 }),
    })
    const data = await res.json()
    const total = data.data?.total || data.data?.pageTotal || 500000
    return { count: total, estimated: false }
  } catch {
    return { count: 500000, estimated: true }
  }
}

async function getAliExpressCount() {
  const appKey = process.env.ALIEXPRESS_APP_KEY
  const appSecret = process.env.ALIEXPRESS_APP_SECRET
  if (!appKey || !appSecret) return { count: 10000000, estimated: true }

  try {
    const params = {
      app_key: appKey,
      method: 'aliexpress.ds.feedname.get',
      sign_method: 'sha256',
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      format: 'json',
      v: '2.0',
    }
    params.sign = signAliExpressRequest(params, appSecret)

    const res = await fetch(`https://api-sg.aliexpress.com/sync?${new URLSearchParams(params)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    const data = await res.json()
    const feeds = data?.aliexpress_ds_feedname_get_response?.result?.feed_names?.feed_name || []
    // Each feed has thousands; AliExpress has millions total
    return { count: 10000000, estimated: true, feeds: feeds.length }
  } catch {
    return { count: 10000000, estimated: true }
  }
}

async function getPrintfulCount() {
  const apiKey = process.env.PRINTFUL_API_KEY
  if (!apiKey) return { count: 400, estimated: true }

  try {
    const res = await fetch('https://api.printful.com/products', {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    const data = await res.json()
    const products = data.result || []
    // Each product has many variants (sizes, colors)
    const totalVariants = products.reduce((sum, p) => sum + (p.variant_count || 10), 0)
    return { count: products.length, variants: totalVariants, estimated: false }
  } catch {
    return { count: 400, estimated: true }
  }
}

async function getPrintifyCount() {
  const apiKey = process.env.PRINTIFY_API_KEY
  if (!apiKey) return { count: 800, estimated: true }

  try {
    const res = await fetch('https://api.printify.com/v1/catalog/blueprints.json', {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    const data = await res.json()
    const blueprints = Array.isArray(data) ? data : (data.data || [])
    return { count: blueprints.length, estimated: false }
  } catch {
    return { count: 800, estimated: true }
  }
}

async function getGootenCount() {
  const recipeId = process.env.GOOTEN_RECIPE_ID
  if (!recipeId) return { count: 300, estimated: true }

  try {
    const res = await fetch(`https://api.print.io/api/v/4/source/api/products?recipeId=${recipeId}&countryCode=US&showAllProducts=true`)
    const data = await res.json()
    const products = data.Products || data.products || []
    // Flatten if grouped by category
    let total = 0
    if (products.length > 0 && products[0]?.items) {
      total = products.reduce((sum, cat) => sum + (cat.items?.length || 0), 0)
    } else {
      total = products.length
    }
    return { count: total, estimated: false }
  } catch {
    return { count: 300, estimated: true }
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const now = Date.now()
  if (cachedCounts && (now - cachedAt) < CACHE_TTL) {
    return res.status(200).json(cachedCounts)
  }

  try {
    const [cj, aliexpress, printful, printify, gooten] = await Promise.allSettled([
      getCJCount(),
      getAliExpressCount(),
      getPrintfulCount(),
      getPrintifyCount(),
      getGootenCount(),
    ])

    const counts = {
      'CJ Dropshipping': cj.status === 'fulfilled' ? cj.value : { count: 500000, estimated: true },
      'AliExpress': aliexpress.status === 'fulfilled' ? aliexpress.value : { count: 10000000, estimated: true },
      'Printful': printful.status === 'fulfilled' ? printful.value : { count: 400, estimated: true },
      'Printify': printify.status === 'fulfilled' ? printify.value : { count: 800, estimated: true },
      'Gooten': gooten.status === 'fulfilled' ? gooten.value : { count: 300, estimated: true },
    }

    const result = { counts, fetchedAt: new Date().toISOString() }
    cachedCounts = result
    cachedAt = now

    return res.status(200).json(result)
  } catch (error) {
    console.error('Counts API error:', error)
    // Return fallback estimates
    return res.status(200).json({
      counts: {
        'CJ Dropshipping': { count: 500000, estimated: true },
        'AliExpress': { count: 10000000, estimated: true },
        'Printful': { count: 400, estimated: true },
        'Printify': { count: 800, estimated: true },
        'Gooten': { count: 300, estimated: true },
      },
      fetchedAt: new Date().toISOString(),
    })
  }
}
