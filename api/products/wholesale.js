import { getWholesalePricing } from '../_lib/suppliers.js'

export default async function handler(req, res) {
  const productId = req.query.id || req.query.product_id
  if (!productId) {
    return res.status(400).json({ error: 'Missing product ID. Use ?id=PRODUCT_ID' })
  }

  try {
    const wholesale = await getWholesalePricing(productId)

    if (!wholesale || !wholesale.available) {
      return res.status(200).json({
        productId,
        available: false,
        message: 'No wholesale pricing available for this product',
      })
    }

    // Convert USD tiers to AUD for display
    const usdToAud = 1.45 // TODO: read from admin_settings
    const tiersAUD = wholesale.tiers.map(t => ({
      ...t,
      priceAUD: Math.round(t.price * usdToAud * 100) / 100,
    }))

    return res.status(200).json({
      productId,
      available: true,
      tiers: tiersAUD,
      raw: wholesale.rawData,
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
