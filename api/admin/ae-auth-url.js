// Admin endpoint: Generate AliExpress OAuth authorization URL
//
// GET /api/admin/ae-auth-url → returns the AliExpress OAuth authorize URL
//
// The user visits this URL, signs in, and is redirected back to
// /api/platforms/callback/aliexpress with an authorization code.
// The callback handler automatically saves the new token.

import { requireAdminOrSetup } from '../_lib/auth.js'

export default async function handler(req, res) {
  try {
    await requireAdminOrSetup(req)
  } catch (err) {
    return res.status(err?.status || 500).json({ error: err?.message || 'Auth error' })
  }

  const appKey = process.env.ALIEXPRESS_APP_KEY
  if (!appKey) {
    return res.status(500).json({
      error: 'ALIEXPRESS_APP_KEY not configured',
      instructions: 'Set ALIEXPRESS_APP_KEY in Vercel environment variables'
    })
  }

  const baseUrl = process.env.API_BASE_URL || 'https://togogo.me'
  const redirectUri = `${baseUrl}/api/platforms/callback/aliexpress`
  const state = 'admin_reauth'

  // AliExpress OAuth authorization URL
  // Use app_key as client_id (DS API applications use app_key for OAuth)
  const authUrl = 'https://auth.aliexpress.com/oauth/authorize?' + new URLSearchParams({
    response_type: 'code',
    client_id: appKey,
    redirect_uri: redirectUri,
    state,
  }).toString()

  return res.json({
    success: true,
    auth_url: authUrl,
    instructions: [
      '1. Copy the auth_url and open it in your browser',
      '2. Sign in with your AliExpress account (sfrench71@me.com)',
      '3. Click "Authorize" to grant ToGoGo access',
      '4. You will be redirected back to togogo.me',
      '5. Your token will be automatically saved'
    ]
  })
}
