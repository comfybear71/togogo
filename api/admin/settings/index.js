// Admin settings API — GET all settings, PUT single setting
import { sql } from '../_lib/db.js'
import { requireAdmin } from '../_lib/auth.js'

export default async function handler(req, res) {
  let user
  try {
    user = await requireAdmin(req)
  } catch (err) {
    return res.status(err.status || 401).json({ error: err.message })
  }

  if (req.method === 'GET') {
    try {
      const { category } = req.query
      let result
      if (category) {
        result = await sql`
          SELECT key, value, category, label, is_secret
          FROM admin_settings
          WHERE category = ${category}
          ORDER BY category, key
        `
      } else {
        result = await sql`
          SELECT key, value, category, label, is_secret
          FROM admin_settings
          ORDER BY category, key
        `
      }
      return res.json(result.rows)
    } catch (err) {
      console.error('Failed to load admin settings:', err)
      return res.status(500).json({ error: 'Failed to load settings' })
    }
  }

  if (req.method === 'PUT') {
    try {
      const { key, value, category, label, is_secret } = req.body
      if (!key || !category) {
        return res.status(400).json({ error: 'Key and category are required' })
      }

      await sql`
        INSERT INTO admin_settings (key, value, category, label, is_secret)
        VALUES (${key}, ${value || ''}, ${category}, ${label || key}, ${is_secret || false})
        ON CONFLICT (key) DO UPDATE SET
          value = ${value || ''},
          category = ${category},
          label = ${label || key},
          is_secret = ${is_secret || false},
          updated_at = NOW()
      `

      return res.json({ success: true })
    } catch (err) {
      console.error('Failed to save admin setting:', err)
      return res.status(500).json({ error: 'Failed to save setting' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
