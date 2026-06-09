// Query real shipping cost for a product and cache it
import { sql } from '../_lib/db.js'
import { requireAuth } from '../_lib/auth.js'
import { queryDSFreight } from '../_lib/suppliers.js'

export default async function handler(req, res) {
  let user
  try {
    user = await requireAuth(req)
  } catch (err) {
    return res.status(err?.status || 401).json({ error: err?.message || 'Authentication required' })
  }

  // GET — get cached shipping cost or query fresh
  if (req.method === 'GET') {
    const { productId, refresh } = req.query

    if (!productId) {
      return res.status(400).json({ error: 'Product ID required' })
    }

    try {
      // Check if product exists and belongs to user
      const { rows: productRows } = await sql`
        SELECT id, supplier_product_id, shipping_cost_usd, shipping_checked_at
        FROM user_products
        WHERE id = ${productId} AND user_id = ${user.id}
      `

      if (productRows.length === 0) {
        return res.status(404).json({ error: 'Product not found' })
      }

      const product = productRows[0]
      const now = Date.now()
      const cache24h = 24 * 60 * 60 * 1000
      const cacheValid = product.shipping_checked_at &&
                        (now - new Date(product.shipping_checked_at).getTime()) < cache24h

      // If cache is valid and not forcing refresh, return cached value
      if (cacheValid && refresh !== 'true') {
        return res.json({
          success: true,
          shippingUsd: parseFloat(product.shipping_cost_usd || 0),
          cached: true,
          checkedAt: product.shipping_checked_at,
        })
      }

      // Query fresh shipping cost from AliExpress
      const aeProductId = product.supplier_product_id
      if (!aeProductId) {
        return res.status(400).json({ error: 'No AliExpress product ID found' })
      }

      let options
      try {
        options = await queryDSFreight(aeProductId, 'AU', 1)
      } catch (freightErr) {
        console.error(`[product-shipping] queryDSFreight failed for product ${productId}:`, freightErr.message)
        return res.json({
          success: false,
          error: 'AliExpress freight query failed (OAuth token may be expired)',
          cached: false,
          debug: freightErr.message,
        })
      }

      if (!options || options.length === 0) {
        console.warn(`[product-shipping] No shipping options for product ${aeProductId}`)
        return res.json({
          success: false,
          error: 'No shipping options available for this product',
          cached: false,
        })
      }

      // Take cheapest shipping option
      const cheapest = options.reduce((min, opt) =>
        (opt.cost || 0) < (min.cost || 0) ? opt : min
      , options[0])

      const shippingUsd = parseFloat(cheapest.cost || 0)

      // Cache the result
      try {
        await sql`
          UPDATE user_products
          SET shipping_cost_usd = ${shippingUsd},
              shipping_checked_at = NOW(),
              updated_at = NOW()
          WHERE id = ${productId} AND user_id = ${user.id}
        `
      } catch (cacheErr) {
        console.error('Failed to cache shipping cost:', cacheErr.message)
        // Continue anyway, we have the value
      }

      return res.json({
        success: true,
        shippingUsd,
        cached: false,
        checkedAt: new Date().toISOString(),
        details: cheapest,
      })
    } catch (err) {
      console.error('Shipping query error:', err)
      return res.status(500).json({
        success: false,
        error: err.message || 'Failed to query shipping',
      })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
