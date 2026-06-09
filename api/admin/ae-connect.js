// Dead-simple AliExpress re-authorization starter.
//
//   Visit  https://togogo.me/api/admin/ae-connect  in any browser
//   → you are redirected to AliExpress to sign in + tap Authorize
//   → AliExpress sends you back to /api/platforms/callback/aliexpress
//   → the callback saves the fresh token and lands you on
//     /admin/settings?aliexpress=connected (status goes green).
//
// One click, no terminal, no copy/paste, works on iPad/iPhone. This only
// kicks off AliExpress's own public sign-in page; the sensitive step (saving
// the token) still happens in the callback, exactly as before.
export default async function handler(req, res) {
  const appKey = process.env.ALIEXPRESS_APP_KEY
  if (!appKey) {
    return res.status(500).send('ALIEXPRESS_APP_KEY is not configured in the environment.')
  }

  const baseUrl = process.env.API_BASE_URL || 'https://togogo.me'
  const redirectUri = `${baseUrl}/api/platforms/callback/aliexpress`

  const authUrl = 'https://auth.aliexpress.com/oauth/authorize?' + new URLSearchParams({
    response_type: 'code',
    client_id: appKey,
    redirect_uri: redirectUri,
    state: 'admin_reauth',
  }).toString()

  res.setHeader('Cache-Control', 'no-store')
  return res.redirect(302, authUrl)
}
