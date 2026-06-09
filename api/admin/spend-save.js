// Admin endpoint: spend-and-save discount settings.
//
//   GET  /api/admin/spend-save  → { enabled, thresholdAud, percent }
//   POST /api/admin/spend-save  → save { enabled, thresholdAud, percent }
//
// Drives the margin-funded storefront discount applied in
// api/storefront/checkout.js. OFF by default.
import { requireAdminOrSetup } from '../_lib/auth.js'
import { sql } from '../_lib/db.js'

const KEYS = {
  enabled: 'spend_save_enabled',
  thresholdAud: 'spend_save_threshold_aud',
  percent: 'spend_save_percent',
}

async function readSettings() {
  const { rows } = await sql`
    SELECT key, value FROM admin_settings
    WHERE key IN ('spend_save_enabled', 'spend_save_threshold_aud', 'spend_save_percent')
  `
  const map = Object.fromEntries(rows.map(r => [r.key, r.value]))
  return {
    enabled: String(map[KEYS.enabled] || '').toLowerCase() === 'true',
    thresholdAud: parseFloat(map[KEYS.thresholdAud]) || 0,
    percent: parseFloat(map[KEYS.percent]) || 0,
  }
}

async function upsert(key, value, label) {
  await sql`
    INSERT INTO admin_settings (key, value, category, label, is_secret)
    VALUES (${key}, ${String(value)}, 'pricing', ${label}, false)
    ON CONFLICT (key) DO UPDATE SET value = ${String(value)}, updated_at = NOW()
  `
}

export default async function handler(req, res) {
  try {
    await requireAdminOrSetup(req)
  } catch (err) {
    return res.status(err?.status || 500).json({ error: err?.message || 'Auth error' })
  }

  if (req.method === 'GET') {
    try {
      return res.json(await readSettings())
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  if (req.method === 'POST') {
    try {
      const enabled = req.body?.enabled === true || String(req.body?.enabled).toLowerCase() === 'true'
      const thresholdAud = Math.max(0, parseFloat(req.body?.thresholdAud) || 0)
      // Clamp percent to a sane 0–90 so a fat-finger can't wipe out margin
      // (the checkout hard-cap at cost is the real safety net).
      const percent = Math.min(90, Math.max(0, parseFloat(req.body?.percent) || 0))

      await upsert(KEYS.enabled, enabled ? 'true' : 'false', 'Spend & Save: enabled')
      await upsert(KEYS.thresholdAud, thresholdAud, 'Spend & Save: min cart (AUD)')
      await upsert(KEYS.percent, percent, 'Spend & Save: discount %')

      return res.json({ success: true, ...(await readSettings()) })
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
