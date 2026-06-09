// Admin endpoint: AliExpress coupon code manager.
//
//   GET  /api/admin/ae-coupons                      → { codes:[], status:{} }
//   POST /api/admin/ae-coupons { code, note }        → add a code (first = active)
//   POST /api/admin/ae-coupons { action:'delete', code } → remove a code
//
// Codes are stored in admin_settings.ae_coupon_codes as a JSON array of
// { code, note, addedAt }. The FIRST code is the active one the order webhook
// applies (with auto-fallback to no coupon if AliExpress rejects it).
import { requireAdminOrSetup } from '../_lib/auth.js'
import { sql } from '../_lib/db.js'

async function readCodes() {
  const { rows } = await sql`SELECT value FROM admin_settings WHERE key = 'ae_coupon_codes'`
  if (!rows[0]?.value) return []
  try {
    const parsed = JSON.parse(rows[0].value)
    if (!Array.isArray(parsed)) return []
    return parsed
      .map(c => (typeof c === 'string' ? { code: c } : c))
      .filter(c => c && c.code)
  } catch { return [] }
}

async function readStatus() {
  const { rows } = await sql`SELECT value FROM admin_settings WHERE key = 'ae_coupon_status'`
  if (!rows[0]?.value) return null
  try { return JSON.parse(rows[0].value) } catch { return null }
}

async function writeCodes(codes) {
  await sql`
    INSERT INTO admin_settings (key, value, category, label, is_secret)
    VALUES ('ae_coupon_codes', ${JSON.stringify(codes)}, 'pricing', 'AliExpress coupon codes', false)
    ON CONFLICT (key) DO UPDATE SET value = ${JSON.stringify(codes)}, updated_at = NOW()
  `
}

export default async function handler(req, res) {
  try {
    await requireAdminOrSetup(req)
  } catch (err) {
    return res.status(err?.status || 500).json({ error: err?.message || 'Auth error' })
  }

  try {
    if (req.method === 'GET') {
      return res.json({ codes: await readCodes(), status: await readStatus() })
    }

    if (req.method === 'POST') {
      const action = req.body?.action
      const code = String(req.body?.code || '').trim()

      if (action === 'delete') {
        if (!code) return res.status(400).json({ error: 'code required' })
        const codes = (await readCodes()).filter(c => c.code !== code)
        await writeCodes(codes)
        return res.json({ success: true, codes })
      }

      // Add
      if (!code) return res.status(400).json({ error: 'code required' })
      const codes = await readCodes()
      if (codes.some(c => c.code.toLowerCase() === code.toLowerCase())) {
        return res.json({ success: true, codes }) // already present, no-op
      }
      codes.unshift({ code, note: String(req.body?.note || '').trim(), addedAt: new Date().toISOString() })
      await writeCodes(codes)
      return res.json({ success: true, codes })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
