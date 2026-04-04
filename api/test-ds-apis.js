// Test DS APIs that require OAuth access_token
// Visit: https://togogo.me/api/test-ds-apis?secret=YOUR_JWT_SECRET
import crypto from 'crypto'
import { sql, ensureSchema } from './_lib/db.js'

function signRequest(params, appSecret) {
  const sorted = Object.keys(params)
    .filter(k => k !== 'sign')
    .sort()
    .map(k => `${k}${params[k]}`)
    .join('')
  return crypto.createHmac('sha256', appSecret).update(sorted).digest('hex').toUpperCase()
}

async function callDS(method, params, accessToken) {
  const appKey = process.env.ALIEXPRESS_APP_KEY
  const appSecret = process.env.ALIEXPRESS_APP_SECRET

  const baseParams = {
    app_key: appKey,
    method,
    sign_method: 'hmac-sha256',
    timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
    format: 'json',
    v: '2.0',
    access_token: accessToken,
    ...params,
  }
  baseParams.sign = signRequest(baseParams, appSecret)

  const qs = new URLSearchParams(baseParams).toString()
  const response = await fetch(`https://api-sg.aliexpress.com/sync?${qs}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  return response.json()
}

export default async function handler(req, res) {
  const secret = req.query.secret
  if (!secret || secret !== process.env.JWT_SECRET) {
    return res.status(401).json({ error: 'Add ?secret=YOUR_JWT_SECRET' })
  }

  await ensureSchema()

  // Get saved OAuth token
  const { rows } = await sql`SELECT value FROM admin_settings WHERE key = 'aliexpress_access_token'`
  if (!rows[0]) {
    return res.json({ error: 'No OAuth token saved. Authorize first.' })
  }

  const tokenData = JSON.parse(rows[0].value)
  const accessToken = tokenData.access_token
  console.log(`[Test DS] Token found, expires: ${tokenData.expires_at}, seller_id: ${tokenData.seller_id}`)

  const results = {}

  // Test 1: ds.product.get — get full product details
  try {
    const data = await callDS('aliexpress.ds.product.get', {
      product_id: '1005007732555371',
      target_currency: 'AUD',
      target_language: 'EN',
    }, accessToken)
    results['ds.product.get'] = {
      status: data.error_response ? 'DENIED' : 'OK',
      response: data.error_response || {
        hasResult: !!data.aliexpress_ds_product_get_response?.result,
        title: data.aliexpress_ds_product_get_response?.result?.ae_item_base_info_dto?.subject,
        imageCount: data.aliexpress_ds_product_get_response?.result?.ae_multimedia_info_dto?.image_urls?.split(';')?.length,
      },
    }
  } catch (e) { results['ds.product.get'] = { error: e.message } }

  // Test 2: ds.order.get — check if order API is accessible
  try {
    const data = await callDS('aliexpress.ds.order.get', {
      order_id: '123456789',
    }, accessToken)
    results['ds.order.get'] = {
      status: data.error_response ? (data.error_response.code === 'InvalidParameter' ? 'OK (accessible)' : 'DENIED') : 'OK',
      response: data.error_response || 'success',
    }
  } catch (e) { results['ds.order.get'] = { error: e.message } }

  // Test 3: ds.order.create — just check if accessible (won't actually place order)
  try {
    const data = await callDS('aliexpress.ds.member.orderdata.submit', {}, accessToken)
    results['ds.order.submit'] = {
      status: data.error_response ? (data.error_response.code === 'MissingParameter' || data.error_response.code === 'InvalidParameter' ? 'OK (accessible)' : 'DENIED') : 'OK',
      response: data.error_response || 'success',
    }
  } catch (e) { results['ds.order.submit'] = { error: e.message } }

  return res.json({
    tokenSaved: true,
    tokenAccount: tokenData.account,
    tokenExpires: tokenData.expires_at,
    results,
  })
}
