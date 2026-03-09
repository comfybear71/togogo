// Bulk update admin settings
import { sql } from '../../_lib/db.js'
import { requireAdmin } from '../../_lib/auth.js'

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Auth check
  let user
  try {
    user = await requireAdmin(req)
  } catch (err) {
    const status = err?.status || 401
    const message = err?.message || 'Authentication failed'
    console.error('Admin settings bulk auth error:', status, message)
    return res.status(status).json({ error: message })
  }

  // Save settings
  try {
    const body = req.body
    if (!body || !Array.isArray(body.settings)) {
      return res.status(400).json({ error: 'Settings array is required', received: typeof body })
    }

    const { settings } = body
    if (settings.length === 0) {
      return res.json({ success: true, count: 0, message: 'No settings to save' })
    }

    let saved = 0
    const errors = []

    for (const row of settings) {
      if (!row.key || !row.category) {
        errors.push(`Skipped: missing key or category`)
        continue
      }
      try {
        await sql`
          INSERT INTO admin_settings ("key", "value", category, label, is_secret)
          VALUES (${row.key}, ${row.value || ''}, ${row.category}, ${row.label || row.key}, ${row.is_secret ? true : false})
          ON CONFLICT ("key") DO UPDATE SET
            "value" = EXCLUDED."value",
            category = EXCLUDED.category,
            label = EXCLUDED.label,
            is_secret = EXCLUDED.is_secret,
            updated_at = NOW()
        `
        saved++
      } catch (rowErr) {
        errors.push(`${row.key}: ${rowErr.message}`)
      }
    }

    if (errors.length > 0 && saved === 0) {
      return res.status(500).json({ error: 'All saves failed', details: errors.join('; ') })
    }

    return res.json({ success: true, count: saved, errors: errors.length > 0 ? errors : undefined })
  } catch (err) {
    console.error('Failed to bulk save admin settings:', err)
    return res.status(500).json({ error: 'Failed to save settings', details: err.message, stack: err.stack?.split('\n').slice(0, 3) })
  }
}
