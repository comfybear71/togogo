// Get full product details from AliExpress DS API
// GET /api/products/details?id=PRODUCT_ID
// Returns: all images, description, variants, shipping options, store info
import { getProductDetails } from '../_lib/suppliers.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { id } = req.query
  if (!id) return res.status(400).json({ error: 'Product ID required (?id=...)' })

  // Strip ae_ prefix if present
  const productId = id.startsWith('ae_') ? id.slice(3) : id

  try {
    const details = await getProductDetails(productId)
    if (!details) {
      return res.status(404).json({ error: 'Product not found or API unavailable' })
    }
    return res.json(details)
  } catch (err) {
    console.error('[ProductDetails] Error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
