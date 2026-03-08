// eBay OAuth callback handler
// eBay uses Authorization Code Grant flow
// Docs: https://developer.ebay.com/api-docs/static/oauth-authorization-code-grant.html
import { sql } from '../../_lib/db.js'

const EBAY_CLIENT_ID = process.env.EBAY_CLIENT_ID
const EBAY_CLIENT_SECRET = process.env.EBAY_CLIENT_SECRET
const EBAY_ENV = process.env.EBAY_ENVIRONMENT || 'PRODUCTION' // or 'SANDBOX'

const TOKEN_URL = EBAY_ENV === 'SANDBOX'
  ? 'https://api.sandbox.ebay.com/identity/v1/oauth2/token'
  : 'https://api.ebay.com/identity/v1/oauth2/token'

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
    // Look up the pending connection by state token
    const { rows } = await sql`
      SELECT id, user_id FROM platform_connections
      WHERE oauth_state = ${state} AND platform = 'ebay'
      LIMIT 1
    `
    const conn = rows[0]
    if (!conn) {
      return res.redirect(`${frontendUrl}/launch-store?error=Invalid+or+expired+auth+state`)
    }

    // Exchange code for access token
    const credentials = Buffer.from(`${EBAY_CLIENT_ID}:${EBAY_CLIENT_SECRET}`).toString('base64')
    const redirectUri = `${process.env.API_BASE_URL || 'https://togogo.me'}/api/platforms/callback/ebay`

    const tokenRes = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }).toString(),
    })

    const tokenData = await tokenRes.json()

    if (!tokenRes.ok || tokenData.error) {
      console.error('eBay token exchange failed:', tokenData)
      return res.redirect(`${frontendUrl}/launch-store?error=eBay+authentication+failed`)
    }

    // Save the connection
    await sql`
      UPDATE platform_connections
      SET status = 'active',
          access_token = ${tokenData.access_token},
          refresh_token = ${tokenData.refresh_token || null},
          token_expires_at = ${new Date(Date.now() + (tokenData.expires_in || 7200) * 1000).toISOString()},
          token_data = ${JSON.stringify(tokenData)},
          shop_name = ${'eBay Store'},
          connected_at = NOW(),
          oauth_state = NULL,
          updated_at = NOW()
      WHERE id = ${conn.id}
    `

    res.redirect(`${frontendUrl}/launch-store?connected=ebay`)
  } catch (err) {
    console.error('eBay callback error:', err)
    res.redirect(`${frontendUrl}/launch-store?error=eBay+connection+failed`)
  }
}
