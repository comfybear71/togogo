// Progress for an active store build.
//
// GET /api/store-provision/build-status?storeId=<uuid>
//
// Returns counts + the most-recently-found product images for the
// reveal animation in the build wizard.
//
// Public-ish (we don't want to gate progress polling behind admin auth
// since the customer needs to see it during signup). It does require a
// valid storeId though, and never exposes anything sensitive.
import { sql, ensureSchema } from '../_lib/db.js'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  const storeId = req.query.storeId
  if (!storeId) return res.status(400).json({ error: 'storeId required' })

  await ensureSchema()

  const { rows: store } = await sql`
    SELECT id, subdomain, store_name, niche, niche_categories, niche_built_at
    FROM user_stores WHERE id = ${storeId} LIMIT 1
  `
  if (!store[0]) return res.status(404).json({ error: 'Store not found' })
  const storeNiche = store[0].niche

  // Aggregate queue progress
  const { rows: queueAgg } = await sql`
    SELECT
      COUNT(*) FILTER (WHERE status = 'pending')::int      AS pending,
      COUNT(*) FILTER (WHERE status = 'processing')::int   AS processing,
      COUNT(*) FILTER (WHERE status = 'done')::int         AS done,
      COUNT(*) FILTER (WHERE status = 'failed')::int       AS failed,
      COUNT(*)::int                                        AS total,
      COALESCE(SUM(products_found) FILTER (WHERE status = 'done'), 0)::int AS products_found,
      MAX(processed_at) AS last_processed_at
    FROM store_build_queue
    WHERE store_id = ${storeId}
  `
  const agg = queueAgg[0] || {}
  const totalKeywords = agg.total || 0
  const processedKeywords = (agg.done || 0) + (agg.failed || 0)
  const percent = totalKeywords > 0 ? Math.round((processedKeywords / totalKeywords) * 100) : 0

  // Authoritative count: products actually tagged with this store's niche
  // (works for both newly-inserted and existing products newly-tagged)
  let productsInShop = 0
  if (storeNiche) {
    const { rows: cntRows } = await sql`
      SELECT COUNT(*)::int AS cnt
      FROM user_products
      WHERE is_active = true AND niches @> ARRAY[${storeNiche}]::TEXT[]
    `
    productsInShop = cntRows[0]?.cnt || 0
  }

  // "Tease" reel: 12 products matching this niche, most recently
  // updated first so fresh tags surface immediately
  let recentProducts = []
  if (storeNiche) {
    const { rows: teaseRows } = await sql`
      SELECT image, title, supplier_product_id, sale_price
      FROM user_products
      WHERE is_active = true
        AND niches @> ARRAY[${storeNiche}]::TEXT[]
        AND image IS NOT NULL AND image <> ''
      ORDER BY updated_at DESC NULLS LAST, created_at DESC
      LIMIT 12
    `
    recentProducts = teaseRows
  }

  const status = totalKeywords === 0
    ? 'idle'
    : (agg.pending === 0 && agg.processing === 0 ? 'complete' : 'building')

  // Mark store as built once we hit complete (idempotent)
  if (status === 'complete' && !store[0].niche_built_at) {
    try {
      await sql`UPDATE user_stores SET niche_built_at = NOW() WHERE id = ${storeId}`
    } catch { /* non-critical */ }
  }

  return res.json({
    storeId,
    subdomain: store[0].subdomain,
    storeName: store[0].store_name,
    niche: store[0].niche,
    categories: store[0].niche_categories,
    builtAt: store[0].niche_built_at,
    status,
    progress: {
      total: totalKeywords,
      pending: agg.pending || 0,
      processing: agg.processing || 0,
      done: agg.done || 0,
      failed: agg.failed || 0,
      percent,
      // Queue sum (tally of inserts+tags reported by cron) — useful for debug
      queueReported: agg.products_found || 0,
      // Authoritative: how many products now live on the store
      productsFound: productsInShop,
      lastProcessedAt: agg.last_processed_at || null,
    },
    recentProducts,
  })
}
