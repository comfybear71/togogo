// Real AliExpress text search for store owners' Browse page. Hits
// aliexpress.ds.text.search directly so a copy-paste of an actual AE
// product title returns matching items — the older /api/dropship/search
// matches against our pre-fetched feed pool, which only ever surfaces
// products from a fixed catalogue and explains why pasted titles
// returned irrelevant results.
//
// GET /api/my-shop/search?keyword=ladies+handbag&page=1&sort=orders
//   sort: 'orders' (most ordered) | 'min_price' | 'max_price'
//   minPrice / maxPrice in USD if you want price filtering.
//
// Auth required — search consumes AE rate limit, only signed-in store
// owners get to use it.
import { requireAuth } from '../_lib/auth.js'
import { searchAliExpressDirect } from '../_lib/suppliers.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    await requireAuth(req)
  } catch (err) {
    return res.status(err?.status || 401).json({ error: err?.message || 'Authentication required' })
  }

  const keyword = (req.query.keyword || req.query.q || '').toString().trim()
  if (!keyword) {
    return res.status(400).json({ error: 'keyword parameter required' })
  }

  const page = Math.max(1, parseInt(req.query.page) || 1)
  const options = {
    sort: req.query.sort || 'orders',
    categoryId: req.query.category_id || '',
    minPrice: req.query.min_price || '',
    maxPrice: req.query.max_price || '',
    country: 'AU',
    pageSize: 30,
  }

  try {
    const results = await searchAliExpressDirect(keyword, page, options)
    // Shape the response to match what BrowseProductsPage expects
    // (id with 'ae_' prefix for visual cards; productId for the add
    // endpoint). Legacy /api/dropship/search returns the same shape.
    const products = (results.products || []).map(p => ({
      id: `ae_${p.productId}`,
      productId: p.productId,
      title: p.title,
      image: p.image,
      images: p.images,
      cost: p.cost,
      originalPrice: p.originalPrice,
      currency: p.currency,
      category: p.category,
      categoryId: p.categoryId,
      orders: p.orders,
      rating: p.rating,
      discountPercent: p.discountPercent,
    }))

    return res.json({
      products,
      total: results.total || products.length,
      page,
      keyword,
      sort: options.sort,
      error: results.error || null,
    })
  } catch (err) {
    console.error('[my-shop/search] Error:', err)
    return res.status(500).json({ error: err.message || 'Search failed' })
  }
}
