// Admin-only debug endpoint — inspects the raw AliExpress ds.product.get
// response so we can see what "shipping" / logistics_info_dto actually contains
// for a product that our verifyProduct() rejects with no_shipping.
//
// Two modes in one URL:
//   GET /api/admin/debug-shipping                          → OAuth token status
//   GET /api/admin/debug-shipping?productId=1005011982865541  → raw product.get response
//
// Auth: admin via requireAdminLite (Bearer token OR ?secret=JWT_SECRET).
// Read-only. No DB mutations. Never exposes the full access_token.
import { sql } from '../_lib/db.js'
import { requireAdminLite } from '../_lib/auth.js'
import { callAPI } from '../_lib/suppliers.js'

export default async function handler(req, res) {
  try {
    await requireAdminLite(req)
  } catch (err) {
    return res.status(err?.status || 500).json({ error: err?.message || 'Auth error' })
  }

  // Read OAuth token from admin_settings (without exposing the full value)
  let accessToken = null
  let tokenStatus = {
    present: false,
    expires_at: null,
    expires_at_passed: null,
    token_length: 0,
    token_preview: null,
  }
  try {
    const { rows } = await sql`SELECT value FROM admin_settings WHERE key = 'aliexpress_access_token'`
    if (rows[0]) {
      const data = JSON.parse(rows[0].value)
      accessToken = data.access_token || null
      tokenStatus = {
        present: !!accessToken,
        expires_at: data.expires_at || null,
        expires_at_passed: data.expires_at ? new Date(data.expires_at) < new Date() : null,
        token_length: accessToken?.length || 0,
        token_preview: accessToken
          ? `${accessToken.slice(0, 8)}...${accessToken.slice(-4)}`
          : null,
      }
    }
  } catch (err) {
    tokenStatus.error = err.message
  }

  const { productId, country = 'AU' } = req.query

  // Mode 1: no productId → return token status only
  if (!productId) {
    return res.json({
      mode: 'token-status',
      tokenStatus,
      usage: 'Add ?productId=<aliexpress_item_id> to see the raw ds.product.get response',
    })
  }

  // Mode 2: productId → raw ds.product.get dump
  if (!accessToken) {
    return res.status(400).json({
      mode: 'product-get',
      tokenStatus,
      error: 'No access_token in admin_settings — OAuth has never been completed or was cleared',
    })
  }

  let raw = null
  let callError = null
  try {
    raw = await callAPI('aliexpress.ds.product.get', {
      product_id: String(productId),
      target_currency: 'AUD',
      target_language: 'EN',
      ship_to_country: country,
      access_token: accessToken,
    })
  } catch (err) {
    callError = err.message
  }

  // Pull out the shipping-relevant bits for easy reading
  const result = raw?.aliexpress_ds_product_get_response?.result
  const logistics = result?.logistics_info_dto
  const shippingList = logistics?.logistics_info_list?.logistics_info_d_t_o

  return res.json({
    mode: 'product-get',
    productId: String(productId),
    country,
    tokenStatus,
    callError,
    summary: {
      got_result: !!result,
      got_logistics_info_dto: !!logistics,
      shipping_is_array: Array.isArray(shippingList),
      shipping_count: Array.isArray(shippingList) ? shippingList.length : null,
      response_top_level_keys: raw ? Object.keys(raw) : null,
      result_keys: result ? Object.keys(result) : null,
      logistics_keys: logistics ? Object.keys(logistics) : null,
    },
    // Raw dump (can be large — check summary first)
    raw,
  })
}
