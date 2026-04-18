// Admin AliExpress product search — search by keyword, preview, import selected
// GET /api/admin/search-aliexpress?keyword=kitchen+sponge&page=1
// POST /api/admin/search-aliexpress { action: 'import', products: [{ productId, title, image, cost, category }] }
import { sql, ensureSchema } from '../_lib/db.js'
import { requireAdminLite } from '../_lib/auth.js'
import { searchAliExpressDirect } from '../_lib/suppliers.js'

export default async function handler(req, res) {
  try {
    await requireAdminLite(req)
  } catch (err) {
    return res.status(err?.status || 500).json({ error: err?.message || 'Auth error' })
  }

  await ensureSchema()

  // GET — search AliExpress
  if (req.method === 'GET') {
    const keyword = req.query.keyword || req.query.q
    if (!keyword) {
      return res.status(400).json({ error: 'keyword parameter required' })
    }

    const page = parseInt(req.query.page) || 1
    const debug = req.query.debug === '1' || req.query.debug === 'true'
    const options = {
      sort: req.query.sort || 'orders',
      categoryId: req.query.category_id || '',
      minPrice: req.query.min_price || '',
      maxPrice: req.query.max_price || '',
      country: 'AU',
      pageSize: 30,
      debug,
    }

    console.log(`[SearchAE] Searching for "${keyword}" page ${page}, sort: ${options.sort}, debug: ${debug}`)
    const results = await searchAliExpressDirect(keyword, page, options)
    console.log(`[SearchAE] Found ${results.products.length} products for "${keyword}" (error: ${results.error || 'none'})`)

    // Debug mode: return raw AliExpress response for troubleshooting
    if (debug) {
      return res.json({
        keyword,
        page,
        sort: options.sort,
        productsCount: results.products.length,
        total: results.total,
        error: results.error || null,
        debug: results.debug || null,
      })
    }

    // Read markup for price preview
    let markup = 1.25
    let usdToAud = 1.45
    try {
      const { rows } = await sql`SELECT key, value FROM admin_settings WHERE key IN ('default_markup', 'usd_to_aud_rate')`
      for (const r of rows) {
        if (r.key === 'default_markup') markup = parseFloat(r.value) || 1.25
        if (r.key === 'usd_to_aud_rate') usdToAud = parseFloat(r.value) || 1.45
      }
    } catch {}

    // Add AUD pricing preview to each product
    const productsWithPricing = results.products.map(p => {
      const costAUD = Math.round(p.cost * usdToAud * 100) / 100
      const salePrice = Math.ceil(costAUD * markup * 100) / 100
      return {
        ...p,
        costAUD,
        salePrice,
        markup,
      }
    })

    return res.json({
      keyword,
      page,
      total: results.total,
      products: productsWithPricing,
      error: results.error || null,
    })
  }

  // POST — import selected products
  if (req.method === 'POST') {
    const { products } = req.body
    if (!products?.length) {
      return res.status(400).json({ error: 'products array required' })
    }

    let markup = 1.25
    let usdToAud = 1.45
    try {
      const { rows } = await sql`SELECT key, value FROM admin_settings WHERE key IN ('default_markup', 'usd_to_aud_rate')`
      for (const r of rows) {
        if (r.key === 'default_markup') markup = parseFloat(r.value) || 1.25
        if (r.key === 'usd_to_aud_rate') usdToAud = parseFloat(r.value) || 1.45
      }
    } catch {}

    // Get a user_id for the shared catalog
    const { rows: stores } = await sql`SELECT user_id FROM user_stores WHERE status = 'active' LIMIT 1`
    if (!stores[0]) return res.status(400).json({ error: 'No active store found' })
    const userId = stores[0].user_id

    let imported = 0
    let skipped = 0

    for (const p of products) {
      const costAUD = Math.round(p.cost * usdToAud * 100) / 100
      const salePrice = Math.ceil(costAUD * markup * 100) / 100
      const imgArray = Array.isArray(p.images) ? p.images : []

      try {
        await sql`
          INSERT INTO user_products (
            user_id, title, description, image, images, supplier,
            supplier_product_id, supplier_cost, sale_price,
            api_price, shipping_cost, tax_amount,
            price_currency, category, is_active,
            product_rating, orders_count, original_price, discount_percent
          ) VALUES (
            ${userId}, ${p.title}, ${p.title},
            ${p.image || ''}, ${imgArray},
            'AliExpress', ${p.productId},
            ${costAUD}, ${salePrice},
            ${costAUD}, ${0}, ${0},
            'AUD', ${p.category || 'General'}, true,
            ${p.rating || 0}, ${p.orders || 0},
            ${Math.round(salePrice * 1.25 * 100) / 100},
            ${p.discountPercent || 20}
          )
        `
        imported++
      } catch {
        skipped++
      }
    }

    return res.json({ success: true, imported, skipped })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
