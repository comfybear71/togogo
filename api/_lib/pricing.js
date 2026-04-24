// Break-even pricing helpers — one source of truth for every variant price
// used by imports, rebuilds, and storefront display.
//
// Invariants:
//   - Internal pricing is USD (AE's native currency). supplier_cost,
//     ae_actual_cost_usd and sale_price as written by the cron all live
//     in USD.
//   - The single conversion to AUD happens at the Stripe boundary
//     (storefront/checkout.js uses currency: 'aud' on line items) and
//     at storefront/admin display time. Use `usdToAud` and `getAudRate`
//     below — never multiply by a literal exchange rate inline.
//   - NO markup at the cron stage. The store owner's per-shop
//     markup_percent is applied later, at storefront display + checkout.
//
// Formula per variant — real AE API numbers plus a clearly-labelled tax
// estimate (AE doesn't expose tax via any pre-order API; we pass through
// a flat 10% on (product + shipping) to match AE's own checkout
// breakdown for AU buyers — verified 2026-04-24 against 4 real orders
// including Garlic Chopper 8210323443339621 where AE billed product $1.10
// + shipping $5.68 + tax $0.68 = 10% of (1.10 + 5.68)):
//
//   subtotal_usd      = sku_price_usd + shipping_usd
//   supplier_cost_usd = subtotal_usd + estimateTax(subtotal_usd)
//   sale_price_usd    = supplier_cost_usd
//
// When AE applies Choice discounts or promos at their checkout that
// make their actual bill lower than our estimate, that delta is our
// margin. Choice is a discount AE gives store owners for selling
// through the platform — the user has explicitly said we keep it.
import { sql } from './db.js'

export const DEFAULT_SHIPPING_USD = 0
// Flat estimate. Per-country table is future work; user approved 10% now.
export const TAX_RATE = 0.10

// Returns the tax estimate in USD for a taxable subtotal (product + shipping).
// Labelled "Est. tax" wherever displayed — never pretend it's an exact number.
export function estimateTax(subtotalUsd) {
  const s = Math.max(0, Number(subtotalUsd) || 0)
  return Math.round(s * TAX_RATE * 100) / 100
}

// Parse a variant from ds.product.get's ae_item_sku_info_d_t_o[] shape.
// Returns the canonical variant shape we store in user_products.variants.
export function parseVariant(skuRaw) {
  const propsRaw = skuRaw?.ae_sku_property_dtos?.ae_sku_property_d_t_o || []
  const properties = {}
  const propertiesArray = []
  let colorImage = null
  const labelParts = []
  for (const p of propsRaw) {
    const name = p.sku_property_name || ''
    const value = p.property_value_definition_name || p.sku_property_value || ''
    const image = p.sku_image || ''
    if (name && value) {
      properties[name] = value
      labelParts.push(value)
    }
    propertiesArray.push({ name, value, image })
    // Any property with an image is treated as the colour-swatch image
    if (image && !colorImage) colorImage = image
  }
  // AE charges offer_sale_price at checkout (confirmed empirically 2026-04-23
  // via the BALASHOV garlic chopper: offer=$3.82, sku_price=$8.90, AE cart
  // total used $3.82). sku_price is the strikethrough/original list price,
  // NOT what AE actually bills the buyer. Fall back to sku_price only if
  // offer is missing. NEVER take the max — that produced the $16.70 on a
  // $3.82 product in the first rebuild run.
  const offer = parseFloat(skuRaw.offer_sale_price || '0')
  const regular = parseFloat(skuRaw.sku_price || '0')
  const priceUsd = offer > 0 ? offer : regular
  return {
    skuId: String(skuRaw.sku_id || skuRaw.id || ''),
    skuAttr: String(skuRaw.sku_attr || skuRaw.id || ''),
    priceUsd,
    // `price` kept for backward-compat with UI that reads v.price
    price: priceUsd,
    stock: parseInt(skuRaw.sku_available_stock || '0') || 0,
    // New canonical shape (object, keyed by property name)
    properties: propertiesArray,
    // Flat object view for quick lookup by property name
    propertyMap: properties,
    colorImage,
    image: colorImage,
    label: labelParts.join(' / ') || '',
  }
}

// Compute break-even USD cost for a single variant.
// = (product + shipping) + 10% est. tax on (product + shipping)
// (labelled clearly everywhere it's shown)
export function breakEvenUsd(variantPriceUsd, shippingUsd = DEFAULT_SHIPPING_USD) {
  const product = Math.max(0, Number(variantPriceUsd) || 0)
  const shipping = Math.max(0, Number(shippingUsd) || 0)
  const tax = estimateTax(product + shipping)
  return Math.round((product + shipping + tax) * 100) / 100
}

// Default USD→AUD rate when admin_settings is missing or unreadable.
// Set above the spot rate by design — it's the buffer we keep against FX
// fluctuation between the Stripe charge and AE's USD bill landing on our
// statement. Admin can tune via /admin/settings → "USD to AUD Exchange Rate".
export const DEFAULT_USD_TO_AUD = 1.45

// Read the configured USD→AUD rate from admin_settings. Returns a Number
// (not a string), guaranteed > 0. Falls back to DEFAULT_USD_TO_AUD on any
// error. Cheap query — call it once per request handler and pass the value
// down rather than re-querying inside a loop.
export async function getAudRate() {
  try {
    const { rows } = await sql`SELECT value FROM admin_settings WHERE key = 'usd_to_aud_rate'`
    const v = parseFloat(rows[0]?.value)
    return Number.isFinite(v) && v > 0 ? v : DEFAULT_USD_TO_AUD
  } catch {
    return DEFAULT_USD_TO_AUD
  }
}

// Convert a USD amount to AUD using the supplied rate. Always rounds to
// 2 decimals — never let half-cent drift accumulate across line items.
export function usdToAud(usd, rate) {
  const u = Number(usd) || 0
  const r = Number(rate) || DEFAULT_USD_TO_AUD
  return Math.round(u * r * 100) / 100
}

// Same as usdToAud but returns Stripe-style integer cents (×100).
// For line items and application_fee_amount, which Stripe wants as ints.
export function usdToAudCents(usd, rate) {
  const u = Number(usd) || 0
  const r = Number(rate) || DEFAULT_USD_TO_AUD
  return Math.round(u * r * 100)
}

// Build the derived price summary for a product given its variants[].
export function summarisePricing(variants, shippingUsd = DEFAULT_SHIPPING_USD) {
  const prices = (variants || []).map(v => v.priceUsd).filter(p => p > 0)
  if (prices.length === 0) {
    return { minUsd: 0, maxUsd: 0, breakEvenMinUsd: 0, breakEvenMaxUsd: 0 }
  }
  const minUsd = Math.min(...prices)
  const maxUsd = Math.max(...prices)
  return {
    minUsd,
    maxUsd,
    breakEvenMinUsd: breakEvenUsd(minUsd, shippingUsd),
    breakEvenMaxUsd: breakEvenUsd(maxUsd, shippingUsd),
  }
}
