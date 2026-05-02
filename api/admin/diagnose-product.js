// Per-product pricing diagnostic. Compares stored variant pricing
// against a fresh live call to AliExpress. Used to figure out why a
// customer sees one price in the cart and a higher price at Stripe
// checkout — the cart uses stored data (cheapest variant), the
// checkout fetches live per-SKU pricing. This endpoint surfaces both
// side-by-side so we can tell whether the drift is variant-pricing
// differences or AE updating their prices since the product was
// imported.
//
// GET /api/admin/diagnose-product?productId=<uuid>&secret=JWT_SECRET
//   or
// GET /api/admin/diagnose-product?supplierProductId=<ae_id>&secret=JWT_SECRET
//
// Response:
//   {
//     product: { id, title, supplier_product_id, sale_price, shipping_usd,
//                min_variant_price_usd, max_variant_price_usd, audRate, markupPercent, ... },
//     storedVariants: [{ skuId, label, priceUsd, stock }, ...],
//     liveVariants:   [{ skuId, label, priceUsd, stock }, ...],
//     liveShippingForCheapestVariant: { usd: number, country: 'AU', qty: 1 },
//     comparison: [{ skuId, label, storedPriceUsd, livePriceUsd, deltaUsd, deltaPct }],
//     storefrontPriceUsd: number,    // what the cart uses for cheapest variant
//     checkoutPriceUsdForCheapest: number, // what checkout would charge for cheapest
//     drift: 'none' | 'small' | 'large',
//     diagnosis: string
//   }
import { sql } from '../_lib/db.js'
import { getProductDetails, queryDSFreight } from '../_lib/suppliers.js'
import { getAudRate, summarisePricing, breakEvenUsd, getMinShippingUsd, usdToAud } from '../_lib/pricing.js'

export default async function handler(req, res) {
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

  const productId = req.query.productId
  const supplierProductId = req.query.supplierProductId
  if (!productId && !supplierProductId) {
    return res.status(400).json({ error: 'Provide productId (UUID) or supplierProductId (AE numeric id)' })
  }

  try {
    // Step 1: pull the stored product row. Either id (preferred) or
    // supplier_product_id lookup. We grab everything that contributes
    // to the cart's price math (sale_price, variants JSONB, shipping)
    // and to the customer-facing display (markup_percent via the store).
    const { rows: productRows } = productId
      ? await sql`
          SELECT p.*, s.markup_percent, s.subdomain
          FROM user_products p
          LEFT JOIN user_stores s ON s.user_id = p.user_id
          WHERE p.id = ${productId}
          LIMIT 1
        `
      : await sql`
          SELECT p.*, s.markup_percent, s.subdomain
          FROM user_products p
          LEFT JOIN user_stores s ON s.user_id = p.user_id
          WHERE p.supplier_product_id = ${supplierProductId}
          ORDER BY p.created_at DESC
          LIMIT 1
        `
    const product = productRows[0]
    if (!product) {
      return res.status(404).json({ error: 'Product not found' })
    }

    const aeId = (product.supplier_product_id || '').replace('ae_', '')
    const storedVariantsRaw = product.variants
    const storedVariants = Array.isArray(storedVariantsRaw)
      ? storedVariantsRaw
      : (typeof storedVariantsRaw === 'string'
          ? (() => { try { return JSON.parse(storedVariantsRaw) } catch { return [] } })()
          : [])

    // Step 2: live AE call for the same product. Any failure here is
    // diagnostic info, not a hard failure — return what we have.
    let liveDetails = null
    let liveCallError = null
    try {
      liveDetails = await Promise.race([
        getProductDetails(aeId),
        new Promise(r => setTimeout(() => r(null), 8000)),
      ])
    } catch (err) {
      liveCallError = err?.message || 'Live AE call failed'
    }
    const liveVariants = Array.isArray(liveDetails?.variants) ? liveDetails.variants : []

    // Step 3: live shipping for the cheapest variant. This is the same
    // call the checkout makes (queryDSFreight) so we can see whether
    // shipping has drifted from the stored shipping_usd value.
    let liveShippingUsd = null
    let liveFreightError = null
    if (liveVariants.length > 0) {
      try {
        const cheapest = liveVariants.reduce((m, v) => (v.priceUsd || 0) < (m.priceUsd || 0) ? v : m, liveVariants[0])
        const freight = await Promise.race([
          queryDSFreight(aeId, 'AU', 1, cheapest.skuId || ''),
          new Promise(r => setTimeout(() => r(null), 5000)),
        ])
        if (Array.isArray(freight) && freight.length > 0) {
          liveShippingUsd = freight.reduce((m, o) => o.cost < m.cost ? o : m, freight[0]).cost || 0
        }
      } catch (err) {
        liveFreightError = err?.message || 'Live freight call failed'
      }
    }

    // Step 4: side-by-side variant comparison. Match by skuId — if a
    // skuId exists in stored but not live (or vice versa), it'll appear
    // as a one-sided row so we can see what's been added/removed.
    const liveBySkuId = new Map(liveVariants.map(v => [String(v.skuId || ''), v]))
    const storedBySkuId = new Map(storedVariants.map(v => [String(v.skuId || ''), v]))
    const allSkuIds = new Set([...liveBySkuId.keys(), ...storedBySkuId.keys()])
    const comparison = Array.from(allSkuIds).map(skuId => {
      const stored = storedBySkuId.get(skuId)
      const live = liveBySkuId.get(skuId)
      const storedPriceUsd = stored?.priceUsd ?? null
      const livePriceUsd = live?.priceUsd ?? null
      const deltaUsd = (storedPriceUsd != null && livePriceUsd != null)
        ? Math.round((livePriceUsd - storedPriceUsd) * 100) / 100
        : null
      const deltaPct = (storedPriceUsd > 0 && livePriceUsd != null)
        ? Math.round(((livePriceUsd / storedPriceUsd - 1) * 100) * 10) / 10
        : null
      return {
        skuId,
        label: live?.label || stored?.label || '',
        storedPriceUsd,
        livePriceUsd,
        storedStock: stored?.stock ?? null,
        liveStock: live?.stock ?? null,
        deltaUsd,
        deltaPct,
        onlyInStored: !live,
        onlyInLive: !stored,
      }
    })

    // Step 5: storefront-cart price (cheapest variant) vs what checkout
    // would charge for that SAME cheapest variant LIVE. If these don't
    // match, you have drift even before variant-selection issues.
    const audRate = await getAudRate()
    const markupPercent = parseFloat(product.markup_percent ?? 40) || 0
    const markupMultiplier = 1 + markupPercent / 100
    const minShippingUsd = await getMinShippingUsd(audRate)

    const storefrontBreakEvenUsd = parseFloat(product.sale_price) || 0
    const storefrontPriceUsd = Math.round(storefrontBreakEvenUsd * markupMultiplier * 100) / 100
    const storefrontPriceAud = usdToAud(storefrontPriceUsd, audRate)

    // Live equivalent: take cheapest live variant + max(live shipping, min) + 10% tax × markup × audRate
    let checkoutPriceUsdForCheapest = null
    let checkoutPriceAudForCheapest = null
    if (liveVariants.length > 0) {
      const cheapestLive = liveVariants.reduce((m, v) => (v.priceUsd || 0) < (m.priceUsd || 0) ? v : m, liveVariants[0])
      const livePriceUsd = cheapestLive.priceUsd || 0
      const shippingUsdEffective = Math.max(liveShippingUsd ?? parseFloat(product.shipping_usd) ?? 0, minShippingUsd)
      const liveBreakEven = breakEvenUsd(livePriceUsd, shippingUsdEffective)
      checkoutPriceUsdForCheapest = Math.round(liveBreakEven * markupMultiplier * 100) / 100
      checkoutPriceAudForCheapest = usdToAud(checkoutPriceUsdForCheapest, audRate)
    }

    // Step 6: verdict — which kind of drift is this?
    let drift = 'none'
    let diagnosis
    const meaningfulDeltas = comparison.filter(c => c.deltaPct != null && Math.abs(c.deltaPct) >= 5)
    const significantDeltas = comparison.filter(c => c.deltaPct != null && Math.abs(c.deltaPct) >= 25)
    if (significantDeltas.length > 0) {
      drift = 'large'
      diagnosis = `${significantDeltas.length} of ${comparison.length} variants have prices that have moved 25%+ between stored and live AE. AE has changed prices since this product was imported. Cart shows stored, checkout shows live → that's where the cart→checkout price jump comes from.`
    } else if (meaningfulDeltas.length > 0) {
      drift = 'small'
      diagnosis = `${meaningfulDeltas.length} of ${comparison.length} variants have moderate (5-25%) price drift between stored and live AE. Checkout price reflects live; cart shows stored.`
    } else if (liveVariants.length === 0) {
      drift = 'unknown'
      diagnosis = liveCallError
        ? `Live AE call failed (${liveCallError}). Can't compare. Stored variants count: ${storedVariants.length}.`
        : `Live AE returned 0 variants for this product (could be unpublished). Stored variants count: ${storedVariants.length}. The product may have been delisted on AE.`
    } else {
      drift = 'none'
      diagnosis = `Stored and live variant prices match within 5%. The cart→checkout price jump in this case is due to the customer choosing a non-cheapest variant: cart shows the cheapest variant's price (used as the storefront grid price), checkout charges the actually-chosen variant's price.`
    }

    return res.json({
      product: {
        id: product.id,
        title: product.title,
        supplierProductId: product.supplier_product_id,
        subdomain: product.subdomain,
        salePriceUsdStored: parseFloat(product.sale_price) || 0,
        shippingUsdStored: parseFloat(product.shipping_usd) || 0,
        minVariantPriceUsdStored: parseFloat(product.min_variant_price_usd) || 0,
        maxVariantPriceUsdStored: parseFloat(product.max_variant_price_usd) || 0,
        markupPercent,
        audRate,
        minShippingUsdFloor: minShippingUsd,
      },
      storedVariantsCount: storedVariants.length,
      liveVariantsCount: liveVariants.length,
      liveShippingUsd,
      liveCallError,
      liveFreightError,
      comparison,
      pricesForCheapestVariant: {
        storefrontUsd: storefrontPriceUsd,
        storefrontAud: storefrontPriceAud,
        checkoutLiveUsd: checkoutPriceUsdForCheapest,
        checkoutLiveAud: checkoutPriceAudForCheapest,
        deltaUsd: (storefrontPriceUsd && checkoutPriceUsdForCheapest != null)
          ? Math.round((checkoutPriceUsdForCheapest - storefrontPriceUsd) * 100) / 100
          : null,
        deltaPct: (storefrontPriceUsd > 0 && checkoutPriceUsdForCheapest != null)
          ? Math.round(((checkoutPriceUsdForCheapest / storefrontPriceUsd - 1) * 100) * 10) / 10
          : null,
      },
      drift,
      diagnosis,
    })
  } catch (err) {
    console.error('[diagnose-product] Error:', err)
    return res.status(500).json({ error: err?.message || 'Diagnostic failed' })
  }
}
