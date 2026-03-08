import { searchAllSuppliers, groupByProduct, parseSuppliers } from '../_lib/suppliers.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { query, page = 1, category, suppliers: suppliersParam, sort = 'relevance' } = req.query

    if (!query && !category) {
      return res.status(400).json({ error: 'Search query or category is required' })
    }

    const activeSuppliers = parseSuppliers(suppliersParam)
    const { products: rawProducts, hasLiveData } = await searchAllSuppliers(query || category, Number(page), suppliersParam)

    let products = rawProducts

    // Group similar products for price comparison
    products = groupByProduct(products)

    // Sort
    if (sort === 'price_low') {
      products.sort((a, b) => a.totalCost - b.totalCost)
    } else if (sort === 'price_high') {
      products.sort((a, b) => b.totalCost - a.totalCost)
    } else if (sort === 'fastest') {
      products.sort((a, b) => a.deliveryDays - b.deliveryDays)
    } else if (sort === 'margin') {
      products.sort((a, b) => b.suggestedMargin - a.suggestedMargin)
    }

    return res.status(200).json({
      products,
      total: products.length,
      page: Number(page),
      suppliers: activeSuppliers,
      live: hasLiveData,
      message: hasLiveData ? null : 'Showing sample data. Live supplier APIs will be connected soon.',
    })
  } catch (error) {
    console.error('Search API error:', error)
    return res.status(500).json({ error: 'Failed to search products' })
  }
}
