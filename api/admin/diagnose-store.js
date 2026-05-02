// Per-store diagnostic. Returns the exact data the storefront API
// uses to decide which products surface on a given subdomain. Used
// to figure out why a particular store (e.g. froggies.togogo.me)
// shows nothing or shows the wrong things on the customer-facing
// storefront — without needing direct database access.
//
// GET /api/admin/diagnose-store?subdomain=froggies&secret=JWT_SECRET
//
// Response shape:
//   {
//     store: { subdomain, status, niches[], niche, owner_id, store_name, created_at, ... } | null,
//     owner: { id, email, role } | null,
//     counts: {
//       total: int,            // raw rows on user_products for this owner
//       active: int,           // is_active = true
//       priced: int,           // passes the storefront priced gate
//       nicheVisible: int,     // priced AND niches overlap (or empty)
//       storefrontVisible: int // what will actually appear on the storefront grid
//     },
//     productSample: [{ id, title, niches, price, is_active, ... }],
//     diagnosis: human-readable string explaining the verdict
//   }
import { sql } from '../_lib/db.js'

export default async function handler(req, res) {
  // Auth: accept either the JWT_SECRET as a setup-style bypass (for
  // a-shell / curl from iPhone where there's no admin login flow) or
  // a real admin JWT via verifyToken. Mirrors diagnose-price-filter.
  const secret = req.query.secret
  let authorized = secret === process.env.JWT_SECRET
  if (!authorized && secret) {
    try {
      const { verifyToken } = await import('../_lib/auth.js')
      const payload = verifyToken(secret)
      if (payload && payload.role === 'admin') authorized = true
    } catch {}
  }
  if (!authorized) return res.status(401).json({ error: 'Unauthorized' })

  const subdomain = req.query.subdomain
  if (!subdomain) {
    return res.status(400).json({ error: 'subdomain query param required (e.g. ?subdomain=froggies)' })
  }

  try {
    // Step 1: look up the store row by subdomain. The storefront API
    // only returns a 200 if status='active', so any other state would
    // explain a "store not found" customer experience.
    const { rows: storeRows } = await sql`
      SELECT id, subdomain, full_domain, store_name, status, created_at, updated_at,
             theme_id, niche, niches, markup_percent, user_id
      FROM user_stores WHERE subdomain = ${subdomain}
    `
    const store = storeRows[0] || null

    if (!store) {
      return res.json({
        store: null,
        owner: null,
        counts: null,
        productSample: [],
        diagnosis: `No row in user_stores with subdomain='${subdomain}'. The storefront will return 404 because the lookup fails. Either the store was never provisioned, or the subdomain is misspelled.`,
      })
    }

    // Step 2: confirm the owner user exists. A dangling user_id is rare
    // but would also make the storefront query return nothing.
    const { rows: ownerRows } = await sql`
      SELECT id, email, name, role, created_at
      FROM users WHERE id = ${store.user_id}
    `
    const owner = ownerRows[0] || null

    // Step 3: count products at every gate the storefront applies, in
    // sequence — so we can pinpoint which gate is hiding everything.
    //   total          → raw rows by user_id
    //   active         → is_active = true
    //   priced         → variants_updated_at IS NOT NULL AND price_currency='USD' AND min_variant_price_usd>0
    //                    OR (created_at > NOW()-6h AND sale_price>0)
    //   nicheVisible   → above AND (niches IS NULL/empty OR overlaps store niches)
    //   storefrontVisible = nicheVisible (the storefront has no other gate beyond filters)
    const storeNichesArr = Array.isArray(store.niches) && store.niches.length > 0
      ? store.niches
      : (store.niche ? [store.niche] : [])

    const { rows: countRows } = await sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE is_active = true)::int AS active,
        COUNT(*) FILTER (
          WHERE is_active = true
            AND (
              (variants_updated_at IS NOT NULL AND price_currency = 'USD' AND COALESCE(min_variant_price_usd, 0) > 0)
              OR (created_at > NOW() - INTERVAL '6 hours' AND COALESCE(sale_price, 0) > 0)
            )
        )::int AS priced,
        COUNT(*) FILTER (
          WHERE is_active = true
            AND (
              (variants_updated_at IS NOT NULL AND price_currency = 'USD' AND COALESCE(min_variant_price_usd, 0) > 0)
              OR (created_at > NOW() - INTERVAL '6 hours' AND COALESCE(sale_price, 0) > 0)
            )
            AND (
              ${storeNichesArr.length === 0}::boolean
              OR niches IS NULL
              OR cardinality(niches) = 0
              OR niches && ${storeNichesArr}::TEXT[]
            )
        )::int AS niche_visible
      FROM user_products
      WHERE user_id = ${store.user_id}
    `
    const counts = {
      total: countRows[0]?.total || 0,
      active: countRows[0]?.active || 0,
      priced: countRows[0]?.priced || 0,
      nicheVisible: countRows[0]?.niche_visible || 0,
      storefrontVisible: countRows[0]?.niche_visible || 0,
    }

    // Step 4: sample 5 products so we can eyeball titles, niches, and
    // active/priced state. Newest first to surface anything just added.
    const { rows: sampleRows } = await sql`
      SELECT id, title, niches, category, sale_price, price_currency,
             is_active, variants_updated_at, min_variant_price_usd,
             created_at
      FROM user_products
      WHERE user_id = ${store.user_id}
      ORDER BY created_at DESC
      LIMIT 5
    `
    const productSample = sampleRows.map(p => ({
      id: p.id,
      title: (p.title || '').slice(0, 80),
      niches: p.niches || [],
      category: p.category,
      salePrice: parseFloat(p.sale_price) || 0,
      priceCurrency: p.price_currency,
      isActive: p.is_active,
      pricedGate: p.variants_updated_at != null
        && p.price_currency === 'USD'
        && parseFloat(p.min_variant_price_usd) > 0,
      createdAt: p.created_at,
    }))

    // Step 5: verdict — the most useful piece. Walks the funnel and
    // explains the FIRST gate that's eliminating products, so you know
    // exactly what to fix without parsing all the numbers manually.
    let diagnosis
    if (store.status !== 'active') {
      diagnosis = `Store status is '${store.status}', not 'active'. The storefront API returns 404 for non-active stores. Activate it via admin or the Stripe webhook flow.`
    } else if (!owner) {
      diagnosis = `Store points to user_id='${store.user_id}' but no row exists in users. Database integrity issue — investigate.`
    } else if (counts.total === 0) {
      diagnosis = `Owner has 0 products in user_products. Storefront will be empty. Owner needs to use 'Add to my shop' or run AI Builder.`
    } else if (counts.active === 0) {
      diagnosis = `${counts.total} products exist for this owner but ALL have is_active=false. They were soft-deleted or never activated. Storefront will be empty.`
    } else if (counts.priced === 0) {
      diagnosis = `${counts.active} products are active but NONE pass the priced gate (variants_updated_at NULL, or non-USD currency, or zero min_variant_price_usd, AND not freshly added). Likely the rebuild-product-variants cron hasn't enriched them. Wait a few minutes or check cron logs.`
    } else if (counts.nicheVisible === 0) {
      diagnosis = `${counts.priced} products are priced but NONE pass the niche-overlap filter. Store niches=${JSON.stringify(storeNichesArr)} but no product has overlapping niches[] (and post-PR-#116 filter also admits empty niches, so this means every product has niches[] tagged with values that don't appear in the store niches[]). Either heal product niches or update store niches.`
    } else {
      diagnosis = `Storefront should show ${counts.storefrontVisible} products. If the storefront still appears broken, the issue is downstream of this query — search filter, frontend rendering, or caching.`
    }

    return res.json({
      store,
      owner,
      counts,
      storeNichesUsedForFilter: storeNichesArr,
      productSample,
      diagnosis,
    })
  } catch (err) {
    console.error('[diagnose-store] Error:', err)
    return res.status(500).json({ error: err?.message || 'Diagnostic failed' })
  }
}
