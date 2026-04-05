// Cron job — fetches products from AliExpress feeds and imports into all stores
// Runs every 6 hours via Vercel Cron Jobs
// Each run fetches from different feeds to build variety over time
// ACCURATE PRICING: fetches real shipping cost via freight calculator API
import { sql, ensureSchema } from '../_lib/db.js'
import { searchAliExpress, getProductDetails, calculateFreight } from '../_lib/suppliers.js'

export default async function handler(req, res) {
  // Auth: only allow Vercel cron or secret
  const authHeader = req.headers.authorization
  const cronSecret = process.env.CRON_SECRET
  const querySecret = req.query.secret

  if (authHeader !== `Bearer ${cronSecret}` && querySecret !== process.env.JWT_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  await ensureSchema()

  console.log('[Cron] Starting product import (accurate pricing mode)...')

  try {
    // Get all active stores
    const { rows: stores } = await sql`
      SELECT s.user_id, s.subdomain FROM user_stores s WHERE s.status = 'active'
    `
    if (stores.length === 0) {
      return res.json({ success: false, message: 'No active stores' })
    }

    // ?reset=true — clear all products and re-import
    if (req.query.reset === 'true') {
      const { rows: delCount } = await sql`SELECT COUNT(*) as count FROM user_products`
      await sql`DELETE FROM user_products`
      console.log(`[Cron] RESET: Deleted ${delCount[0].count} products`)
    }

    // Get current product count
    const { rows: countRows } = await sql`SELECT COUNT(DISTINCT supplier_product_id) as count FROM user_products`
    const currentCount = parseInt(countRows[0].count)
    console.log(`[Cron] Current unique products in DB: ${currentCount}`)

    // Fetch products from AliExpress — rotate search terms
    const allTerms = [
      '', 'phone case', 'wireless earbuds', 'led light', 'charger', 'cable',
      'sunglasses', 'watch', 'necklace', 'ring', 'bracelet',
      'kitchen gadget', 'home decor', 'organiser', 'pillow', 'blanket',
      'makeup brush', 'skincare', 'beauty tool', 'hair accessories',
      'dog toy', 'pet bowl', 'cat toy', 'pet bed',
      'water bottle', 'yoga mat', 'fitness',
      'car phone mount', 'car accessories',
      'fidget toy', 'puzzle', 'kids toy',
      't-shirt', 'hoodie', 'dress', 'shoes', 'bag',
      'tools', 'drill', 'screwdriver',
      'lamp', 'led strip', 'light',
      'headphones', 'speaker', 'mouse', 'keyboard',
    ]

    // Custom term via ?term= parameter, or random selection
    const customTerm = req.query.term || ''
    let selectedTerms
    if (customTerm) {
      selectedTerms = [customTerm]
      console.log(`[Cron] Custom search: "${customTerm}"`)
    } else {
      const shuffled = [...allTerms].sort(() => Math.random() - 0.5)
      selectedTerms = shuffled.slice(0, 8)
    }

    console.log(`[Cron] Searching: ${selectedTerms.join(', ')}`)

    // Fetch products from feed (fast — bulk)
    let allProducts = []
    const seen = new Set()
    const { rows: existingRows } = await sql`SELECT DISTINCT supplier_product_id FROM user_products LIMIT 10000`
    const existingIds = new Set(existingRows.map(r => r.supplier_product_id))

    for (const term of selectedTerms) {
      try {
        const products = await searchAliExpress(term, 1)
        for (const p of products) {
          const pid = p.productId || p.id
          if (!seen.has(pid) && !existingIds.has(pid)) {
            seen.add(pid)
            allProducts.push(p)
          }
        }
      } catch (err) {
        console.error(`[Cron] Error fetching "${term}":`, err.message)
      }
    }

    if (allProducts.length === 0) {
      return res.json({ success: true, message: 'No new products found', currentCount })
    }

    // Process up to 30 products per run with accurate pricing
    const batch = allProducts.slice(0, 30)
    console.log(`[Cron] ${allProducts.length} new products found, processing ${batch.length} with accurate pricing`)

    let totalImported = 0
    let enriched = 0
    let enrichFailed = 0

    for (const p of batch) {
      const aeId = (p.productId || '').replace('ae_', '')

      // Fetch EXACT shipping cost from freight calculator API (no OAuth needed)
      let shippingCost = 0
      let taxRate = 0.18 // 18% tax estimate
      let realProductCost = p.cost || 0

      if (aeId && !aeId.includes('-')) {
        try {
          // Get product details for real cost
          const details = await getProductDetails(aeId)
          if (details) {
            realProductCost = details.cost || p.cost || 0
          }

          // Use freight calculator for EXACT shipping cost to AU
          const freightOptions = await calculateFreight(aeId, 1, 'AU')
          if (freightOptions && freightOptions.length > 0) {
            // Find cheapest shipping option
            const cheapest = freightOptions.reduce((min, o) => o.cost < min.cost ? o : min, freightOptions[0])
            shippingCost = cheapest.cost
            console.log(`[Cron] ${aeId}: product=$${realProductCost.toFixed(2)} freight=$${shippingCost.toFixed(2)} (${cheapest.serviceName}, ${cheapest.estimatedDays} days)`)
          } else {
            console.log(`[Cron] ${aeId}: product=$${realProductCost.toFixed(2)} freight=UNKNOWN (using $2 min)`)
          }
          enriched++
        } catch (err) {
          console.error(`[Cron] Enrichment failed for ${aeId}:`, err.message)
          enrichFailed++
        }
      }

      // Calculate wholesale cost (what ToGoGo actually pays on AliExpress)
      // API returns USD despite target_currency:AUD — convert to real AUD
      // Rate stored in admin_settings — update from admin panel when it changes
      let usdToAud = 1.45
      try {
        const { rows: rateRows } = await sql`SELECT value FROM admin_settings WHERE key = 'usd_to_aud_rate'`
        if (rateRows[0]) usdToAud = parseFloat(rateRows[0].value) || 1.45
      } catch { /* use default */ }
      const productCostAUD = realProductCost * usdToAud
      // Freight calculator returns USD — convert to AUD with minimum A$3
      const minShipping = 3.00
      const shippingAUD = Math.max(shippingCost * usdToAud, minShipping)
      // Tax is ~18% of product cost in AUD
      const taxAUD = productCostAUD * taxRate
      const wholesaleCost = productCostAUD + shippingAUD + taxAUD

      // Store sale price = wholesale × 1.5 (client markup)
      const salePrice = Math.ceil(wholesaleCost * 1.5 * 100) / 100

      // Skip products over A$1000
      if (salePrice > 1000) continue

      // Import into all stores
      for (const store of stores) {
        try {
          const imgArray = Array.isArray(p.images) ? p.images : []
          await sql`
            INSERT INTO user_products (
              user_id, title, description, image, images, supplier,
              supplier_product_id, supplier_cost, sale_price,
              api_price, shipping_cost, tax_amount,
              price_currency, category, is_active
            ) VALUES (
              ${store.user_id}, ${p.title}, ${p.title},
              ${p.image || ''}, ${imgArray},
              ${'AliExpress'}, ${p.productId || p.id},
              ${wholesaleCost}, ${salePrice},
              ${productCostAUD}, ${shippingAUD}, ${taxAUD},
              ${'AUD'}, ${p.category || 'General'}, true
            )
          `
          totalImported++
        } catch { /* skip duplicates */ }
      }

      console.log(`[Cron] → AUD: product=$${productCostAUD.toFixed(2)} ship=$${shippingAUD.toFixed(2)} tax=$${taxAUD.toFixed(2)} wholesale=$${wholesaleCost.toFixed(2)} sale=$${salePrice.toFixed(2)} "${p.title?.slice(0, 50)}"`)
    }

    // Log to cron history
    try {
      await sql`
        INSERT INTO admin_settings (key, value, category, label)
        VALUES ('last_cron_import', ${JSON.stringify({
          timestamp: new Date().toISOString(),
          newProducts: batch.length,
          totalImported,
          enriched,
          enrichFailed,
          stores: stores.length,
          currentTotal: currentCount + batch.length,
        })}, 'cron', 'Last Cron Import')
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
      `
    } catch { /* non-critical */ }

    const newTotal = currentCount + batch.length
    console.log(`[Cron] Done! ${enriched} enriched, ${enrichFailed} failed. Catalog: ~${newTotal}`)

    return res.json({
      success: true,
      newProducts: batch.length,
      totalImported,
      enriched,
      enrichFailed,
      stores: stores.length,
      catalogSize: newTotal,
    })
  } catch (err) {
    console.error('[Cron] Failed:', err)
    return res.status(500).json({ error: err.message })
  }
}
