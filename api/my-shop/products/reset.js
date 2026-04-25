// Wipes ALL of the authenticated user's products. Used when a store
// owner wants to pivot their shop's niche entirely and start fresh.
//
// POST /api/my-shop/products/reset
// Body: { confirm: 'YES' }     ← required, prevents accidental wipes
//
// Returns the number of products deleted. Does NOT touch orders,
// store settings, or subscription — only the user_products rows.
import { sql } from '../../_lib/db.js'
import { requireAuth } from '../../_lib/auth.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  let user
  try {
    user = await requireAuth(req)
  } catch (err) {
    return res.status(err?.status || 401).json({ error: err?.message || 'Authentication required' })
  }

  // Require an explicit confirmation token in the body. The frontend's
  // confirmation modal sends 'YES' so a stray POST (replay, CSRF probe,
  // typo) can't wipe a real shop.
  const confirm = req.body?.confirm
  if (confirm !== 'YES') {
    return res.status(400).json({
      error: 'Confirmation required',
      hint: 'Send { "confirm": "YES" } in the body to proceed',
    })
  }

  try {
    const result = await sql`
      DELETE FROM user_products
      WHERE user_id = ${user.id}
    `
    const deleted = result.rowCount || 0
    console.log(`[my-shop/reset] User ${user.id} wiped ${deleted} products`)
    return res.json({ success: true, deleted })
  } catch (err) {
    console.error('[my-shop/reset] Error:', err)
    return res.status(500).json({ error: 'Failed to reset shop' })
  }
}
