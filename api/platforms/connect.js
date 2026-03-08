import crypto from 'crypto'
import { sql } from '../_lib/db.js'
import { requireAuth } from '../_lib/auth.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const user = await requireAuth(req)
    const { platform, shop_url } = req.body

    if (!platform) {
      return res.status(400).json({ error: 'Platform is required' })
    }

    // Generate state token for CSRF protection
    const state = crypto.randomBytes(32).toString('hex')

    if (platform === 'woocommerce') {
      if (!shop_url) {
        return res.status(400).json({ error: 'Store URL is required (e.g., https://yourstore.com)' })
      }

      const cleanUrl = shop_url.replace(/\/+$/, '')
      const callbackUrl = `${process.env.API_BASE_URL || 'https://togogo.me'}/api/platforms/callback/woocommerce`
      const returnUrl = `${process.env.FRONTEND_URL || 'https://togogo.me'}/setup?connected=woocommerce`

      // Upsert pending connection
      await sql`
        INSERT INTO platform_connections (user_id, platform, status, oauth_state, shop_url)
        VALUES (${user.id}, 'woocommerce', 'pending', ${state}, ${cleanUrl})
        ON CONFLICT (user_id, platform)
        DO UPDATE SET status = 'pending', oauth_state = ${state}, shop_url = ${cleanUrl}, updated_at = NOW()
      `

      const authUrl = `${cleanUrl}/wc-auth/v1/authorize?` + new URLSearchParams({
        app_name: 'ToGoGo',
        scope: 'read_write',
        user_id: state,
        return_url: returnUrl,
        callback_url: callbackUrl,
      }).toString()

      return res.json({ type: 'oauth', url: authUrl, platform })
    }

    // For other platforms — return api_keys type or unsupported
    return res.status(400).json({ error: `Platform "${platform}" not yet supported via this endpoint` })
  } catch (err) {
    if (err.status === 401) return res.status(401).json({ error: err.message })
    console.error('Platform connect error:', err)
    res.status(500).json({ error: 'Failed to start connection' })
  }
}
