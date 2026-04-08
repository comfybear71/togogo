// Cron job — fetches products from AliExpress feeds and imports into all stores
// Runs every 6 hours via Vercel Cron Jobs
// Each run fetches from different feeds to build variety over time
// ACCURATE PRICING: fetches real shipping cost via freight calculator API
import { sql, ensureSchema } from '../_lib/db.js'
import { searchAliExpress, getProductDetails, calculateFreight } from '../_lib/suppliers.js'

export default async function handler(req, res) {
  // Auth: allow Vercel cron, JWT_SECRET as query param, or admin JWT token
  const authHeader = req.headers.authorization
  const cronSecret = process.env.CRON_SECRET
  const querySecret = req.query.secret

  let authorized = false
  if (authHeader === `Bearer ${cronSecret}`) authorized = true
  if (querySecret === process.env.JWT_SECRET) authorized = true

  // Also allow admin users via JWT token passed as ?secret=
  if (!authorized && querySecret) {
    try {
      const { verifyToken } = await import('../_lib/auth.js')
      const payload = verifyToken(querySecret)
      if (payload && payload.role === 'admin') authorized = true
    } catch {}
  }

  if (!authorized) {
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

    // Expand single terms into multiple variations for more results
    const termVariations = {
      'dress': ['dress', 'summer dress', 'maxi dress', 'party dress', 'casual dress', 'mini dress', 'evening dress', 'floral dress'],
      'womens tops': ['women blouse', 'women t-shirt', 'crop top', 'tank top women', 'camisole', 'women shirt', 'peplum top', 'tunic'],
      'womens jeans': ['women jeans', 'skinny jeans women', 'wide leg jeans', 'mom jeans', 'ripped jeans women', 'high waist jeans'],
      'skirt': ['skirt', 'midi skirt', 'mini skirt', 'pleated skirt', 'denim skirt', 'wrap skirt', 'pencil skirt', 'long skirt'],
      'womens pants': ['women pants', 'palazzo pants', 'wide leg pants women', 'cargo pants women', 'culottes', 'women trousers'],
      'knitwear women': ['women sweater', 'cardigan women', 'pullover women', 'knit top', 'turtleneck women', 'women vest knit'],
      'womens jacket': ['women jacket', 'blazer women', 'women coat', 'denim jacket women', 'windbreaker women', 'puffer jacket women'],
      'lingerie': ['lingerie set', 'bra set', 'women underwear', 'nightgown', 'sleepwear women', 'pajama set women', 'silk robe'],
      'womens shoes': ['women heels', 'women sandals', 'women boots', 'ballet flats', 'women sneakers', 'platform shoes', 'mules women'],
      'toys': ['toys', 'kids toys', 'baby toys', 'educational toy', 'plush toy', 'building blocks', 'action figure'],
      'home garden': ['home decor', 'garden tools', 'wall art', 'vase', 'cushion cover', 'curtain', 'rug'],
      'computer': ['computer', 'laptop stand', 'USB hub', 'webcam', 'monitor stand', 'mouse pad', 'SSD'],
      'jewelry': ['jewelry', 'necklace', 'earrings', 'bracelet', 'ring', 'pendant', 'chain'],
      'beauty': ['beauty', 'makeup', 'skincare', 'face mask', 'lipstick', 'foundation', 'nail art'],
      'sports': ['sports', 'yoga mat', 'fitness', 'water bottle', 'resistance band', 'gym gloves', 'running'],
      'consumer electronics': ['electronics', 'smart watch', 'wireless charger', 'power bank', 'camera', 'drone', 'VR'],
      'shoes': ['shoes', 'sneakers', 'sandals', 'boots', 'slippers', 'loafers', 'heels'],
      'lights': ['lights', 'LED strip', 'desk lamp', 'fairy lights', 'night light', 'solar light', 'ceiling light'],
      'mother kids': ['baby clothes', 'maternity', 'kids shoes', 'baby blanket', 'stroller', 'baby bottle'],
      'mens clothing': ['mens shirt', 'mens jacket', 'mens pants', 'mens hoodie', 'mens shorts', 'mens suit'],
      'leggings': ['leggings', 'yoga pants', 'workout leggings', 'high waist pants', 'gym leggings'],
      'handbag': ['handbag', 'tote bag', 'crossbody bag', 'clutch', 'wallet', 'backpack women'],
      'bikini': ['bikini', 'swimsuit', 'one piece swimsuit', 'beach cover up', 'swim shorts'],
      'kitchen gadget': ['kitchen gadget', 'cooking tools', 'baking', 'food storage', 'knife set', 'cutting board'],
      'pet': ['pet toys', 'dog collar', 'cat bed', 'pet clothes', 'aquarium', 'bird cage'],
      'car accessories': ['car accessories', 'car phone holder', 'car charger', 'car seat cover', 'dash cam'],
      'headphones': ['headphones', 'earbuds', 'bluetooth speaker', 'microphone', 'gaming headset'],
      'phone case': ['phone case', 'screen protector', 'phone holder', 'phone charger', 'phone ring'],
      'tablet stand': ['tablet stand', 'tablet case', 'stylus pen', 'tablet keyboard'],
      'led light': ['LED light', 'RGB light', 'neon sign', 'grow light', 'flashlight', 'lantern'],
      'makeup brush': ['makeup brush', 'makeup sponge', 'eyelash', 'eyebrow', 'concealer', 'mascara'],
    }

    let selectedTerms
    if (customTerm) {
      // Use variations if available, otherwise just the custom term
      const variations = termVariations[customTerm.toLowerCase()] || [customTerm]
      // Limit to 4 variations to stay within Vercel timeout
      selectedTerms = variations.slice(0, 4)
      console.log(`[Cron] Custom search: "${customTerm}" → ${selectedTerms.length} variations`)
    } else {
      const shuffled = [...allTerms].sort(() => Math.random() - 0.5)
      selectedTerms = shuffled.slice(0, 8)
    }

    console.log(`[Cron] Searching: ${selectedTerms.join(', ')}`)

    // Fetch products from feed — try multiple pages for more variety
    let allProducts = []
    const seen = new Set()
    const { rows: existingRows } = await sql`SELECT DISTINCT supplier_product_id FROM user_products LIMIT 10000`
    const existingIds = new Set(existingRows.map(r => r.supplier_product_id))

    for (const term of selectedTerms) {
      // Try pages 1 and 2 for more results
      for (const page of [1, 2]) {
        try {
          const products = await searchAliExpress(term, page)
          for (const p of products) {
            const pid = p.productId || p.id
            if (!seen.has(pid) && !existingIds.has(pid)) {
              seen.add(pid)
              allProducts.push(p)
            }
          }
        } catch (err) {
          console.error(`[Cron] Error fetching "${term}" page ${page}:`, err.message)
        }
      }
    }

    if (allProducts.length === 0) {
      return res.json({ success: true, message: 'No new products found', currentCount })
    }

    // Process up to 20 products per run with accurate pricing
    // Keep batch small to stay within Vercel 60s timeout (freight API is slow)
    const batch = allProducts.slice(0, 20)
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
          // Race against a 5s timeout to avoid Vercel function timeout
          const enrichResult = await Promise.race([
            (async () => {
              const details = await getProductDetails(aeId)
              if (details) realProductCost = details.cost || p.cost || 0
              const freightOptions = await calculateFreight(aeId, 1, 'AU')
              if (freightOptions && freightOptions.length > 0) {
                const cheapest = freightOptions.reduce((min, o) => o.cost < min.cost ? o : min, freightOptions[0])
                shippingCost = cheapest.cost
                console.log(`[Cron] ${aeId}: product=$${realProductCost.toFixed(2)} freight=$${shippingCost.toFixed(2)} (${cheapest.serviceName}, ${cheapest.estimatedDays} days)`)
              } else {
                console.log(`[Cron] ${aeId}: product=$${realProductCost.toFixed(2)} freight=UNKNOWN (using min)`)
              }
              return 'ok'
            })(),
            new Promise(r => setTimeout(() => r('timeout'), 5000))
          ])
          if (enrichResult === 'timeout') {
            console.log(`[Cron] ${aeId}: enrichment timed out, using defaults`)
            enrichFailed++
          } else {
            enriched++
          }
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
      // NO separate tax — AliExpress charges tax at their checkout, included in the total
      // supplier_cost = product + shipping (what we actually pay)
      const taxAUD = 0
      const wholesaleCost = productCostAUD + shippingAUD

      // Store sale price = wholesale × markup (configurable from admin settings or per-store)
      let defaultMarkup = 1.3
      try {
        const { rows: markupRows } = await sql`SELECT value FROM admin_settings WHERE key = 'default_markup'`
        if (markupRows[0]) defaultMarkup = parseFloat(markupRows[0].value) || 1.3
      } catch { /* use default */ }
      const salePrice = Math.ceil(wholesaleCost * defaultMarkup * 100) / 100

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
              price_currency, category, is_active,
              product_rating, orders_count, original_price, discount_percent
            ) VALUES (
              ${store.user_id}, ${p.title}, ${p.title},
              ${p.image || ''}, ${imgArray},
              ${'AliExpress'}, ${p.productId || p.id},
              ${wholesaleCost}, ${salePrice},
              ${productCostAUD}, ${shippingAUD}, ${taxAUD},
              ${'AUD'}, ${p.category || 'General'}, true,
              ${p.rating || 0}, ${p.orders || 0},
              ${p.discount > 0 ? Math.round(salePrice / (1 - p.discount / 100) * 100) / 100 : Math.round(salePrice * 1.25 * 100) / 100},
              ${p.discount || 20}
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

    // Auto-fix prices: ensure all products have correct supplier_cost (no double tax)
    // Read markup from admin settings
    let currentMarkup = 1.3
    try {
      const { rows: mkRows } = await sql`SELECT value FROM admin_settings WHERE key = 'default_markup'`
      if (mkRows[0]) currentMarkup = parseFloat(mkRows[0].value) || 1.3
    } catch {}

    let pricesFixed = 0
    try {
      const { rowCount } = await sql`
        UPDATE user_products
        SET
          tax_amount = 0,
          supplier_cost = ROUND((api_price + shipping_cost)::numeric, 2),
          sale_price = ROUND(((api_price + shipping_cost) * ${currentMarkup})::numeric, 2),
          updated_at = NOW()
        WHERE price_currency = 'AUD'
          AND api_price > 0
          AND (tax_amount > 0 OR supplier_cost != ROUND((api_price + shipping_cost)::numeric, 2))
      `
      pricesFixed = rowCount
      if (pricesFixed > 0) console.log(`[Cron] Auto-fixed ${pricesFixed} product prices (removed tax, applied ${currentMarkup}x markup)`)
    } catch (err) {
      console.error('[Cron] Price fix failed:', err.message)
    }

    const newTotal = currentCount + batch.length
    console.log(`[Cron] Done! ${enriched} enriched, ${enrichFailed} failed. Catalog: ~${newTotal}`)

    return res.json({
      success: true,
      newProducts: batch.length,
      totalImported,
      enriched,
      enrichFailed,
      pricesFixed,
      stores: stores.length,
      catalogSize: newTotal,
    })
  } catch (err) {
    console.error('[Cron] Failed:', err)
    return res.status(500).json({ error: err.message })
  }
}
