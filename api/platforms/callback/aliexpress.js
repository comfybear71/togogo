// AliExpress OAuth callback — exchanges auth code for access_token
// Callback URL: https://togogo.me/api/platforms/callback/aliexpress
import crypto from 'crypto'
import { sql, ensureSchema } from '../../_lib/db.js'

function signRequest(params, appSecret) {
  const sorted = Object.keys(params)
    .filter(k => k !== 'sign')
    .sort()
    .map(k => `${k}${params[k]}`)
    .join('')
  return crypto.createHmac('sha256', appSecret).update(sorted).digest('hex').toUpperCase()
}

export default async function handler(req, res) {
  const { code } = req.query

  if (!code) {
    return res.status(400).json({ error: 'No authorization code received. Visit the AliExpress auth page first.' })
  }

  const appKey = process.env.ALIEXPRESS_APP_KEY
  const appSecret = process.env.ALIEXPRESS_APP_SECRET

  if (!appKey || !appSecret) {
    return res.status(500).json({ error: 'Missing ALIEXPRESS_APP_KEY or ALIEXPRESS_APP_SECRET' })
  }

  try {
    console.log(`[AliExpress OAuth] Received auth code: ${code.slice(0, 10)}...`)

    // Exchange code for access token using /auth/token/create
    const params = {
      app_key: appKey,
      sign_method: 'hmac-sha256',
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      code,
    }
    params.sign = signRequest(params, appSecret)

    const qs = new URLSearchParams(params).toString()
    const response = await fetch(`https://api-sg.aliexpress.com/auth/token/create?${qs}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })

    const rawText = await response.text()
    console.log('[AliExpress OAuth] Raw response:', rawText.slice(0, 1000))

    let data
    try {
      data = JSON.parse(rawText)
    } catch {
      return res.json({
        error: 'AliExpress returned non-JSON response',
        httpStatus: response.status,
        raw: rawText.slice(0, 500),
      })
    }
    console.log('[AliExpress OAuth] Token response:', JSON.stringify(data).slice(0, 500))

    // Check for errors
    if (data.error_response) {
      console.error('[AliExpress OAuth] Error:', JSON.stringify(data.error_response))
      return res.status(400).json({
        error: data.error_response.msg || 'Failed to get token',
        details: data.error_response,
      })
    }

    // Extract token — response format from docs:
    // { access_token, refresh_token, expire_time, refresh_token_valid_time, user_id, seller_id, sp, ... }
    const accessToken = data.access_token
    const refreshToken = data.refresh_token
    const expireTime = data.expire_time
    const refreshExpireTime = data.refresh_token_valid_time

    if (!accessToken) {
      console.error('[AliExpress OAuth] No access_token in response:', JSON.stringify(data).slice(0, 500))
      return res.status(400).json({
        error: 'No access token received',
        raw: data,
      })
    }

    console.log(`[AliExpress OAuth] Got token! user_id=${data.user_id}, seller_id=${data.seller_id}, expires_in=${data.expires_in}`)

    return await saveToken(accessToken, refreshToken, expireTime, refreshExpireTime, res, data)
  } catch (err) {
    console.error('[AliExpress OAuth] Error:', err)
    return res.status(500).json({ error: err.message })
  }
}

async function saveToken(accessToken, refreshToken, expiresIn, refreshExpiresIn, res, fullResponse = {}) {
  await ensureSchema()

  // Save to admin_settings
  const tokenData = {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: expiresIn ? new Date(parseInt(expiresIn)).toISOString() : null,
    refresh_expires_at: refreshExpiresIn ? new Date(parseInt(refreshExpiresIn)).toISOString() : null,
    user_id: fullResponse.user_id || null,
    seller_id: fullResponse.seller_id || null,
    account: fullResponse.account || null,
    obtained_at: new Date().toISOString(),
  }

  await sql`
    INSERT INTO admin_settings (key, value, category, label, is_secret)
    VALUES ('aliexpress_access_token', ${JSON.stringify(tokenData)}, 'supplier', 'AliExpress Access Token', true)
    ON CONFLICT (key) DO UPDATE SET value = ${JSON.stringify(tokenData)}, updated_at = NOW()
  `

  console.log(`[AliExpress OAuth] Token saved! Expires: ${tokenData.expires_at}`)

  // Redirect to admin with success message
  return res.redirect(302, '/admin/settings?aliexpress=connected')
}
