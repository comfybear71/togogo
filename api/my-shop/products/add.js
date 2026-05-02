// Add a product to the authenticated user's shop from a supplier
// search result. Mirrors the cron's import logic so the inserted row
// passes the storefront priced-gate (variants_updated_at NOT NULL,
// price_currency = 'USD', min_variant_price_usd > 0) — otherwise the
// product wouldn't show up on the storefront.
//
// POST /api/my-shop/products/add
// Body: { supplierProductId: string (AE numeric id, no 'ae_' prefix),
//         category?: string, niche?: string }
//
// Idempotent: if the user already has this supplier_product_id, returns
// the existing row instead of re-inserting.
import { sql } from '../../_lib/db.js'
import { requireAuth } from '../../_lib/auth.js'
import { getProductDetails, queryDSFreight } from '../../_lib/suppliers.js'
import { summarisePricing } from '../../_lib/pricing.js'

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

  const { supplierProductId, category, niche } = req.body || {}
  if (!supplierProductId) {
    return res.status(400).json({ error: 'supplierProductId required' })
  }

  // Strip any 'ae_' prefix and verify it's numeric — AE product ids are
  // long integers. Anything else is a bug.
  const aeId = String(supplierProductId).replace(/^ae_/, '').trim()
  if (!aeId || !/^\d+$/.test(aeId)) {
    return res.status(400).json({ error: 'Invalid AliExpress product id' })
  }

  try {
    // Skip if the user already has this product — just return it.
    const existing = await sql`
      SELECT id, title, image, sale_price, supplier_product_id
      FROM user_products
      WHERE user_id = ${user.id} AND supplier_product_id = ${aeId}
      LIMIT 1
    `
    if (existing.rows[0]) {
      return res.json({
        product: existing.rows[0],
        alreadyInShop: true,
        message: 'Already in your shop',
      })
    }

    // Fresh fetch — we want canonical title, image, variants, ratings etc.
    const details = await getProductDetails(aeId)
    if (!details || !Array.isArray(details.variants) || details.variants.length === 0) {
      return res.status(422).json({
        error: 'Couldn\'t price this product right now — please try another, or wait and retry.',
      })
    }

    // Real shipping for the cheapest variant; same approach as the cron
    // import. Per-SKU freight gets recomputed at checkout regardless.
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
    if (salePriceUsd <= 0) {
      return res.status(422).json({
        error: 'Couldn\'t determine a sale price — please try another product.',
      })
    }

    const imgArray = Array.isArray(details.images) ? details.images : []
    const cat = category && typeof category === 'string' ? category : 'General'

    // Tag the new product with the store's current niches[] so it
    // passes the storefront's niche-overlap filter immediately. Without
    // this, a manually-added product gets niches=[] and is INVISIBLE on
    // the storefront — which is what Stuart hit on stu.togogo.me when
    // adding a TikTok ring and a Men's Arch Support shoe and finding
    // they couldn't be searched. The store's niches[] is the source of
    // truth for what the storefront will display, so copying it onto
    // the product guarantees visibility regardless of which niche bucket
    // the customer is currently filtering by. If the caller passed an
    // explicit `niche`, we honour that too (used by AI Builder paths).
    const { rows: storeRows } = await sql`
      SELECT niches, niche FROM user_stores WHERE user_id = ${user.id} LIMIT 1
    `
    const storeNiches = Array.isArray(storeRows[0]?.niches) ? storeRows[0].niches : []
    const legacyNiche = storeRows[0]?.niche
    const baseNiches = storeNiches.length > 0
      ? storeNiches
      : (legacyNiche ? [legacyNiche] : [])
    const nichesArr = niche
      ? Array.from(new Set([...baseNiches, String(niche)]))
      : baseNiches

    const { rows } = await sql`
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
        ${user.id}, ${details.title || ''}, ${details.title || ''},
        ${details.image || imgArray[0] || ''}, ${imgArray},
        'AliExpress', ${aeId},
        ${salePriceUsd}, ${salePriceUsd},
        ${summary.minUsd}, ${shippingUsd}, 0,
        'USD', ${cat}, true,
        ${details.rating || 0}, ${details.orders || 0},
        ${details.originalPrice || 0}, ${details.discountPercent || 0},
        ${nichesArr},
        ${JSON.stringify(details.variants)}::jsonb,
        ${summary.minUsd}, ${summary.maxUsd},
        ${shippingUsd}, NOW()
      )
      RETURNING id, title, image, sale_price, supplier_product_id
    `

    return res.json({ product: rows[0], alreadyInShop: false })
  } catch (err) {
    console.error('[my-shop/add-from-search] Error:', err)
    return res.status(500).json({ error: err.message || 'Failed to add product' })
  }
}
