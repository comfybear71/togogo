import crypto from 'crypto'

// Step 1: Redirect user to Google OAuth consent screen
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) {
    return res.status(500).json({ error: 'Google OAuth not configured' })
  }

  // Use FRONTEND_URL for redirect URI — must match what's registered in Google Cloud Console
  // Default to togogo.me in production so it always matches the registered redirect URI
  const baseUrl = process.env.FRONTEND_URL || 'https://togogo.me'
  const redirectUri = `${baseUrl}/api/auth/google/callback`

  const state = crypto.randomBytes(16).toString('hex')

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    state,
    prompt: 'consent',
  })

  return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
}
