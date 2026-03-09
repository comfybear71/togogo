// Bulk update admin settings
import { sql } from '../../_lib/db.js'
import { requireAdmin } from '../../_lib/auth.js'

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    await requireAdmin(req)
  } catch (err) {
    return res.status(err.status || 401).json({ error: err.message })
  }

  try {
    const { settings } = req.body
    if (!Array.isArray(settings) || settings.length === 0) {
      return res.status(400).json({ error: 'Settings array is required' })
    }

    for (const row of settings) {
      if (!row.key || !row.category) continue
      await sql`
        INSERT INTO admin_settings (key, value, category, label, is_secret)
        VALUES (${row.key}, ${row.value || ''}, ${row.category}, ${row.label || row.key}, ${row.is_secret || false})
        ON CONFLICT (key) DO UPDATE SET
          value = ${row.value || ''},
          category = ${row.category},
          label = ${row.label || row.key},
          is_secret = ${row.is_secret || false},
          updated_at = NOW()
      `
    }

    return res.json({ success: true, count: settings.length })
  } catch (err) {
    console.error('Failed to bulk save admin settings:', err)
    return res.status(500).json({ error: 'Failed to save settings' })
  }
}
