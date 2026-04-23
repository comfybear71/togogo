// Admin diagnostic: what's happening with a store's niche build?
//
// GET /api/admin/diagnose-niche?storeId=<uuid>
//
// Returns:
//   - What the store's niche is (exact casing/whitespace)
//   - How many queue rows exist, split by status
//   - Sample of the most recent processed queue rows (keyword, result, error)
//   - How many products in user_products have niches containing this niche
//   - A spot-check of 5 products' niches values
//   - Whether niches column even exists (for debugging migrations)
import { sql, ensureSchema } from '../_lib/db.js'
import { requireAdminOrSetup, verifyToken } from '../_lib/auth.js'

export default async function handler(req, res) {
  // Accept admin auth via header OR via ?secret= query param. Query-param
  // mode is convenient for typing the URL into a browser to diagnose.
  let authorized = false
  const querySecret = req.query.secret
  if (querySecret && querySecret === process.env.JWT_SECRET) authorized = true
  if (!authorized && querySecret) {
    try {
      const payload = verifyToken(querySecret)
      if (payload && payload.role === 'admin') authorized = true
    } catch { /* fall through */ }
  }
  if (!authorized) {
    try {
      await requireAdminOrSetup(req)
      authorized = true
    } catch (err) {
      return res.status(err?.status || 401).json({ error: err?.message || 'Authentication required' })
    }
  }

  const storeId = req.query.storeId
  const subdomain = req.query.subdomain
  if (!storeId && !subdomain) {
    return res.status(400).json({ error: 'storeId or subdomain required' })
  }

  await ensureSchema()

  const out = {}

  // Store row — lookup by storeId or subdomain
  try {
    const { rows } = storeId
      ? await sql`
          SELECT id, subdomain, store_name, niche, niche_built_at, updated_at
          FROM user_stores WHERE id = ${storeId} LIMIT 1
        `
      : await sql`
          SELECT id, subdomain, store_name, niche, niche_built_at, updated_at
          FROM user_stores WHERE subdomain = ${subdomain} LIMIT 1
        `
    out.store = rows[0] || null
  } catch (err) { out.store_error = err.message }

  if (!out.store) {
    return res.status(404).json({ error: 'Store not found', ...out })
  }

  const resolvedStoreId = out.store.id
  const nicheValue = out.store.niche || null
  out.niche_exact_value = nicheValue
  out.niche_length = nicheValue ? nicheValue.length : 0

  // Column existence
  try {
    const { rows } = await sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'user_products' AND column_name = 'niches'
    `
    out.niches_column_exists = rows.length > 0
  } catch (err) { out.niches_column_error = err.message }

  // Queue breakdown
  try {
    const { rows } = await sql`
      SELECT status, COUNT(*)::int AS cnt,
             COALESCE(SUM(products_found), 0)::int AS total_found
      FROM store_build_queue
      WHERE store_id = ${resolvedStoreId}
      GROUP BY status
    `
    out.queue_breakdown = rows
  } catch (err) { out.queue_error = err.message }

  // Recent processed rows
  try {
    const { rows } = await sql`
      SELECT keyword, category, niche, status, products_found, error, processed_at
      FROM store_build_queue
      WHERE store_id = ${resolvedStoreId} AND status IN ('done', 'failed')
      ORDER BY processed_at DESC NULLS LAST
      LIMIT 10
    `
    out.recent_processed = rows
  } catch (err) { out.recent_error = err.message }

  // Products tagged with this niche
  if (nicheValue) {
    try {
      const { rows } = await sql`
        SELECT COUNT(*)::int AS cnt
        FROM user_products
        WHERE is_active = true AND niches @> ARRAY[${nicheValue}]::TEXT[]
      `
      out.products_tagged_with_niche = rows[0]?.cnt || 0
    } catch (err) { out.products_tagged_error = err.message }

    // Sample 5 products: what do their niches look like?
    try {
      const { rows } = await sql`
        SELECT id, title, niches, updated_at
        FROM user_products
        WHERE is_active = true
        ORDER BY updated_at DESC NULLS LAST
        LIMIT 5
      `
      out.sample_products = rows.map(r => ({
        id: r.id,
        title: (r.title || '').slice(0, 60),
        niches: r.niches,
        updated_at: r.updated_at,
      }))
    } catch (err) { out.sample_error = err.message }

    // Try the exact comparison used by storefront/store.js
    try {
      const { rows } = await sql.query(
        `SELECT COUNT(*)::int AS cnt
         FROM user_products
         WHERE is_active = true AND niches @> ARRAY[$1]::TEXT[]`,
        [nicheValue]
      )
      out.param_query_count = rows[0]?.cnt || 0
    } catch (err) { out.param_query_error = err.message }
  }

  return res.json(out)
}
