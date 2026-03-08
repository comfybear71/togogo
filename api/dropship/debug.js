// Temporary diagnostic endpoint — test each supplier API individually
import { searchCJ, searchAliExpress, searchPrintful, searchPrintify, searchGooten } from '../_lib/suppliers.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const query = req.query.q || 'phone case'
  const results = {}

  // Check which env vars are set
  results.envVars = {
    CJ_DROPSHIPPING_API_KEY: !!process.env.CJ_DROPSHIPPING_API_KEY,
    ALIEXPRESS_APP_KEY: !!process.env.ALIEXPRESS_APP_KEY,
    ALIEXPRESS_APP_SECRET: !!process.env.ALIEXPRESS_APP_SECRET,
    PRINTFUL_API_KEY: !!process.env.PRINTFUL_API_KEY,
    PRINTIFY_API_KEY: !!process.env.PRINTIFY_API_KEY,
    GOOTEN_RECIPE_ID: !!process.env.GOOTEN_RECIPE_ID,
    GOOTEN_PARTNER_BILLING_KEY: !!process.env.GOOTEN_PARTNER_BILLING_KEY,
  }

  // Test each supplier individually
  const suppliers = [
    { name: 'CJ Dropshipping', fn: () => searchCJ(query) },
    { name: 'AliExpress', fn: () => searchAliExpress(query) },
    { name: 'Printful', fn: () => searchPrintful(query) },
    { name: 'Printify', fn: () => searchPrintify(query) },
    { name: 'Gooten', fn: () => searchGooten(query) },
  ]

  for (const { name, fn } of suppliers) {
    const start = Date.now()
    try {
      const products = await fn()
      const liveCount = products.filter(p => p._live).length
      const sampleCount = products.filter(p => !p._live).length
      const withImages = products.filter(p => p.image && p.image.length > 0).length
      results[name] = {
        total: products.length,
        live: liveCount,
        sample: sampleCount,
        withImages,
        ms: Date.now() - start,
        firstProduct: products[0] ? {
          title: products[0].title?.slice(0, 60),
          image: products[0].image ? 'yes' : 'no',
          _live: products[0]._live,
        } : null,
      }
    } catch (error) {
      results[name] = { error: error.message, ms: Date.now() - start }
    }
  }

  return res.status(200).json(results)
}
