import {
  searchCJ, searchAliExpress, searchPrintful, searchPrintify, searchGooten,
  getSampleCJProducts, getSampleAliExpressProducts, getSamplePrintfulProducts, getSamplePrintifyProducts, getSampleGootenProducts,
  getCuratedTrending, groupByProduct, TRENDING_TERMS,
  parseSuppliers, getSampleForSuppliers,
} from '../_lib/suppliers.js'

const SUPPLIER_SEARCH_FNS = {
  'CJ Dropshipping': (term) => searchCJ(term, 1),
  'AliExpress': (term) => searchAliExpress(term, 1),
  'Printful': (term) => searchPrintful(term),
  'Printify': (term) => searchPrintify(term),
  'Gooten': (term) => searchGooten(term),
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { category = '', suppliers: suppliersParam } = req.query
    const activeSuppliers = parseSuppliers(suppliersParam)
    const terms = TRENDING_TERMS[category] || TRENDING_TERMS['']

    // Pick 2 random terms for variety
    const shuffled = [...terms].sort(() => Math.random() - 0.5)
    const searchTerms = shuffled.slice(0, 2)

    // Only search selected suppliers
    const results = await Promise.allSettled(
      activeSuppliers.flatMap(s =>
        SUPPLIER_SEARCH_FNS[s] ? searchTerms.map(term => SUPPLIER_SEARCH_FNS[s](term)) : []
      )
    )

    let products = results
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => r.value)

    const hasLiveData = products.some(p => p._live)

    // If live APIs returned nothing, use sample data from selected suppliers
    if (products.length === 0) {
      products = getSampleForSuppliers(activeSuppliers, searchTerms[0])
    }

    // Merge curated trending products (they have images) — only from active suppliers
    const curated = getCuratedTrending(category || null, null)
    const existingIds = new Set(products.map(p => p.id))
    for (const c of curated) {
      if (!existingIds.has(c.id) && activeSuppliers.includes(c.supplier)) {
        products.push(c)
        existingIds.add(c.id)
      }
    }

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

    products = products.slice(0, 30)

    return res.status(200).json({ products, live: hasLiveData })
  } catch (error) {
    console.error('Trending API error:', error)
    return res.status(500).json({ error: 'Failed to fetch trending products' })
  }
}
