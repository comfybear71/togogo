// Cron: daily AliExpress OAuth token health check + auto-refresh
//
// Runs once a day. Behaviour:
//   1. Read current token from admin_settings
//   2. If access_token expires within 7 days → attempt refresh
//   3. If refresh succeeds → log + done
//   4. If refresh fails OR refresh_token itself is near expiry (<14 days) →
//      send alert email to admin@togogo (sfrench71@gmail.com) with
//      re-authorization link
//
// Auth: Vercel cron Authorization header, CRON_SECRET query/header, or
// JWT_SECRET (for manual trigger via admin).
import { getSavedTokenRecord, refreshAliExpressToken } from '../_lib/suppliers.js'
import { sendEmail } from '../_lib/email.js'

const ADMIN_EMAIL = 'sfrench71@gmail.com'
const REFRESH_THRESHOLD_DAYS = 7
const REFRESH_TOKEN_WARNING_DAYS = 14

function daysBetween(future) {
  if (!future) return null
  const ms = new Date(future).getTime() - Date.now()
  return Math.round(ms / (1000 * 60 * 60 * 24))
}

async function alertAdmin({ subject, html }) {
  try {
    await sendEmail({ to: ADMIN_EMAIL, subject, html })
  } catch (err) {
    console.error('[Cron refresh-ae-token] Email send failed:', err.message)
  }
}

export default async function handler(req, res) {
  // Auth: match existing cron pattern
  const authHeader = req.headers.authorization
  const cronSecret = process.env.CRON_SECRET
  const jwtSecret = process.env.JWT_SECRET
  const querySecret = req.query.secret

  const authorized = (
    (cronSecret && authHeader === `Bearer ${cronSecret}`)
    || (cronSecret && querySecret === cronSecret)
    || (jwtSecret && querySecret === jwtSecret)
  )

  if (!authorized) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const record = await getSavedTokenRecord()
  if (!record) {
    await alertAdmin({
      subject: '[ToGoGo] 🔴 AliExpress OAuth — no token saved',
      html: `<p>The AliExpress OAuth token is missing from admin_settings.</p>
        <p>Features relying on OAuth (product details, freight query, wholesale pricing) will fail.</p>
        <p><strong>Action:</strong> visit <a href="https://togogo.me/api/platforms/callback/aliexpress">the auth callback</a> after logging into AliExpress Open Platform.</p>`,
    })
    return res.status(200).json({ status: 'no_token', alerted: true })
  }

  const accessDays = daysBetween(record.expires_at)
  const refreshDays = daysBetween(record.refresh_expires_at)

  console.log(`[Cron refresh-ae-token] access expires in ${accessDays}d, refresh expires in ${refreshDays}d`)

  // Access token still healthy — nothing to do
  if (accessDays !== null && accessDays > REFRESH_THRESHOLD_DAYS) {
    return res.json({
      status: 'ok',
      accessDays,
      refreshDays,
      action: 'no_refresh_needed',
    })
  }

  // Attempt refresh
  const result = await refreshAliExpressToken()

  if (result.success) {
    const newAccessDays = daysBetween(result.newExpiresAt)
    console.log(`[Cron refresh-ae-token] Refreshed — new expiry in ${newAccessDays}d`)

    // If the refresh_token itself is getting short, warn anyway
    const newRefreshDays = daysBetween(result.newRefreshExpiresAt)
    if (newRefreshDays !== null && newRefreshDays < REFRESH_TOKEN_WARNING_DAYS) {
      await alertAdmin({
        subject: '[ToGoGo] ⚠ AliExpress refresh_token nearing expiry',
        html: `<p>Access token auto-refreshed successfully (now valid ${newAccessDays} days).</p>
          <p><strong>However:</strong> the refresh_token expires in <strong>${newRefreshDays} days</strong>. Once it expires, automatic refresh will stop working and you'll need to re-authorize manually.</p>
          <p><a href="https://togogo.me/api/platforms/callback/aliexpress">Re-authorize</a> (requires login to AliExpress Open Platform first).</p>`,
      })
    }

    return res.json({
      status: 'refreshed',
      newAccessDays,
      newRefreshDays,
    })
  }

  // Refresh failed — send alert
  await alertAdmin({
    subject: '[ToGoGo] 🔴 AliExpress OAuth refresh FAILED',
    html: `<p>Automatic token refresh failed: <strong>${result.error}</strong></p>
      <p>Access token expires in ${accessDays} days. After that, OAuth-gated features will stop working (product detail page, freight query, wholesale).</p>
      <p><strong>Manual action required:</strong></p>
      <ol>
        <li>Log in to <a href="https://openservice.aliexpress.com">AliExpress Open Platform</a> with account <code>sfrench71@me.com</code></li>
        <li>Navigate to your app and generate a new authorization code</li>
        <li>Visit <a href="https://togogo.me/api/platforms/callback/aliexpress?code=YOUR_CODE">the callback URL</a> with the new code</li>
      </ol>`,
  })

  return res.status(200).json({
    status: 'refresh_failed',
    accessDays,
    error: result.error,
    alerted: true,
  })
}
