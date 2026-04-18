// Verify cart items before checkout — checks each product on AliExpress
// POST /api/storefront/verify-cart { items: [{ productId, skuAttr, quantity }] }
// Returns availability status for each item
import { sql } from '../_lib/db.js'
import { verifyProduct } from '../_lib/suppliers.js'

export default async function handler(req, res) {
  // CORS for subdomain requests
  const origin = req.headers.origin || ''
  const allowedOrigin = origin.endsWith('.togogo.me') || origin.includes('togogo.vercel.app') || origin.includes('localhost')
    ? origin : 'https://togogo.me'
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin)
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { items } = req.body
    if (!items?.length) {
      return res.status(400).json({ error: 'items array required' })
    }

    const results = []
    let allAvailable = true

    // Check each item in parallel (faster than sequential)
    const checks = items.map(async (item) => {
      const aeId = (item.productId || item.supplierProductId || '').replace('ae_', '')
      if (!aeId || aeId.includes('-')) {
        return { productId: item.productId, available: true, reason: 'no_ae_id', message: 'Available' }
      }

      // Get stored supplier_cost for price comparison
      let storedCost = 0
      try {
        const { rows } = await sql`
          SELECT supplier_cost FROM user_products
          WHERE supplier_product_id = ${aeId} AND is_active = true
          LIMIT 1
        `
        if (rows[0]) storedCost = parseFloat(rows[0].supplier_cost || 0)
      } catch { /* continue without stored cost */ }

      const result = await verifyProduct(aeId, item.skuAttr || '', item.quantity || 1, storedCost)

      // Auto-deactivate unavailable products so other customers don't see them
      if (!result.available && ['product_not_found', 'out_of_stock'].includes(result.reason)) {
        try {
          await sql`UPDATE user_products SET is_active = false, updated_at = NOW() WHERE supplier_product_id = ${aeId}`
          console.log(`[VerifyCart] Auto-deactivated product ${aeId}: ${result.reason}`)
        } catch { /* non-critical */ }
      }

      return {
        productId: item.productId,
        title: item.title || '',
        ...result,
      }
    })

    // Wait for all checks with a 10-second overall timeout
    const settled = await Promise.race([
      Promise.all(checks),
      new Promise(resolve => setTimeout(() => resolve(null), 10000)),
    ])

    if (!settled) {
      // Timeout — allow all items (better than blocking checkout)
      return res.json({
        allAvailable: true,
        items: items.map(i => ({ productId: i.productId, available: true, reason: 'timeout', message: 'Available (verification timed out)' })),
      })
    }

    for (const r of settled) {
      results.push(r)
      if (!r.available) allAvailable = false
    }

    return res.json({ allAvailable, items: results })
  } catch (err) {
    console.error('[VerifyCart] Error:', err.message)
    // On error, allow checkout (don't block sales)
    return res.json({
      allAvailable: true,
      items: (req.body?.items || []).map(i => ({ productId: i.productId, available: true, reason: 'error', message: 'Available (could not verify)' })),
    })
  }
}
