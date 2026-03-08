// TikTok Shop OAuth callback handler
// Docs: https://partner.tiktokshop.com/doc/page/63fd72bf2702580393c1e4dd
import { sql } from '../../_lib/db.js'

const TIKTOK_APP_KEY = process.env.TIKTOK_APP_KEY
const TIKTOK_APP_SECRET = process.env.TIKTOK_APP_SECRET
const TOKEN_URL = 'https://auth.tiktok-shops.com/api/v2/token/get'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { code, state } = req.query
  const frontendUrl = process.env.FRONTEND_URL || 'https://togogo.me'

  if (!code || !state) {
    return res.redirect(`${frontendUrl}/launch-store?error=Missing+authorization+code`)
  }

  try {
    // Look up the pending connection
    const { rows } = await sql`
      SELECT id, user_id FROM platform_connections
      WHERE oauth_state = ${state} AND platform = 'tiktok'
      LIMIT 1
    `
    const conn = rows[0]
    if (!conn) {
      return res.redirect(`${frontendUrl}/launch-store?error=Invalid+or+expired+auth+state`)
    }

    // Exchange code for access token
    const tokenRes = await fetch(`${TOKEN_URL}?app_key=${TIKTOK_APP_KEY}&app_secret=${TIKTOK_APP_SECRET}&auth_code=${code}&grant_type=authorized_code`)

    const tokenData = await tokenRes.json()

    if (!tokenRes.ok || tokenData.code !== 0) {
      console.error('TikTok token exchange failed:', tokenData)
      return res.redirect(`${frontendUrl}/launch-store?error=TikTok+authentication+failed`)
    }

    const data = tokenData.data || {}

    // Save the connection
    await sql`
      UPDATE platform_connections
      SET status = 'active',
          access_token = ${data.access_token || ''},
          refresh_token = ${data.refresh_token || null},
          token_expires_at = ${data.access_token_expire_in ? new Date(data.access_token_expire_in * 1000).toISOString() : null},
          token_data = ${JSON.stringify(data)},
          shop_name = ${data.seller_name || 'TikTok Shop'},
          connected_at = NOW(),
          oauth_state = NULL,
          updated_at = NOW()
      WHERE id = ${conn.id}
    `

    res.redirect(`${frontendUrl}/launch-store?connected=tiktok`)
  } catch (err) {
    console.error('TikTok callback error:', err)
    res.redirect(`${frontendUrl}/launch-store?error=TikTok+connection+failed`)
  }
}
