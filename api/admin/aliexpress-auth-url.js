// Admin endpoint: Generate AliExpress OAuth authorization URL
import { requireAdminLite } from '../_lib/auth.js'

export default async function handler(req, res) {
  try {
    await requireAdminLite(req)
  } catch (err) {
    return res.status(401).json({ error: 'Admin access required' })
  }

  const appKey = process.env.ALIEXPRESS_APP_KEY
  const redirectUri = 'https://togogo.me/api/platforms/callback/aliexpress'

  if (!appKey) {
    return res.json({
      error: 'ALIEXPRESS_APP_KEY not configured in Vercel',
      instructions: 'Check Vercel → Project Settings → Environment Variables',
    })
  }

  const authUrl = `https://open.aliexpress.com/auth/authorize?response_type=code&client_id=${appKey}&redirect_uri=${encodeURIComponent(redirectUri)}&state=admin_reauth`

  return res.json({
    authUrl,
    instructions: 'Click this URL to authorize AliExpress. You will be redirected back to togogo.me and the token will be saved automatically.',
  })
}
