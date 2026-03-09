import { OAuth2Client } from 'google-auth-library'
import { findOrCreateGoogleUser, generateToken } from '../../_lib/auth.js'

// Step 2: Google redirects back here with authorization code
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { code, error } = req.query
  const frontendUrl = process.env.FRONTEND_URL || 'https://togogo.me'

  if (error) {
    return res.redirect(`${frontendUrl}/auth?error=${encodeURIComponent(error)}`)
  }

  if (!code) {
    return res.redirect(`${frontendUrl}/auth?error=missing_code`)
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      console.error('Google OAuth not configured: missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET')
      return res.redirect(`${frontendUrl}/auth?error=${encodeURIComponent('Google sign-in is not configured. Please contact support.')}`)
    }

    // Must EXACTLY match the redirect URI used in /api/auth/google.js and Google Console
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'https://togogo.me/api/auth/google/callback'

    const client = new OAuth2Client(clientId, clientSecret, redirectUri)

    // Exchange code for tokens
    const { tokens } = await client.getToken(code)

    // Verify ID token to get user info
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: clientId,
    })

    const payload = ticket.getPayload()
    const googleId = payload.sub
    const email = payload.email
    const name = payload.name || payload.email.split('@')[0]
    const avatarUrl = payload.picture || null

    // Find or create user in our database
    const user = await findOrCreateGoogleUser({ googleId, email, name, avatarUrl })

    // Generate our own JWT
    const token = generateToken(user)

    // Redirect to frontend with token
    return res.redirect(`${frontendUrl}/auth/callback?token=${token}`)
  } catch (err) {
    console.error('Google OAuth callback error:', err?.message || err)
    const msg = err?.message?.includes('redirect_uri_mismatch')
      ? 'OAuth redirect URI mismatch. Check Google Cloud Console configuration.'
      : 'Google sign-in failed. Please try again.'
    return res.redirect(`${frontendUrl}/auth?error=${encodeURIComponent(msg)}`)
  }
}
