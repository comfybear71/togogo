// Break-even pricing helpers — one source of truth for every variant price
// used by imports, rebuilds, and storefront display.
//
// Invariant: everything is USD. No conversion. No markup (for now).
// When we're confident the data is right, we can layer markup on top.
//
// Formula per variant:
//   supplier_cost_usd = sku_price_usd + shipping_usd + tax_buffer
//   sale_price_usd    = supplier_cost_usd            // break-even, no markup
//
// Where tax_buffer approximates AE's actual checkout tax (observed 12–14%).
// Using 14% is conservative for an AU destination.

export const TAX_RATE = 0.14
export const DEFAULT_SHIPPING_USD = 0  // 0 when we don't know — we'd rather
                                        // under-quote and reject at checkout
                                        // than lie about the price

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

// Compute break-even USD cost for a single variant
export function breakEvenUsd(variantPriceUsd, shippingUsd = DEFAULT_SHIPPING_USD) {
  const product = Math.max(0, Number(variantPriceUsd) || 0)
  const shipping = Math.max(0, Number(shippingUsd) || 0)
  const tax = product * TAX_RATE
  return Math.round((product + shipping + tax) * 100) / 100
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
