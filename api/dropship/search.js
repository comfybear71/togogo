import { searchCJ, searchPrintful } from '../_lib/suppliers.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { query, page = 1, category, supplier, sort = 'relevance' } = req.query

    if (!query && !category) {
      return res.status(400).json({ error: 'Search query or category is required' })
    }

    const results = await Promise.allSettled([
      searchCJ(query || category, Number(page)),
      searchPrintful(query || category),
    ])

    let products = results
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => r.value)

    // Filter by supplier if requested
    if (supplier) {
      products = products.filter(p => p.supplier === supplier)
    }

    // Sort
    if (sort === 'price_low') {
      products.sort((a, b) => a.cost - b.cost)
    } else if (sort === 'price_high') {
      products.sort((a, b) => b.cost - a.cost)
    } else if (sort === 'fastest') {
      products.sort((a, b) => a.deliveryDays - b.deliveryDays)
    } else if (sort === 'margin') {
      products.sort((a, b) => b.suggestedMargin - a.suggestedMargin)
    }

    const hasLiveData = results.some(r =>
      r.status === 'fulfilled' && r.value.length > 0 && r.value[0]._live
    )

    return res.status(200).json({
      products,
      total: products.length,
      page: Number(page),
      suppliers: ['CJ Dropshipping', 'Printful'],
      live: hasLiveData,
      message: hasLiveData ? null : 'Showing sample data. Live supplier APIs will be connected soon.',
    })
  } catch (error) {
    console.error('Search API error:', error)
    return res.status(500).json({ error: 'Failed to search products' })
  }
}
