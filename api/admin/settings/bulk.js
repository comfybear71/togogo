// Bulk update admin settings
import { sql } from '../../_lib/db.js'
import { requireAdmin } from '../../_lib/auth.js'

async function checkAdmin(req) {
  // Allow setup secret for initial configuration (before admin user exists)
  const setupSecret = req.headers['x-setup-secret']
  if (setupSecret && setupSecret === process.env.JWT_SECRET) {
    return { id: 'setup', role: 'admin' }
  }
  return requireAdmin(req)
}

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    await checkAdmin(req)
  } catch (err) {
    return res.status(err?.status || 401).json({ error: err?.message || 'Authentication failed' })
  }

  try {
    const { settings } = req.body || {}
    if (!Array.isArray(settings) || settings.length === 0) {
      return res.status(400).json({ error: 'Settings array is required' })
    }

    let saved = 0
    const errors = []

    for (const row of settings) {
      if (!row.key || !row.category) continue
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
    return res.status(500).json({ error: 'Failed to save settings', details: err.message })
  }
}
