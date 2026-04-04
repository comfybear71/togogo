// Test endpoint — fetches real products from AliExpress DS feeds
// Visit: https://togogo.me/api/test-aliexpress
import { searchAliExpress } from './_lib/suppliers.js'

export default async function handler(req, res) {
  const { q = '' } = req.query

  try {
    console.log(`[TEST] Fetching AliExpress products, query="${q || '(trending)'}"`)
    const products = await searchAliExpress(q, 1)

    console.log(`[TEST] Got ${products.length} products`)
    if (products.length > 0) {
      const p = products[0]
      console.log(`[TEST] First product: "${p.title}"`)
      console.log(`[TEST]   Image: ${p.image}`)
      console.log(`[TEST]   Images: ${p.images?.length || 0} total`)
      console.log(`[TEST]   Cost: $${p.cost} AUD`)
      console.log(`[TEST]   Suggested: $${p.suggestedPrice} AUD`)
      console.log(`[TEST]   Category: ${p.category}`)
      console.log(`[TEST]   Orders: ${p.orders}`)
    }

    return res.json({
      success: true,
      count: products.length,
      products: products.slice(0, 10).map(p => ({
        title: p.title,
        image: p.image,
        images: p.images,
        cost: p.cost,
        originalPrice: p.originalPrice,
        suggestedPrice: p.suggestedPrice,
        category: p.category,
        orders: p.orders,
        rating: p.rating,
        sourceUrl: p.sourceUrl,
      })),
    })
  } catch (err) {
    console.error('[TEST] Error:', err)
    return res.status(500).json({ error: err.message })
  }
}
