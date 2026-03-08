import { searchCJ, searchPrintful, getSampleCJProducts, getSamplePrintfulProducts, TRENDING_TERMS } from '../_lib/suppliers.js'

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

    const results = await Promise.allSettled([
      ...searchTerms.map(term => searchCJ(term, 1)),
      ...searchTerms.map(term => searchPrintful(term)),
    ])

    let products = results
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => r.value)

    // If live APIs returned nothing, use sample data
    if (products.length === 0) {
      products = [
        ...getSampleCJProducts(searchTerms[0]),
        ...getSamplePrintfulProducts(searchTerms[0]),
      ]
    }

    // Deduplicate, shuffle, limit
    const seen = new Set()
    products = products
      .filter(p => { if (seen.has(p.id)) return false; seen.add(p.id); return true })
      .sort(() => Math.random() - 0.5)
      .slice(0, 20)

    return res.status(200).json({ products })
  } catch (error) {
    console.error('Trending API error:', error)
    return res.status(500).json({ error: 'Failed to fetch trending products' })
  }
}
