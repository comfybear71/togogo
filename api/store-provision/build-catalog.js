// Queue keyword searches for a store's niche-driven catalogue build.
//
// POST /api/store-provision/build-catalog
//   Body: {
//     storeId: 'uuid',
//     niche: 'fishing equipment',
//     categories: { 'Rods & Reels': ['spinning rods', ...], ... },
//     allKeywords: ['spinning rods', 'baitcasting rods', ...],
//     maxKeywords: 100   // optional cap to control cost (default 100)
//   }
//
// Behaviour:
//   - Saves niche + categories on the user_stores row
//   - Inserts up to maxKeywords rows into store_build_queue
//   - Cron /api/cron/process-build-queue picks up rows in batches
//   - Frontend polls /api/store-provision/build-status for progress
//
// Phase 3: now accepts store owner JWT in addition to admin setup secret.
// Ownership enforced inline: store.user_id must match caller.id unless
// caller is admin via setup secret.
import { sql, ensureSchema } from '../_lib/db.js'
import { requireUserOrAdmin } from '../_lib/auth.js'

const DEFAULT_MAX_KEYWORDS = 100

// 30-second debounce per storeId to absorb accidental double-clicks.
// In-memory Map; fine for a single-region Vercel function. A second
// request within 30s gets 429 with retry-after.
const recentBuilds = new Map()
const DEBOUNCE_MS = 30 * 1000

function pruneDebounceMap() {
  const now = Date.now()
  for (const [key, ts] of recentBuilds.entries()) {
    if (now - ts > DEBOUNCE_MS) recentBuilds.delete(key)
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' })
  }

  let caller
  try {
    caller = await requireUserOrAdmin(req)
  } catch (err) {
    return res.status(err?.status || 500).json({ error: err?.message || 'Auth error' })
  }

  await ensureSchema()

  const { storeId, niche, categories, allKeywords, maxKeywords = DEFAULT_MAX_KEYWORDS } = req.body || {}

  if (!storeId || !niche || !Array.isArray(allKeywords) || allKeywords.length === 0) {
    return res.status(400).json({ error: 'storeId, niche, and allKeywords[] required' })
  }

  // 30s debounce keyed on storeId — absorbs double-clicks without a
  // full rate-limit policy. Real pacing is provided by the queue cron.
  pruneDebounceMap()
  const lastAt = recentBuilds.get(storeId)
  if (lastAt && (Date.now() - lastAt) < DEBOUNCE_MS) {
    const retryInSec = Math.ceil((DEBOUNCE_MS - (Date.now() - lastAt)) / 1000)
    res.setHeader('Retry-After', String(retryInSec))
    return res.status(429).json({
      error: `A build was just queued for this store. Try again in ${retryInSec}s.`,
      retryAfter: retryInSec,
    })
  }

  // Confirm store exists, get user_id
  const { rows: stores } = await sql`
    SELECT id, user_id FROM user_stores WHERE id = ${storeId} LIMIT 1
  `
  if (!stores[0]) return res.status(404).json({ error: 'Store not found' })
  const store = stores[0]

  // Ownership guard. Admin via setup-secret passes through (caller.id
  // is 'setup' and caller.role is 'admin'). Real users must own the
  // store they're building.
  const isAdmin = caller.role === 'admin'
  if (!isAdmin && String(store.user_id) !== String(caller.id)) {
    return res.status(403).json({ error: "You can only build your own store" })
  }

  // Stamp the debounce now that auth + ownership pass.
  recentBuilds.set(storeId, Date.now())

  // Save niche + categories on the store
  try {
    await sql`
      UPDATE user_stores
      SET niche = ${niche},
          niche_categories = ${JSON.stringify(categories || {})}::jsonb,
          updated_at = NOW()
      WHERE id = ${storeId}
    `
  } catch (err) {
    console.error('[BuildCatalog] Failed to save niche on store:', err.message)
  }

  // Build keyword → category lookup so we know which category each came from
  const keywordCategory = new Map()
  for (const [cat, kws] of Object.entries(categories || {})) {
    if (!Array.isArray(kws)) continue
    for (const kw of kws) {
      const key = String(kw).trim().toLowerCase()
      if (key && !keywordCategory.has(key)) keywordCategory.set(key, cat)
    }
  }

  // Cap + dedupe keywords
  const uniqueKeywords = [...new Set(allKeywords.map(k => String(k).trim()).filter(Boolean))]
  const cappedKeywords = uniqueKeywords.slice(0, maxKeywords)

  // Wipe ALL existing queue rows for this store, then queue new ones.
  // Earlier we only cleared 'pending' which meant re-running Build Store
  // accumulated done/failed counts from prior sessions, and the UI
  // progress widget ("X of Y keywords searched") showed misleading
  // totals (e.g. 200 total after a second 100-keyword build). Products
  // already in user_products from past runs are NOT affected — only the
  // queue tracking rows are reset.
  await sql`DELETE FROM store_build_queue WHERE store_id = ${storeId}`

  let queued = 0
  for (const kw of cappedKeywords) {
    const cat = keywordCategory.get(kw.toLowerCase()) || null
    try {
      await sql`
        INSERT INTO store_build_queue (store_id, user_id, niche, category, keyword, status)
        VALUES (${storeId}, ${store.user_id}, ${niche}, ${cat}, ${kw}, 'pending')
      `
      queued++
    } catch (err) {
      console.error('[BuildCatalog] Insert failed for keyword:', kw, err.message)
    }
  }

  return res.json({
    success: true,
    storeId,
    niche,
    queued,
    capped: uniqueKeywords.length > maxKeywords,
    totalKeywordsRequested: uniqueKeywords.length,
    maxKeywords,
  })
}
