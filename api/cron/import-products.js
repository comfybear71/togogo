// Cron job — fetches products from AliExpress feeds and imports into all stores
// Runs every 6 hours via Vercel Cron Jobs
// Each run fetches from different feeds to build variety over time
import { sql, ensureSchema } from '../_lib/db.js'
import { searchAliExpress, fetchBulkProducts } from '../_lib/suppliers.js'

export default async function handler(req, res) {
  // Auth: only allow Vercel cron or secret
  const authHeader = req.headers.authorization
  const cronSecret = process.env.CRON_SECRET
  const querySecret = req.query.secret

  if (authHeader !== `Bearer ${cronSecret}` && querySecret !== process.env.JWT_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  await ensureSchema()

  console.log('[Cron] Starting product import...')

  try {
    // Get all active stores
    const { rows: stores } = await sql`
      SELECT s.user_id, s.subdomain FROM user_stores s WHERE s.status = 'active'
    `
    if (stores.length === 0) {
      return res.json({ success: false, message: 'No active stores' })
    }

    // ?reset=true — clear all products and re-import with correct pricing
    if (req.query.reset === 'true') {
      const { rows: delCount } = await sql`SELECT COUNT(*) as count FROM user_products`
      await sql`DELETE FROM user_products`
      console.log(`[Cron] RESET: Deleted ${delCount[0].count} products for re-import with new pricing`)
    }

    // Get current product count
    const { rows: countRows } = await sql`SELECT COUNT(DISTINCT supplier_product_id) as count FROM user_products`
    const currentCount = parseInt(countRows[0].count)
    console.log(`[Cron] Current unique products in DB: ${currentCount}`)

    // Fetch products from AliExpress — different search terms each run
    // Rotate through terms based on current hour to get variety
    const allTerms = [
      '', // trending/hot products
      'phone case', 'wireless earbuds', 'led light', 'charger', 'cable',
      'sunglasses', 'watch', 'necklace', 'ring', 'bracelet',
      'kitchen gadget', 'home decor', 'organiser', 'pillow', 'blanket',
      'makeup brush', 'skincare', 'beauty tool', 'hair accessories',
      'dog toy', 'pet bowl', 'cat toy', 'pet bed', 'pet accessories',
      'water bottle', 'yoga mat', 'resistance band', 'fitness',
      'car phone mount', 'car accessories', 'dash cam',
      'fidget toy', 'puzzle', 'kids toy', 'plush',
      't-shirt', 'hoodie', 'dress', 'shoes', 'bag',
      'tools', 'drill', 'screwdriver',
      'lamp', 'led strip', 'light',
      'sticker', 'notebook', 'pen',
      'headphones', 'speaker', 'mouse', 'keyboard',
    ]

    // Pick 8 terms based on time rotation
    const hour = new Date().getHours()
    const startIdx = (hour * 3) % allTerms.length
    const selectedTerms = []
    for (let i = 0; i < 8; i++) {
      selectedTerms.push(allTerms[(startIdx + i) % allTerms.length])
    }

    console.log(`[Cron] Searching terms: ${selectedTerms.join(', ')}`)

    // Fetch products for each term
    let allProducts = []
    const seen = new Set()

    // Get existing product IDs to avoid duplicates
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

    console.log(`[Cron] ${allProducts.length} new products to import (skipped ${seen.size - allProducts.length + existingIds.size} existing)`)

    if (allProducts.length === 0) {
      return res.json({ success: true, message: 'No new products found', currentCount })
    }

    // Import into all stores (max 100 per run to avoid timeout)
    const batch = allProducts.slice(0, 100)
    let totalImported = 0

    for (const store of stores) {
      let imported = 0
      for (const p of batch) {
        // Skip products over A$1000 or with no valid price
        if (!p.suggestedPrice || p.suggestedPrice > 1000) continue
        try {
          const imgArray = Array.isArray(p.images) ? p.images : []
          await sql`
            INSERT INTO user_products (
              user_id, title, description, image, images, supplier,
              supplier_product_id, supplier_cost, sale_price,
              category, is_active
            ) VALUES (
              ${store.user_id}, ${p.title}, ${p.title},
              ${p.image || ''}, ${imgArray},
              ${'AliExpress'}, ${p.productId || p.id},
              ${p.cost || 0}, ${p.suggestedPrice || 0},
              ${p.category || 'General'}, true
            )
          `
          imported++
        } catch { /* skip duplicates */ }
      }
      totalImported += imported
      console.log(`[Cron] ${imported} new products -> ${store.subdomain}`)
    }

    // Log to cron history
    try {
      await sql`
        INSERT INTO admin_settings (key, value, category, label)
        VALUES ('last_cron_import', ${JSON.stringify({
          timestamp: new Date().toISOString(),
          newProducts: batch.length,
          totalImported,
          stores: stores.length,
          currentTotal: currentCount + batch.length,
        })}, 'cron', 'Last Cron Import')
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
      `
    } catch { /* non-critical */ }

    const newTotal = currentCount + batch.length
    console.log(`[Cron] Done! Imported ${totalImported} total. Catalog now: ~${newTotal} unique products`)

    return res.json({
      success: true,
      newProducts: batch.length,
      totalImported,
      stores: stores.length,
      catalogSize: newTotal,
    })
  } catch (err) {
    console.error('[Cron] Failed:', err)
    return res.status(500).json({ error: err.message })
  }
}
