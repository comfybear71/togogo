import { sql } from '../../_lib/db.js'

export default async function handler(req, res) {
  // WooCommerce WC-Auth sends API keys via POST callback
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { user_id: state, consumer_key, consumer_secret, key_permissions } = req.body

    if (!state || !consumer_key || !consumer_secret) {
      return res.status(400).json({ error: 'Missing required fields from WooCommerce auth' })
    }

    // Look up the pending connection by state token (stored as oauth_state)
    const { rows } = await sql`
      SELECT id, user_id, shop_url FROM platform_connections
      WHERE oauth_state = ${state} AND platform = 'woocommerce'
      LIMIT 1
    `

    const conn = rows[0]
    if (!conn) {
      return res.status(400).json({ error: 'Invalid or expired auth state' })
    }

    // Validate the keys work by making a test call
    const credentials = Buffer.from(`${consumer_key}:${consumer_secret}`).toString('base64')
    let shopName = conn.shop_url
    try {
      const testRes = await fetch(`${conn.shop_url}/wp-json/wc/v3/system_status`, {
        headers: { 'Authorization': `Basic ${credentials}` },
      })
      if (testRes.ok) {
        const data = await testRes.json()
        shopName = data.environment?.site_title || conn.shop_url
      }
    } catch {
      // Best-effort validation — keys came directly from WooCommerce
    }

    // Save the connection as active
    await sql`
      UPDATE platform_connections
      SET status = 'active',
          access_token = ${consumer_key},
          refresh_token = ${consumer_secret},
          shop_name = ${shopName},
          token_data = ${JSON.stringify({ consumer_key, consumer_secret, key_permissions, store_url: conn.shop_url })},
          connected_at = NOW(),
          oauth_state = NULL,
          updated_at = NOW()
      WHERE id = ${conn.id}
    `

    // WC Auth expects a 200 response to confirm we received the keys
    res.json({ success: true })
  } catch (err) {
    console.error('WooCommerce auth callback error:', err.message)
    res.status(500).json({ error: err.message })
  }
}
