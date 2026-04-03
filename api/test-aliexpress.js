// Debug endpoint — shows RAW AliExpress API response
// Visit: https://togogo.me/api/test-aliexpress
import crypto from 'crypto'

function signRequest(params, appSecret) {
  const sorted = Object.keys(params)
    .filter(k => k !== 'sign')
    .sort()
    .map(k => `${k}${params[k]}`)
    .join('')
  return crypto.createHmac('sha256', appSecret).update(sorted).digest('hex').toUpperCase()
}

export default async function handler(req, res) {
  const appKey = process.env.ALIEXPRESS_APP_KEY
  const appSecret = process.env.ALIEXPRESS_APP_SECRET

  if (!appKey || !appSecret) {
    return res.json({ error: 'Missing API keys', hasKey: !!appKey, hasSecret: !!appSecret })
  }

  const { method: apiMethod } = req.query

  // Try 3 different API methods to see which ones work
  const methods = apiMethod ? [apiMethod] : [
    'aliexpress.affiliate.hotproduct.query',
    'aliexpress.affiliate.product.query',
    'aliexpress.affiliate.category.get',
  ]

  const results = {}

  for (const method of methods) {
    try {
      const params = {
        app_key: appKey,
        method,
        sign_method: 'hmac-sha256',
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        format: 'json',
        v: '2.0',
      }

      // Add method-specific params
      if (method.includes('hotproduct') || method.includes('product.query')) {
        params.target_currency = 'AUD'
        params.target_language = 'EN'
        params.page_no = '1'
        params.page_size = '5'
        params.tracking_id = appKey
      }
      if (method.includes('product.query')) {
        params.keywords = 'phone case'
      }

      params.sign = signRequest(params, appSecret)

      const qs = new URLSearchParams(params).toString()
      const url = `https://api-sg.aliexpress.com/sync?${qs}`

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })

      const text = await response.text()
      let parsed
      try { parsed = JSON.parse(text) } catch { parsed = text }

      results[method] = {
        httpStatus: response.status,
        response: parsed,
      }
    } catch (err) {
      results[method] = { error: err.message }
    }
  }

  return res.json({
    appKeyPrefix: appKey.slice(0, 4) + '...',
    timestamp: new Date().toISOString(),
    results,
  })
}
