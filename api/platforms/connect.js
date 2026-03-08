import crypto from 'crypto'
import { sql } from '../_lib/db.js'
import { requireAuth } from '../_lib/auth.js'

// Platform OAuth configs
const PLATFORM_CONFIGS = {
  woocommerce: { authType: 'wc_auth' },
  ebay: {
    authType: 'oauth',
    authUrl: process.env.EBAY_ENVIRONMENT === 'SANDBOX'
      ? 'https://auth.sandbox.ebay.com/oauth2/authorize'
      : 'https://auth.ebay.com/oauth2/authorize',
    clientId: () => process.env.EBAY_CLIENT_ID,
    scopes: 'https://api.ebay.com/oauth/api_scope https://api.ebay.com/oauth/api_scope/sell.inventory https://api.ebay.com/oauth/api_scope/sell.fulfillment https://api.ebay.com/oauth/api_scope/sell.account',
  },
  etsy: {
    authType: 'oauth_pkce',
    authUrl: 'https://www.etsy.com/oauth/connect',
    clientId: () => process.env.ETSY_API_KEY,
    scopes: 'listings_r listings_w transactions_r transactions_w shops_r shops_w',
  },
  amazon: {
    authType: 'oauth',
    authUrl: 'https://sellercentral.amazon.com.au/apps/authorize/consent',
    clientId: () => process.env.AMAZON_SP_APP_ID,
  },
  tiktok: {
    authType: 'oauth',
    authUrl: 'https://auth.tiktok-shops.com/oauth/authorize',
    clientId: () => process.env.TIKTOK_APP_KEY,
  },
}

function generatePKCE() {
  const verifier = crypto.randomBytes(32).toString('base64url')
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url')
  return { verifier, challenge }
}

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

    const config = PLATFORM_CONFIGS[platform]
    if (!config) {
      return res.status(400).json({ error: `Platform "${platform}" not supported` })
    }

    const state = crypto.randomBytes(32).toString('hex')
    const baseUrl = process.env.API_BASE_URL || 'https://togogo.me'
    const frontendUrl = process.env.FRONTEND_URL || 'https://togogo.me'

    // ── WooCommerce: WC-Auth flow ──
    if (config.authType === 'wc_auth') {
      if (!shop_url) {
        return res.status(400).json({ error: 'Store URL is required (e.g., https://yourstore.com)' })
      }

      const cleanUrl = shop_url.replace(/\/+$/, '')
      const callbackUrl = `${baseUrl}/api/platforms/callback/woocommerce`
      const returnUrl = `${frontendUrl}/launch-store?connected=woocommerce`

      await upsertPending(user.id, 'woocommerce', state, cleanUrl)

      const authUrl = `${cleanUrl}/wc-auth/v1/authorize?` + new URLSearchParams({
        app_name: 'ToGoGo',
        scope: 'read_write',
        user_id: state,
        return_url: returnUrl,
        callback_url: callbackUrl,
      }).toString()

      return res.json({ type: 'oauth', url: authUrl, platform })
    }

    // ── eBay OAuth ──
    if (platform === 'ebay') {
      const clientId = config.clientId()
      if (!clientId) return res.status(500).json({ error: 'eBay API not configured. Set EBAY_CLIENT_ID env var.' })

      await upsertPending(user.id, 'ebay', state)

      const authUrl = `${config.authUrl}?` + new URLSearchParams({
        client_id: clientId,
        response_type: 'code',
        redirect_uri: `${baseUrl}/api/platforms/callback/ebay`,
        scope: config.scopes,
        state,
      }).toString()

      return res.json({ type: 'oauth', url: authUrl, platform })
    }

    // ── Etsy OAuth (PKCE) ──
    if (platform === 'etsy') {
      const clientId = config.clientId()
      if (!clientId) return res.status(500).json({ error: 'Etsy API not configured. Set ETSY_API_KEY env var.' })

      const { verifier, challenge } = generatePKCE()

      await sql`
        INSERT INTO platform_connections (user_id, platform, status, oauth_state, oauth_verifier)
        VALUES (${user.id}, 'etsy', 'pending', ${state}, ${verifier})
        ON CONFLICT (user_id, platform)
        DO UPDATE SET status = 'pending', oauth_state = ${state}, oauth_verifier = ${verifier}, updated_at = NOW()
      `

      const authUrl = `${config.authUrl}?` + new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: `${baseUrl}/api/platforms/callback/etsy`,
        scope: config.scopes,
        state,
        code_challenge: challenge,
        code_challenge_method: 'S256',
      }).toString()

      return res.json({ type: 'oauth', url: authUrl, platform })
    }

    // ── Amazon SP-API OAuth ──
    if (platform === 'amazon') {
      const appId = config.clientId()
      if (!appId) return res.status(500).json({ error: 'Amazon API not configured. Set AMAZON_SP_APP_ID env var.' })

      await upsertPending(user.id, 'amazon', state)

      const authUrl = `${config.authUrl}?` + new URLSearchParams({
        application_id: appId,
        state,
        redirect_uri: `${baseUrl}/api/platforms/callback/amazon`,
      }).toString()

      return res.json({ type: 'oauth', url: authUrl, platform })
    }

    // ── TikTok Shop OAuth ──
    if (platform === 'tiktok') {
      const appKey = config.clientId()
      if (!appKey) return res.status(500).json({ error: 'TikTok API not configured. Set TIKTOK_APP_KEY env var.' })

      await upsertPending(user.id, 'tiktok', state)

      const authUrl = `${config.authUrl}?` + new URLSearchParams({
        app_key: appKey,
        state,
      }).toString()

      return res.json({ type: 'oauth', url: authUrl, platform })
    }

    return res.status(400).json({ error: `Platform "${platform}" not implemented` })
  } catch (err) {
    if (err.status === 401) return res.status(401).json({ error: err.message })
    console.error('Platform connect error:', err)
    res.status(500).json({ error: 'Failed to start connection' })
  }
}

async function upsertPending(userId, platform, state, shopUrl) {
  if (shopUrl) {
    await sql`
      INSERT INTO platform_connections (user_id, platform, status, oauth_state, shop_url)
      VALUES (${userId}, ${platform}, 'pending', ${state}, ${shopUrl})
      ON CONFLICT (user_id, platform)
      DO UPDATE SET status = 'pending', oauth_state = ${state}, shop_url = ${shopUrl}, updated_at = NOW()
    `
  } else {
    await sql`
      INSERT INTO platform_connections (user_id, platform, status, oauth_state)
      VALUES (${userId}, ${platform}, 'pending', ${state})
      ON CONFLICT (user_id, platform)
      DO UPDATE SET status = 'pending', oauth_state = ${state}, updated_at = NOW()
    `
  }
}
