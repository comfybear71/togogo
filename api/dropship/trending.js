import {
  searchAliExpress,
  groupByProduct, TRENDING_TERMS,
  parseSuppliers, filterNSFW,
} from '../_lib/suppliers.js'

const SUPPLIER_SEARCH_FNS = {
  'AliExpress': (term) => searchAliExpress(term, 1),
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { category = '', suppliers: suppliersParam } = req.query
    const activeSuppliers = parseSuppliers(suppliersParam)
    const terms = TRENDING_TERMS[category] || TRENDING_TERMS['']

    // Search AliExpress for all trending terms
    const results = await Promise.allSettled(
      activeSuppliers.flatMap(s =>
        SUPPLIER_SEARCH_FNS[s] ? terms.map(term => SUPPLIER_SEARCH_FNS[s](term)) : []
      )
    )

    let products = results
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => r.value)

    const hasLiveData = products.some(p => p._live)

    // Deduplicate by id, group by product for price comparison
    const seen = new Set()
    products = products
      .filter(p => { if (seen.has(p.id)) return false; seen.add(p.id); return true })

    products = groupByProduct(products)

    // Put products with images first, then by margin
    products.sort((a, b) => {
      if (a._bestDeal && !b._bestDeal) return -1
      if (!a._bestDeal && b._bestDeal) return 1
      const aHasImg = a.image && a.image.length > 0 ? 0 : 1
      const bHasImg = b.image && b.image.length > 0 ? 0 : 1
      if (aHasImg !== bHasImg) return aHasImg - bHasImg
      return (b.suggestedMargin || 0) - (a.suggestedMargin || 0)
    })

    // Filter out NSFW/inappropriate products
    products = filterNSFW(products)

    products = products.slice(0, 200)

    return res.status(200).json({ products, live: hasLiveData })
  } catch (error) {
    console.error('Trending API error:', error)
    return res.status(500).json({ error: 'Failed to fetch trending products' })
  }
}
