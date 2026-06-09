// Check AliExpress OAuth token status
import { getSavedTokenRecord } from '../_lib/suppliers.js'
import { requireAuth } from '../_lib/auth.js'

export default async function handler(req, res) {
  try {
    await requireAuth(req)
  } catch (err) {
    return res.status(401).json({ error: 'Auth required' })
  }

  const record = await getSavedTokenRecord()

  if (!record) {
    return res.json({
      status: 'no_token',
      message: 'No AliExpress token saved',
    })
  }

  const now = new Date()
  const accessExpiry = new Date(record.expires_at)
  const refreshExpiry = new Date(record.refresh_expires_at)
  const accessDaysLeft = Math.round((accessExpiry - now) / (1000 * 60 * 60 * 24))
  const refreshDaysLeft = Math.round((refreshExpiry - now) / (1000 * 60 * 60 * 24))

  return res.json({
    status: accessDaysLeft > 0 ? 'valid' : 'expired',
    accessToken: {
      expiresAt: record.expires_at,
      daysLeft: accessDaysLeft,
      expired: accessDaysLeft <= 0,
    },
    refreshToken: {
      expiresAt: record.refresh_expires_at,
      daysLeft: refreshDaysLeft,
      expired: refreshDaysLeft <= 0,
    },
  })
}
