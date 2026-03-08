// Etsy OAuth 2.0 callback handler
// Etsy uses PKCE-based OAuth 2.0
// Docs: https://developers.etsy.com/documentation/essentials/authentication
import { sql } from '../../_lib/db.js'

const ETSY_CLIENT_ID = process.env.ETSY_API_KEY // Etsy calls it "keystring"
const TOKEN_URL = 'https://api.etsy.com/v3/public/oauth/token'

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
      SELECT id, user_id, oauth_verifier FROM platform_connections
      WHERE oauth_state = ${state} AND platform = 'etsy'
      LIMIT 1
    `
    const conn = rows[0]
    if (!conn) {
      return res.redirect(`${frontendUrl}/launch-store?error=Invalid+or+expired+auth+state`)
    }

    const redirectUri = `${process.env.API_BASE_URL || 'https://togogo.me'}/api/platforms/callback/etsy`

    // Exchange code for access token (PKCE flow — use code_verifier)
    const tokenRes = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: ETSY_CLIENT_ID,
        redirect_uri: redirectUri,
        code,
        code_verifier: conn.oauth_verifier, // PKCE verifier stored during connect
      }).toString(),
    })

    const tokenData = await tokenRes.json()

    if (!tokenRes.ok || tokenData.error) {
      console.error('Etsy token exchange failed:', tokenData)
      return res.redirect(`${frontendUrl}/launch-store?error=Etsy+authentication+failed`)
    }

    // Fetch shop name from Etsy
    let shopName = 'Etsy Shop'
    try {
      const meRes = await fetch('https://openapi.etsy.com/v3/application/users/me', {
        headers: { 'x-api-key': ETSY_CLIENT_ID, 'Authorization': `Bearer ${tokenData.access_token}` },
      })
      if (meRes.ok) {
        const userData = await meRes.json()
        if (userData.shop_id) {
          const shopRes = await fetch(`https://openapi.etsy.com/v3/application/shops/${userData.shop_id}`, {
            headers: { 'x-api-key': ETSY_CLIENT_ID, 'Authorization': `Bearer ${tokenData.access_token}` },
          })
          if (shopRes.ok) {
            const shopData = await shopRes.json()
            shopName = shopData.shop_name || shopName
          }
        }
      }
    } catch { /* best effort */ }

    // Save the connection
    await sql`
      UPDATE platform_connections
      SET status = 'active',
          access_token = ${tokenData.access_token},
          refresh_token = ${tokenData.refresh_token || null},
          token_expires_at = ${new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString()},
          token_data = ${JSON.stringify(tokenData)},
          shop_name = ${shopName},
          connected_at = NOW(),
          oauth_state = NULL,
          oauth_verifier = NULL,
          updated_at = NOW()
      WHERE id = ${conn.id}
    `

    res.redirect(`${frontendUrl}/launch-store?connected=etsy`)
  } catch (err) {
    console.error('Etsy callback error:', err)
    res.redirect(`${frontendUrl}/launch-store?error=Etsy+connection+failed`)
  }
}
