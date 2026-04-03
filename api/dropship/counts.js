// Returns approximate product catalog sizes for AliExpress
// Cached for 1 hour since catalog sizes don't change often
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
  return crypto.createHmac('sha256', appSecret).update(sorted).digest('hex').toUpperCase()
}

async function getAliExpressCount() {
  const appKey = process.env.ALIEXPRESS_APP_KEY
  const appSecret = process.env.ALIEXPRESS_APP_SECRET
  if (!appKey || !appSecret) return { count: 10000000, estimated: true }

  try {
    const params = {
      app_key: appKey,
      method: 'aliexpress.ds.feedname.get',
      sign_method: 'hmac-sha256',
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
    const respResult = data?.aliexpress_ds_feedname_get_response?.resp_result?.result
    const promos = respResult?.promos?.promo || []
    // Sum product counts across all feeds for a real total
    const totalProducts = promos.reduce((sum, p) => sum + (p.product_num || 0), 0)
    return { count: totalProducts || 10000000, estimated: totalProducts === 0, feeds: promos.length }
  } catch {
    return { count: 10000000, estimated: true }
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
    const aliexpress = await getAliExpressCount()

    const counts = {
      'AliExpress': aliexpress,
    }

    const result = { counts, fetchedAt: new Date().toISOString() }
    cachedCounts = result
    cachedAt = now

    return res.status(200).json(result)
  } catch (error) {
    console.error('Counts API error:', error)
    return res.status(200).json({
      counts: {
        'AliExpress': { count: 10000000, estimated: true },
      },
      fetchedAt: new Date().toISOString(),
    })
  }
}
