// Cron: process pending store_build_queue rows.
//
// For each queued keyword:
//   1. Call AliExpress text.search
//   2. Insert any new products into the shared user_products pool
//   3. Mark the queue row as 'done' with products_found count
//
// Conservative batch (5 keywords/run, 30 products/keyword) to stay under
// Vercel's 60s function timeout. Scheduled every minute so a 100-keyword
// build completes in ~20 minutes. Newly-added products skip the heavy
// freight + product-detail enrichment — the enrich-products cron picks
// those up on its own schedule.
//
// Auth: Vercel cron header, CRON_SECRET, or signed admin JWT.
import { sql, ensureSchema } from '../_lib/db.js'
import { searchAliExpressDirect, getProductDetails, queryDSFreight } from '../_lib/suppliers.js'
import { summarisePricing } from '../_lib/pricing.js'

// Reduced from 5/30 when we switched to real-variant imports.
// Each new product now costs 2 API calls (ds.product.wholesale.get + ds.freight.query)
// so the batch must be smaller to stay within Vercel's 60s cap.
// (wholesale.get returns the real dropshipper rate — see api/_lib/suppliers.js)
const BATCH_SIZE = 2
const PRODUCTS_PER_KEYWORD = 10
const PER_KEYWORD_TIMEOUT_MS = 8000

// Retry control for rate-limited (AppApiCallLimit) keywords
const MAX_RETRIES = 3
// Backoff schedule in minutes: after 0 retries → retry in 5m,
// after 1 → 15m, after 2 → 60m. Caps the total retry span to ~80 min.
const BACKOFF_MINUTES = [5, 15, 60]

function nextRetryAt(retryCount) {
  const idx = Math.min(retryCount, BACKOFF_MINUTES.length - 1)
  const ms = BACKOFF_MINUTES[idx] * 60 * 1000
  return new Date(Date.now() + ms)
}

function isRateLimitError(msg) {
  if (!msg) return false
  return msg.includes('AppApiCallLimit') || msg.includes('frequency of app access')
}

async function processOne(row) {
  const keyword = row.keyword
  let products = []
  try {
    // searchAliExpressDirect returns { products: [...], total: N } (not a bare array).
    // On timeout we default to { products: [] } so the shape stays consistent.
    const searchResult = await Promise.race([
      searchAliExpressDirect(keyword, 1, { pageSize: PRODUCTS_PER_KEYWORD, country: 'AU' }),
      new Promise(r => setTimeout(() => r({ products: [] }), PER_KEYWORD_TIMEOUT_MS)),
    ])
    products = Array.isArray(searchResult?.products) ? searchResult.products : []
  } catch (err) {
    const msg = err.message || String(err)
    if (isRateLimitError(msg)) {
      return { rateLimited: true, error: `search rate-limited: ${msg}` }
    }
    return { error: `search failed: ${msg}` }
  }

  if (products.length === 0) {
    return { productsFound: 0, tagged: 0 }
  }

  let inserted = 0
  let tagged = 0
  const niche = row.niche || null
  for (const p of products) {
    const aeId = String(p.productId || p.id || '').replace('ae_', '')
    if (!aeId) continue

    // If product already exists, just append this niche to its niches[]
    // so multi-niche products (e.g. phone accessories + electronics) show
    // on every relevant store
    try {
      const { rows: existing } = await sql`
        SELECT id, niches FROM user_products WHERE supplier_product_id = ${aeId} LIMIT 1
      `
      if (existing.length > 0) {
        if (niche) {
          const current = Array.isArray(existing[0].niches) ? existing[0].niches : []
          if (!current.includes(niche)) {
            try {
              await sql`
                UPDATE user_products
                SET niches = array_append(COALESCE(niches, ARRAY[]::TEXT[]), ${niche})
                WHERE id = ${existing[0].id}
              `
              tagged++
            } catch { /* non-critical */ }
          }
        }
        continue
      }
    } catch { continue }

    // NEW PRICING MODEL: fetch real variants via ds.product.wholesale.get,
    // then use the cheapest variant's break-even USD as the headline. No
    // guessing from the search-feed price (which is often a teaser). If we
    // can't get variants, we DON'T import the product — better to miss a
    // row than store wrong pricing.
    let details = null
    let rateLimitHit = false
    try {
      details = await Promise.race([
        getProductDetails(aeId),
        new Promise(r => setTimeout(() => r(null), 6000)),
      ])
    } catch (err) {
      // getProductDetails re-throws AppApiCallLimit so caller can back off.
      // Surface it up so the whole keyword goes to retry instead of just
      // silently skipping products.
      if (isRateLimitError(err?.message)) {
        rateLimitHit = true
      }
    }

    if (rateLimitHit) {
      // Bail the keyword — don't burn more products during the ban.
      // Return whatever has been committed so far plus the rate-limit flag.
      return { productsFound: inserted, tagged, rateLimited: true, error: 'product fetch rate-limited' }
    }

    if (!details || !Array.isArray(details.variants) || details.variants.length === 0) {
      // Skip — can't price accurately without real variant data
      continue
    }

    // Real shipping via ds.freight.query for the cheapest SKU — good enough
    // baseline. Per-SKU freight can be recomputed at checkout.
    let shippingUsd = 0
    try {
      const firstSkuId = details.variants[0]?.skuId || ''
      const freight = await Promise.race([
        queryDSFreight(aeId, 'AU', 1, firstSkuId),
        new Promise(r => setTimeout(() => r(null), 6000)),
      ])
      if (Array.isArray(freight) && freight.length > 0) {
        const cheapest = freight.reduce((m, o) => o.cost < m.cost ? o : m, freight[0])
        shippingUsd = cheapest.cost || 0
      }
    } catch { /* freight unknown — sale_price will reflect that */ }

    const summary = summarisePricing(details.variants, shippingUsd)
    const salePriceUsd = summary.breakEvenMinUsd
    if (salePriceUsd <= 0) continue

    const imgArray = Array.isArray(details.images) ? details.images : (Array.isArray(p.images) ? p.images : [])
    const nichesArr = niche ? [niche] : []
    try {
      await sql`
        INSERT INTO user_products (
          user_id, title, description, image, images, supplier,
          supplier_product_id, supplier_cost, sale_price,
          api_price, shipping_cost, tax_amount,
          price_currency, category, is_active,
          product_rating, orders_count, original_price, discount_percent,
          niches,
          variants, min_variant_price_usd, max_variant_price_usd,
          shipping_usd, variants_updated_at
        ) VALUES (
          ${row.user_id}, ${details.title || p.title}, ${details.title || p.title || ''},
          ${details.image || imgArray[0] || ''}, ${imgArray},
          'AliExpress', ${aeId},
          ${salePriceUsd}, ${salePriceUsd},
          ${summary.minUsd}, ${shippingUsd}, 0,
          'USD', ${row.category || 'General'}, true,
          ${details.rating || 0}, ${details.orders || 0},
          ${details.originalPrice || 0}, ${details.discountPercent || 0},
          ${nichesArr},
          ${JSON.stringify(details.variants)}::jsonb,
          ${summary.minUsd}, ${summary.maxUsd},
          ${shippingUsd}, NOW()
        )
      `
      inserted++
    } catch (err) {
      // Likely duplicate from concurrent insert — fine
    }
  }

  return { productsFound: inserted, tagged }
}

export default async function handler(req, res) {
  const authHeader = req.headers.authorization
  const cronSecret = process.env.CRON_SECRET
  const querySecret = req.query.secret

  let authorized = false
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) authorized = true
  if (querySecret === process.env.JWT_SECRET) authorized = true
  if (!authorized && querySecret) {
    try {
      const { verifyToken } = await import('../_lib/auth.js')
      const payload = verifyToken(querySecret)
      if (payload && payload.role === 'admin') authorized = true
    } catch { /* fall through */ }
  }
  if (!authorized) return res.status(401).json({ error: 'Unauthorized' })

  await ensureSchema()

  // Lock + grab the next batch (oldest pending first).
  // Rows that recently rate-limited carry a next_retry_at; skip them until
  // the backoff has elapsed. Rows never retried have next_retry_at IS NULL.
  const { rows: batch } = await sql`
    SELECT id, store_id, user_id, niche, category, keyword,
           COALESCE(retry_count, 0) AS retry_count
    FROM store_build_queue
    WHERE status = 'pending'
      AND (next_retry_at IS NULL OR next_retry_at <= NOW())
    ORDER BY created_at ASC
    LIMIT ${BATCH_SIZE}
  `

  if (batch.length === 0) {
    return res.json({ status: 'idle', message: 'Queue empty (or all pending rows still in retry backoff)' })
  }

  // Mark them processing so a parallel cron run doesn't double-fetch
  const ids = batch.map(r => r.id)
  await sql.query(
    `UPDATE store_build_queue SET status = 'processing' WHERE id = ANY($1)`,
    [ids]
  )

  let totalProductsFound = 0
  let retriesScheduled = 0
  let permanentlyFailed = 0
  const results = []
  for (const row of batch) {
    const result = await processOne(row)

    // RATE-LIMIT BRANCH — put the keyword back to 'pending' with a
    // backoff window. After MAX_RETRIES, mark permanently failed so we
    // don't cycle forever.
    if (result.rateLimited) {
      const currentRetries = Number(row.retry_count) || 0
      if (currentRetries >= MAX_RETRIES) {
        await sql`
          UPDATE store_build_queue
          SET status = 'failed',
              error = ${'rate limit: exhausted retries — ' + (result.error || '')},
              processed_at = NOW()
          WHERE id = ${row.id}
        `
        permanentlyFailed++
        results.push({ keyword: row.keyword, rateLimited: true, giveUp: true })
      } else {
        const retryAt = nextRetryAt(currentRetries)
        await sql`
          UPDATE store_build_queue
          SET status = 'pending',
              retry_count = ${currentRetries + 1},
              next_retry_at = ${retryAt.toISOString()},
              error = ${result.error || 'rate-limited'}
          WHERE id = ${row.id}
        `
        retriesScheduled++
        results.push({
          keyword: row.keyword,
          rateLimited: true,
          retryCount: currentRetries + 1,
          nextRetryAt: retryAt.toISOString(),
          partialInserts: result.productsFound || 0,
        })
      }
      continue
    }

    // PERMANENT FAIL BRANCH — non-rate-limit error
    if (result.error) {
      await sql`
        UPDATE store_build_queue
        SET status = 'failed', error = ${result.error}, processed_at = NOW()
        WHERE id = ${row.id}
      `
      permanentlyFailed++
      results.push({ keyword: row.keyword, error: result.error })
      continue
    }

    // SUCCESS BRANCH
    // Count BOTH fresh inserts and existing products newly-tagged with
    // this niche — both represent products that just became visible on
    // this niched store
    const combined = (result.productsFound || 0) + (result.tagged || 0)
    await sql`
      UPDATE store_build_queue
      SET status = 'done', products_found = ${combined}, processed_at = NOW()
      WHERE id = ${row.id}
    `
    totalProductsFound += combined
    results.push({
      keyword: row.keyword,
      productsFound: combined,
      newInserts: result.productsFound || 0,
      tagged: result.tagged || 0,
    })
  }

  return res.json({
    status: 'ok',
    processed: batch.length,
    totalProductsFound,
    retriesScheduled,
    permanentlyFailed,
    results,
  })
}
