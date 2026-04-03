// Test endpoint — hit this URL to verify AliExpress API is working
// Visit: https://togogo.me/api/test-aliexpress
// Returns raw product data so you can see images, prices, titles in Vercel logs
import { queryProducts, queryHotProducts, getProductDetails } from './_lib/suppliers.js'

export default async function handler(req, res) {
  const { mode = 'hot', keywords, page = '1' } = req.query

  console.log(`[TEST] AliExpress test — mode=${mode}, keywords=${keywords || '(none)'}, page=${page}`)
  console.log(`[TEST] ALIEXPRESS_APP_KEY set: ${!!process.env.ALIEXPRESS_APP_KEY}`)
  console.log(`[TEST] ALIEXPRESS_APP_SECRET set: ${!!process.env.ALIEXPRESS_APP_SECRET}`)

  try {
    let result

    if (mode === 'hot') {
      result = await queryHotProducts({ page: parseInt(page), pageSize: 10 })
    } else if (mode === 'search') {
      result = await queryProducts({ keywords: keywords || 'phone case', page: parseInt(page), pageSize: 10 })
    } else if (mode === 'details' && keywords) {
      // keywords = comma-separated product IDs
      const details = await getProductDetails(keywords.split(','))
      result = { products: details, total: details.length }
    } else {
      return res.json({ error: 'Use ?mode=hot or ?mode=search&keywords=phone+case or ?mode=details&keywords=PRODUCT_ID' })
    }

    // Log first product fully for debugging
    if (result.products.length > 0) {
      const first = result.products[0]
      console.log(`[TEST] First product:`)
      console.log(`  Title: ${first.title}`)
      console.log(`  Image: ${first.image}`)
      console.log(`  Images count: ${first.images?.length || 0}`)
      console.log(`  Cost: $${first.cost}`)
      console.log(`  Suggested price: $${first.suggestedPrice}`)
      console.log(`  Category: ${first.category}`)
      console.log(`  Orders: ${first.orders}`)
      console.log(`  Affiliate URL: ${first.affiliateUrl?.slice(0, 80)}...`)
    }

    return res.json({
      success: true,
      count: result.products.length,
      total: result.total,
      products: result.products.map(p => ({
        id: p.id,
        title: p.title,
        image: p.image,
        images: p.images,
        cost: p.cost,
        originalPrice: p.originalPrice,
        suggestedPrice: p.suggestedPrice,
        category: p.category,
        orders: p.orders,
        rating: p.rating,
        discount: p.discount,
        affiliateUrl: p.affiliateUrl,
        sourceUrl: p.sourceUrl,
      })),
    })
  } catch (err) {
    console.error(`[TEST] AliExpress test failed:`, err)
    return res.status(500).json({
      success: false,
      error: err.message,
      stack: err.stack?.split('\n').slice(0, 5),
    })
  }
}
