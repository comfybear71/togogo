// Amazon SP-API OAuth callback handler
// Docs: https://developer-docs.amazon.com/sp-api/docs/authorizing-selling-partner-api-applications
import { sql } from '../../_lib/db.js'

const AMAZON_CLIENT_ID = process.env.AMAZON_SP_CLIENT_ID
const AMAZON_CLIENT_SECRET = process.env.AMAZON_SP_CLIENT_SECRET
const TOKEN_URL = 'https://api.amazon.com/auth/o2/token'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { spapi_oauth_code: code, state, selling_partner_id } = req.query
  const frontendUrl = process.env.FRONTEND_URL || 'https://togogo.me'

  if (!code || !state) {
    return res.redirect(`${frontendUrl}/launch-store?error=Missing+authorization+code`)
  }

  try {
    // Look up the pending connection
    const { rows } = await sql`
      SELECT id, user_id FROM platform_connections
      WHERE oauth_state = ${state} AND platform = 'amazon'
      LIMIT 1
    `
    const conn = rows[0]
    if (!conn) {
      return res.redirect(`${frontendUrl}/launch-store?error=Invalid+or+expired+auth+state`)
    }

    // Exchange code for access token
    const tokenRes = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: AMAZON_CLIENT_ID,
        client_secret: AMAZON_CLIENT_SECRET,
      }).toString(),
    })

    const tokenData = await tokenRes.json()

    if (!tokenRes.ok || tokenData.error) {
      console.error('Amazon token exchange failed:', tokenData)
      return res.redirect(`${frontendUrl}/launch-store?error=Amazon+authentication+failed`)
    }

    // Save the connection
    await sql`
      UPDATE platform_connections
      SET status = 'active',
          access_token = ${tokenData.access_token},
          refresh_token = ${tokenData.refresh_token || null},
          token_expires_at = ${new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString()},
          token_data = ${JSON.stringify({ ...tokenData, selling_partner_id })},
          shop_name = ${selling_partner_id ? `Amazon (${selling_partner_id})` : 'Amazon Store'},
          connected_at = NOW(),
          oauth_state = NULL,
          updated_at = NOW()
      WHERE id = ${conn.id}
    `

    res.redirect(`${frontendUrl}/launch-store?connected=amazon`)
  } catch (err) {
    console.error('Amazon callback error:', err)
    res.redirect(`${frontendUrl}/launch-store?error=Amazon+connection+failed`)
  }
}
