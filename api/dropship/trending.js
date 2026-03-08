import {
  searchCJ, searchPrintful, searchPrintify, searchGooten,
  getSampleCJProducts, getSamplePrintfulProducts,
  getCuratedTrending, groupByProduct, TRENDING_TERMS,
} from '../_lib/suppliers.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { category = '' } = req.query
    const terms = TRENDING_TERMS[category] || TRENDING_TERMS['']

    // Pick 2 random terms for variety
    const shuffled = [...terms].sort(() => Math.random() - 0.5)
    const searchTerms = shuffled.slice(0, 2)

    // Search all suppliers in parallel
    const results = await Promise.allSettled([
      ...searchTerms.map(term => searchCJ(term, 1)),
      ...searchTerms.map(term => searchPrintful(term)),
      ...searchTerms.map(term => searchPrintify(term)),
      ...searchTerms.map(term => searchGooten(term)),
    ])

    let products = results
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => r.value)

    // If live APIs returned nothing, use sample data + curated
    if (products.length === 0) {
      products = [
        ...getSampleCJProducts(searchTerms[0]),
        ...getSamplePrintfulProducts(searchTerms[0]),
      ]
    }

    // Always merge in curated trending products (they have images)
    const curated = getCuratedTrending(category || null, null)
    const existingIds = new Set(products.map(p => p.id))
    for (const c of curated) {
      if (!existingIds.has(c.id)) {
        products.push(c)
        existingIds.add(c.id)
      }
    }

    // Deduplicate by id, group by product for price comparison, shuffle, limit
    const seen = new Set()
    products = products
      .filter(p => { if (seen.has(p.id)) return false; seen.add(p.id); return true })

    // Group similar products for price comparison
    products = groupByProduct(products)

    // Put products with images first, then shuffle within each group
    products.sort((a, b) => {
      // Best deals first
      if (a._bestDeal && !b._bestDeal) return -1
      if (!a._bestDeal && b._bestDeal) return 1
      // Products with images first
      const aHasImg = a.image && a.image.length > 0 ? 0 : 1
      const bHasImg = b.image && b.image.length > 0 ? 0 : 1
      if (aHasImg !== bHasImg) return aHasImg - bHasImg
      // Then by margin
      return (b.suggestedMargin || 0) - (a.suggestedMargin || 0)
    })

    products = products.slice(0, 30)

    return res.status(200).json({ products })
  } catch (error) {
    console.error('Trending API error:', error)
    return res.status(500).json({ error: 'Failed to fetch trending products' })
  }
}
