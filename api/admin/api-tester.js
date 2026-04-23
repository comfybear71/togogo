// Admin API Tester — proxies AliExpress API calls + fetches public AE docs
//
// POST /api/admin/api-tester
//   Body: { action: 'spec', method: 'aliexpress.ds.freight.query' }
//     → Returns the AE documentation JSON for the method
//
//   Body: { action: 'call', method: 'aliexpress.ds.freight.query',
//           params: { product_id: '...', country_code: 'AU', ... },
//           useOAuth: false }
//     → Signs the request with app_key/secret and calls AE directly,
//       returns the raw response (or raw error).
//
// Admin-gated via requireAdminOrSetup (JWT admin OR ?secret=JWT_SECRET).
// No DB writes. Never exposes the full access_token.
import { sql } from '../_lib/db.js'
import { requireAdminOrSetup } from '../_lib/auth.js'
import { callAPI } from '../_lib/suppliers.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' })
  }

  try {
    await requireAdminOrSetup(req)
  } catch (err) {
    return res.status(err?.status || 500).json({ error: err?.message || 'Auth error' })
  }

  const { action, method, params = {}, useOAuth = false } = req.body || {}

  if (!action || !method) {
    return res.status(400).json({ error: 'action and method required' })
  }

  if (!/^aliexpress\.[a-z0-9._]+$/i.test(method)) {
    return res.status(400).json({ error: 'Invalid method name' })
  }

  // Action 1: fetch the public AE docs JSON for this method
  if (action === 'spec') {
    try {
      const url = `https://openservice.aliexpress.com/handler/share/apidoc/getApi.json?path=${encodeURIComponent(method)}&cid=21038`
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'ToGoGo-Admin-API-Tester/1.0',
        },
      })
      if (!response.ok) {
        return res.status(200).json({ success: false, error: `AE docs HTTP ${response.status}` })
      }
      const text = await response.text()
      let data
      try {
        data = JSON.parse(text)
      } catch {
        return res.status(200).json({ success: false, error: 'AE docs returned non-JSON', raw: text.slice(0, 1000) })
      }
      return res.json({ success: true, spec: data })
    } catch (err) {
      return res.status(200).json({ success: false, error: err.message })
    }
  }

  // Action 2: sign and call the AE API
  if (action === 'call') {
    let accessToken = null
    let tokenInfo = null
    if (useOAuth) {
      try {
        const { rows } = await sql`SELECT value FROM admin_settings WHERE key = 'aliexpress_access_token'`
        if (!rows[0]) {
          return res.status(200).json({ success: false, error: 'No OAuth token in admin_settings. Authorize at /api/platforms/callback/aliexpress first.' })
        }
        const tokenData = JSON.parse(rows[0].value)
        if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
          return res.status(200).json({ success: false, error: 'OAuth token expired. Re-authorize at /api/platforms/callback/aliexpress' })
        }
        accessToken = tokenData.access_token
        tokenInfo = {
          present: true,
          expires_at: tokenData.expires_at || null,
          preview: accessToken ? `${accessToken.slice(0, 8)}...${accessToken.slice(-4)}` : null,
        }
      } catch (err) {
        return res.status(200).json({ success: false, error: 'Failed to read OAuth token: ' + err.message })
      }
    }

    const callParams = { ...params }
    if (accessToken) callParams.access_token = accessToken

    const start = Date.now()
    try {
      const data = await callAPI(method, callParams)
      const durationMs = Date.now() - start
      return res.json({
        success: true,
        durationMs,
        method,
        useOAuth,
        tokenInfo,
        response: data,
      })
    } catch (err) {
      const durationMs = Date.now() - start
      return res.json({
        success: false,
        durationMs,
        method,
        useOAuth,
        tokenInfo,
        error: err.message,
      })
    }
  }

  return res.status(400).json({ error: 'Unknown action — use "spec" or "call"' })
}
