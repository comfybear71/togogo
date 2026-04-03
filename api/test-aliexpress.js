// Debug endpoint — tests which AliExpress APIs your app has access to
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

async function callAPI(appKey, appSecret, method, extraParams = {}) {
  const params = {
    app_key: appKey,
    method,
    sign_method: 'hmac-sha256',
    timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
    format: 'json',
    v: '2.0',
    ...extraParams,
  }
  params.sign = signRequest(params, appSecret)
  const qs = new URLSearchParams(params).toString()
  const response = await fetch(`https://api-sg.aliexpress.com/sync?${qs}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  const text = await response.text()
  try { return JSON.parse(text) } catch { return { raw: text } }
}

export default async function handler(req, res) {
  const appKey = process.env.ALIEXPRESS_APP_KEY
  const appSecret = process.env.ALIEXPRESS_APP_SECRET

  if (!appKey || !appSecret) {
    return res.json({ error: 'Missing API keys' })
  }

  const results = {}

  // Test 1: DS Feed Names (Dropshipping API - no OAuth needed)
  try {
    const data = await callAPI(appKey, appSecret, 'aliexpress.ds.feedname.get', {})
    results['ds.feedname.get'] = {
      status: data.error_response ? 'DENIED' : 'OK',
      response: data,
    }
  } catch (e) { results['ds.feedname.get'] = { error: e.message } }

  // Test 2: DS Recommend Feed (Dropshipping API)
  try {
    const data = await callAPI(appKey, appSecret, 'aliexpress.ds.recommend.feed.get', {
      feed_name: 'DS bestselling products',
      target_currency: 'AUD',
      target_language: 'EN',
      page_no: '1',
      page_size: '3',
      sort: 'volumeDesc',
    })
    results['ds.recommend.feed.get'] = {
      status: data.error_response ? 'DENIED' : 'OK',
      response: data,
    }
  } catch (e) { results['ds.recommend.feed.get'] = { error: e.message } }

  // Test 3: Affiliate Hot Products
  try {
    const data = await callAPI(appKey, appSecret, 'aliexpress.affiliate.hotproduct.query', {
      target_currency: 'AUD',
      target_language: 'EN',
      page_no: '1',
      page_size: '3',
      tracking_id: appKey,
    })
    results['affiliate.hotproduct.query'] = {
      status: data.error_response ? 'DENIED' : 'OK',
      response: data,
    }
  } catch (e) { results['affiliate.hotproduct.query'] = { error: e.message } }

  // Test 4: Affiliate Product Query
  try {
    const data = await callAPI(appKey, appSecret, 'aliexpress.affiliate.product.query', {
      keywords: 'phone case',
      target_currency: 'AUD',
      target_language: 'EN',
      page_no: '1',
      page_size: '3',
      tracking_id: appKey,
    })
    results['affiliate.product.query'] = {
      status: data.error_response ? 'DENIED' : 'OK',
      response: data,
    }
  } catch (e) { results['affiliate.product.query'] = { error: e.message } }

  // Test 5: DS Product (search by keyword)
  try {
    const data = await callAPI(appKey, appSecret, 'aliexpress.ds.product.get', {
      product_id: '1005006508561043',
      target_currency: 'AUD',
      target_language: 'EN',
    })
    results['ds.product.get'] = {
      status: data.error_response ? 'DENIED' : 'OK',
      response: data,
    }
  } catch (e) { results['ds.product.get'] = { error: e.message } }

  // Summary
  const summary = {}
  for (const [method, result] of Object.entries(results)) {
    summary[method] = result.status || 'ERROR'
  }

  return res.json({ summary, details: results })
}
