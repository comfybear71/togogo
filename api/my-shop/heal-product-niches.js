// One-shot repair for products that were added manually before the
// add-to-shop niche bug was fixed (PR #115). Those products were
// inserted with niches=[] which causes the storefront's overlap
// filter (`niches && ARRAY['Electronics',...]`) to exclude them —
// rendering the product invisible on the customer-facing storefront
// even though it sits in the user_products table.
//
// This endpoint walks the caller's products, finds any with an empty
// or NULL niches array, and copies the store's niches[] onto each one
// so the storefront niche filter starts admitting them. Idempotent:
// running it again does nothing once products are healed.
//
// POST /api/my-shop/heal-product-niches
// (no body required — operates on the authenticated user's products)
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
    const { rows: storeRows } = await sql`
      SELECT niches, niche FROM user_stores WHERE user_id = ${user.id} LIMIT 1
    `
    const storeNiches = Array.isArray(storeRows[0]?.niches) ? storeRows[0].niches : []
    const legacyNiche = storeRows[0]?.niche
    const baseNiches = storeNiches.length > 0
      ? storeNiches
      : (legacyNiche ? [legacyNiche] : [])

    if (baseNiches.length === 0) {
      return res.status(400).json({
        error: 'Your store has no niches set yet. Run AI Builder once to seed niches, then retry.',
      })
    }

    // Find products with empty/NULL niches AND apply the store's niches.
    // Returns the affected ids so the UI can confirm what was healed.
    const { rows: healed } = await sql`
      UPDATE user_products
      SET niches = ${baseNiches}::TEXT[]
      WHERE user_id = ${user.id}
        AND (niches IS NULL OR cardinality(niches) = 0)
      RETURNING id, title, supplier_product_id
    `

    return res.json({
      success: true,
      storeNiches: baseNiches,
      productsHealed: healed.length,
      products: healed,
    })
  } catch (err) {
    console.error('[my-shop/heal-product-niches] Error:', err)
    return res.status(500).json({ error: err?.message || 'Heal failed' })
  }
}
