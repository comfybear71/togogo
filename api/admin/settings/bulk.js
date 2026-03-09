// Bulk update admin settings
import { sql } from '../../_lib/db.js'
import { requireAdmin } from '../../_lib/auth.js'

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS admin_settings (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL,
      label TEXT,
      is_secret BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `
}

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

    // Ensure table exists
    await ensureTable()

    for (const row of settings) {
      if (!row.key || !row.category) continue
      await sql`
        INSERT INTO admin_settings (key, value, category, label, is_secret)
        VALUES (${row.key}, ${row.value || ''}, ${row.category}, ${row.label || row.key}, ${row.is_secret || false})
        ON CONFLICT (key) DO UPDATE SET
          value = EXCLUDED.value,
          category = EXCLUDED.category,
          label = EXCLUDED.label,
          is_secret = EXCLUDED.is_secret,
          updated_at = NOW()
      `
    }

    return res.json({ success: true, count: settings.length })
  } catch (err) {
    console.error('Failed to bulk save admin settings:', err)
    return res.status(500).json({ error: 'Failed to save settings', details: err.message })
  }
}
