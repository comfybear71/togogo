// Admin product inspector — iterate on one product until it's 100% right.
//
// GET /api/admin/inspect-product?aeId=1005008151422163&secret=<JWT>
//     or  &id=<uuid>
// POST /api/admin/inspect-product?aeId=...&secret=<JWT>  → force re-heal
//
// Returns:
//   - What's in our DB for this product (variants, prices, niche, ...)
//   - Live from ds.product.get (variants + real sku_price + images)
//   - Live from ds.freight.query (shipping cost to AU)
//   - Computed break-even per variant using pricing.js
//   - Diff summary: is what we stored equal to what AE says now?
//   - Quick links: storefront page URL, AE product URL, verify link
import { sql, ensureSchema } from '../_lib/db.js'
import { verifyToken, requireAdminOrSetup } from '../_lib/auth.js'
import { getProductDetails, queryDSFreight } from '../_lib/suppliers.js'
import { summarisePricing, breakEvenUsd, TAX_RATE } from '../_lib/pricing.js'

async function authorize(req) {
  const querySecret = req.query.secret
  if (querySecret && querySecret === process.env.JWT_SECRET) return true
  if (querySecret) {
    try {
      const payload = verifyToken(querySecret)
      if (payload && payload.role === 'admin') return true
    } catch { /* */ }
  }
  try { await requireAdminOrSetup(req); return true } catch { return false }
}

export default async function handler(req, res) {
  if (!(await authorize(req))) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  await ensureSchema()

  const aeId = req.query.aeId
  const id = req.query.id
  if (!aeId && !id) {
    return res.status(400).json({ error: 'aeId or id required' })
  }

  // Find our stored product
  const { rows: products } = aeId
    ? await sql`
        SELECT * FROM user_products
        WHERE supplier_product_id = ${aeId}
        ORDER BY created_at DESC LIMIT 1
      `
    : await sql`SELECT * FROM user_products WHERE id = ${id} LIMIT 1`

  const stored = products[0] || null
  const resolvedAeId = aeId || (stored?.supplier_product_id || '').replace('ae_', '')

  if (!resolvedAeId) {
    return res.status(404).json({ error: 'Could not resolve AE product id' })
  }

  // POST with ?force=1 → re-heal this product right now, bypassing cron cooldown
  if (req.method === 'POST' && stored) {
    try {
      const details = await getProductDetails(resolvedAeId)
      if (!details || !Array.isArray(details.variants) || details.variants.length === 0) {
        return res.json({ success: false, error: 'ds.product.get returned no variants — product may be delisted' })
      }

      // Shipping via freight query on the cheapest SKU
      let shippingUsd = 0
      try {
        const firstSkuId = details.variants[0]?.skuId || ''
        const freight = await queryDSFreight(resolvedAeId, 'AU', 1, firstSkuId)
        if (Array.isArray(freight) && freight.length > 0) {
          shippingUsd = freight.reduce((m, o) => o.cost < m.cost ? o : m, freight[0]).cost || 0
        }
      } catch { /* leave 0 */ }

      const summary = summarisePricing(details.variants, shippingUsd)
      await sql`
        UPDATE user_products
        SET supplier_cost = ${summary.breakEvenMinUsd},
            sale_price = ${summary.breakEvenMinUsd},
            api_price = ${summary.minUsd},
            shipping_cost = ${shippingUsd},
            shipping_usd = ${shippingUsd},
            tax_amount = 0,
            price_currency = 'USD',
            variants = ${JSON.stringify(details.variants)}::jsonb,
            min_variant_price_usd = ${summary.minUsd},
            max_variant_price_usd = ${summary.maxUsd},
            product_rating = ${details.rating || stored.product_rating || 0},
            orders_count = ${details.orders || stored.orders_count || 0},
            discount_percent = ${details.discountPercent || 0},
            original_price = ${details.originalPrice || 0},
            variants_updated_at = NOW(),
            updated_at = NOW()
        WHERE id = ${stored.id}
      `

      return res.json({
        success: true,
        message: `Re-healed product ${resolvedAeId}`,
        variantCount: details.variants.length,
        priceRangeUsd: [summary.minUsd, summary.maxUsd],
        breakEvenMinUsd: summary.breakEvenMinUsd,
        breakEvenMaxUsd: summary.breakEvenMaxUsd,
        shippingUsd,
      })
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message })
    }
  }

  // GET — compare stored vs live
  let live = null
  let liveShippingUsd = null
  try {
    const details = await getProductDetails(resolvedAeId)
    if (details) {
      live = details
      if (Array.isArray(details.variants) && details.variants[0]?.skuId) {
        try {
          const freight = await queryDSFreight(resolvedAeId, 'AU', 1, details.variants[0].skuId)
          if (Array.isArray(freight) && freight.length > 0) {
            liveShippingUsd = freight.reduce((m, o) => o.cost < m.cost ? o : m, freight[0]).cost || 0
          }
        } catch { /* */ }
      }
    }
  } catch (err) {
    live = { error: err.message }
  }

  // Compute expected break-even per live variant
  const liveVariantsWithBreakEven = (live?.variants || []).map(v => ({
    ...v,
    shippingUsd: liveShippingUsd ?? 0,
    breakEvenUsd: breakEvenUsd(v.priceUsd, liveShippingUsd ?? 0),
  }))

  // Stored variants parsed back
  const storedVariants = stored?.variants
    ? (typeof stored.variants === 'string'
        ? (() => { try { return JSON.parse(stored.variants) } catch { return [] } })()
        : stored.variants)
    : []

  // Produce a quick diff: do the stored prices match the live ones (per skuId)?
  const diff = []
  if (live?.variants && storedVariants.length > 0) {
    for (const liveV of live.variants) {
      const storedV = storedVariants.find(sv => String(sv.skuId) === String(liveV.skuId))
      if (!storedV) {
        diff.push({ skuId: liveV.skuId, issue: 'missing_in_db', liveUsd: liveV.priceUsd })
      } else if (Math.abs((storedV.priceUsd || 0) - (liveV.priceUsd || 0)) > 0.01) {
        diff.push({
          skuId: liveV.skuId,
          issue: 'price_drift',
          storedUsd: storedV.priceUsd,
          liveUsd: liveV.priceUsd,
          delta: Math.round(((liveV.priceUsd || 0) - (storedV.priceUsd || 0)) * 100) / 100,
        })
      }
    }
  }

  const subdomain = 'jum' // customer can swap — doesn't really matter for admin inspection
  const storefrontUrl = stored ? `https://${subdomain}.togogo.me/?verify=1` : null
  const aeUrl = `https://www.aliexpress.com/item/${resolvedAeId}.html`

  return res.json({
    aeId: resolvedAeId,
    stored: stored ? {
      id: stored.id,
      title: (stored.title || '').slice(0, 80),
      priceCurrency: stored.price_currency,
      salePrice: parseFloat(stored.sale_price) || 0,
      supplierCost: parseFloat(stored.supplier_cost) || 0,
      shippingUsd: parseFloat(stored.shipping_usd ?? stored.shipping_cost) || 0,
      minVariantPriceUsd: parseFloat(stored.min_variant_price_usd) || 0,
      maxVariantPriceUsd: parseFloat(stored.max_variant_price_usd) || 0,
      variantsUpdatedAt: stored.variants_updated_at,
      variantCount: storedVariants.length,
      variants: storedVariants.map(v => ({
        skuId: v.skuId,
        skuAttr: v.skuAttr,
        priceUsd: v.priceUsd,
        stock: v.stock,
        label: v.label || Object.values(v.propertyMap || {}).join(' / '),
      })),
      niches: stored.niches || [],
      isActive: stored.is_active,
    } : null,
    live: live?.error ? { error: live.error } : {
      title: (live?.title || '').slice(0, 80),
      variantCount: liveVariantsWithBreakEven.length,
      shippingUsd: liveShippingUsd,
      taxRate: TAX_RATE,
      variants: liveVariantsWithBreakEven.map(v => ({
        skuId: v.skuId,
        skuAttr: v.skuAttr,
        priceUsd: v.priceUsd,
        breakEvenUsd: v.breakEvenUsd,
        stock: v.stock,
        label: v.label,
        colorImage: v.colorImage,
      })),
      rating: live?.rating,
      orders: live?.orders,
    },
    diff: diff.length > 0 ? diff : 'all variant prices match',
    links: {
      storefront: storefrontUrl,
      aliExpress: aeUrl,
      rebuildThisProduct: `POST /api/admin/inspect-product?aeId=${resolvedAeId}&secret=<JWT>`,
    },
  })
}
