// Admin marketing API — promo codes and banners stored in admin_settings
import { sql, ensureSchema } from '../_lib/db.js'
import { requireAdminOrSetup } from '../_lib/auth.js'

export default async function handler(req, res) {
  try {
    await requireAdminOrSetup(req)
  } catch (err) {
    return res.status(err?.status || 401).json({ error: err?.message || 'Authentication failed' })
  }

  await ensureSchema()

  // Ensure marketing tables exist
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS promo_codes (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        type TEXT NOT NULL DEFAULT 'percent' CHECK (type IN ('percent', 'fixed')),
        value NUMERIC(10,2) NOT NULL DEFAULT 0,
        max_uses INTEGER DEFAULT 100,
        used INTEGER DEFAULT 0,
        expiry DATE,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `
    await sql`
      CREATE TABLE IF NOT EXISTS banners (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        title TEXT NOT NULL,
        image_url TEXT DEFAULT '',
        link_url TEXT DEFAULT '',
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `
  } catch { /* tables may already exist */ }

  if (req.method === 'GET') {
    try {
      const [promosResult, bannersResult] = await Promise.all([
        sql`SELECT * FROM promo_codes ORDER BY created_at DESC`.catch(() => ({ rows: [] })),
        sql`SELECT * FROM banners ORDER BY created_at DESC`.catch(() => ({ rows: [] })),
      ])
      return res.json({
        promoCodes: promosResult.rows,
        banners: bannersResult.rows,
      })
    } catch (err) {
      console.error('Admin marketing error:', err)
      return res.json({ promoCodes: [], banners: [] })
    }
  }

  if (req.method === 'POST') {
    const { action, data } = req.body

    try {
      if (action === 'create_promo') {
        const { code, type, value, maxUses, expiry } = data
        await sql`
          INSERT INTO promo_codes (code, type, value, max_uses, expiry)
          VALUES (${code.toUpperCase()}, ${type}, ${value}, ${maxUses || 100}, ${expiry || null})
        `
        return res.json({ success: true })
      }

      if (action === 'delete_promo') {
        await sql`DELETE FROM promo_codes WHERE id = ${data.id}`
        return res.json({ success: true })
      }

      if (action === 'toggle_promo') {
        await sql`UPDATE promo_codes SET active = NOT active WHERE id = ${data.id}`
        return res.json({ success: true })
      }

      if (action === 'create_banner') {
        const { title, imageUrl, linkUrl } = data
        await sql`
          INSERT INTO banners (title, image_url, link_url)
          VALUES (${title}, ${imageUrl || ''}, ${linkUrl || ''})
        `
        return res.json({ success: true })
      }

      if (action === 'delete_banner') {
        await sql`DELETE FROM banners WHERE id = ${data.id}`
        return res.json({ success: true })
      }

      if (action === 'toggle_banner') {
        await sql`UPDATE banners SET active = NOT active WHERE id = ${data.id}`
        return res.json({ success: true })
      }

      return res.status(400).json({ error: 'Unknown action' })
    } catch (err) {
      console.error('Admin marketing action error:', err)
      return res.status(500).json({ error: 'Failed to perform action' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
