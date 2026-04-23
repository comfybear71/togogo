// Admin endpoint: AliExpress OAuth token status
//
// GET  /api/admin/ae-token-status         → read-only status
// POST /api/admin/ae-token-status?action=refresh → manually trigger refresh
//
// Returns access_token preview, expiry dates, days remaining, and a severity
// level (ok / warning / critical / expired / missing). Never exposes the full
// access_token or refresh_token.
import { requireAdminOrSetup } from '../_lib/auth.js'
import { getSavedTokenRecord, refreshAliExpressToken } from '../_lib/suppliers.js'

function daysBetween(future) {
  if (!future) return null
  const ms = new Date(future).getTime() - Date.now()
  return Math.round(ms / (1000 * 60 * 60 * 24))
}

function severity(accessDays) {
  if (accessDays === null) return 'missing'
  if (accessDays < 0) return 'expired'
  if (accessDays <= 3) return 'critical'
  if (accessDays <= 14) return 'warning'
  return 'ok'
}

function preview(token) {
  if (!token) return null
  return `${token.slice(0, 8)}...${token.slice(-4)}`
}

export default async function handler(req, res) {
  try {
    await requireAdminOrSetup(req)
  } catch (err) {
    return res.status(err?.status || 500).json({ error: err?.message || 'Auth error' })
  }

  // Manual refresh trigger
  if (req.method === 'POST' && req.query.action === 'refresh') {
    const result = await refreshAliExpressToken()
    return res.json(result)
  }

  const record = await getSavedTokenRecord()
  if (!record) {
    return res.json({
      present: false,
      status: 'missing',
      message: 'No OAuth token saved. Authorize via /api/platforms/callback/aliexpress',
    })
  }

  const accessDays = daysBetween(record.expires_at)
  const refreshDays = daysBetween(record.refresh_expires_at)

  return res.json({
    present: true,
    status: severity(accessDays),
    access_token_preview: preview(record.access_token),
    access_token_expires_at: record.expires_at,
    access_token_days_remaining: accessDays,
    refresh_token_expires_at: record.refresh_expires_at,
    refresh_token_days_remaining: refreshDays,
    account: record.account || null,
    seller_id: record.seller_id || null,
    obtained_at: record.obtained_at || null,
    refreshed_at: record.refreshed_at || null,
  })
}
