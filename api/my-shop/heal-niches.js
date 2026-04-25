// One-tap recovery for the multi-niche bug. Rebuilds the caller's
// user_stores.niches[] from the niche tags on every product they
// currently own — restoring visibility for products that got hidden
// when AI Builder overwrote their store's `niche` pointer in pre-
// v1.12.1 builds.
//
// POST /api/my-shop/heal-niches
// (no body required — operates on the authenticated user's store)
//
// Returns { added: [...], totalNiches: N, productsVisible: M } so the
// UI can confirm what was restored.
import { sql } from '../_lib/db.js'
import { requireAuth } from '../_lib/auth.js'

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

  try {
    // Discover every distinct niche tag across this user's products,
    // plus the legacy single niche pointer on their store. Union with
    // whatever's already in niches[] so a partial heal stays partial.
    const { rows: nicheRows } = await sql`
      SELECT ARRAY(
        SELECT DISTINCT n FROM (
          SELECT UNNEST(COALESCE(s.niches, ARRAY[]::TEXT[])) AS n
          FROM user_stores s WHERE s.user_id = ${user.id}
          UNION
          SELECT s.niche FROM user_stores s WHERE s.user_id = ${user.id} AND s.niche IS NOT NULL AND s.niche != ''
          UNION
          SELECT UNNEST(p.niches)
          FROM user_products p
          WHERE p.user_id = ${user.id} AND p.niches IS NOT NULL AND cardinality(p.niches) > 0
        ) all_niches
        WHERE n IS NOT NULL AND n != ''
      ) AS healed_niches
    `
    const healed = nicheRows[0]?.healed_niches || []

    // Capture what was there before so the response can highlight what
    // got added. Empty before-set is fine — that's the typical case.
    const beforeRow = await sql`SELECT niches FROM user_stores WHERE user_id = ${user.id} LIMIT 1`
    const before = beforeRow.rows[0]?.niches || []
    const added = healed.filter(n => !before.includes(n))

    await sql`
      UPDATE user_stores
      SET niches = ${healed},
          updated_at = NOW()
      WHERE user_id = ${user.id}
    `

    // Count how many of the user's products are now visible (passing
    // the storefront's overlap filter against the healed array). Helps
    // the UI confirm the heal actually unhid stuff.
    const { rows: countRows } = await sql`
      SELECT COUNT(*)::int AS visible
      FROM user_products
      WHERE user_id = ${user.id}
        AND is_active = true
        AND (
          ${healed.length === 0}::boolean
          OR niches && ${healed}::TEXT[]
        )
    `

    return res.json({
      success: true,
      before,
      after: healed,
      added,
      totalNiches: healed.length,
      productsVisible: countRows[0]?.visible || 0,
    })
  } catch (err) {
    console.error('[my-shop/heal-niches] Error:', err)
    return res.status(500).json({ error: err?.message || 'Heal failed' })
  }
}
