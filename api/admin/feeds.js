import { callAPI } from '../_lib/suppliers.js'

export default async function handler(req, res) {
  // Simple auth check
  const secret = req.query.secret || req.headers['x-setup-secret']
  if (secret !== process.env.JWT_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const data = await callAPI('aliexpress.ds.feedname.get', {})
    const respResult = data?.aliexpress_ds_feedname_get_response?.resp_result?.result
    const feeds = respResult?.promos?.promo || []

    // Sort by product count (most products first)
    feeds.sort((a, b) => (b.product_num || 0) - (a.product_num || 0))

    // Find deal/discount related feeds
    const dealKeywords = ['deal', 'discount', 'promo', 'sale', 'flash', 'hot', 'cheap', 'bargain', 'clearance', 'price', 'coupon', 'value', 'budget', 'special', 'choice', 'super']
    const dealFeeds = feeds.filter(f => {
      const name = (f.promo_name || f.feed_name || '').toLowerCase()
      return dealKeywords.some(k => name.includes(k))
    })

    return res.status(200).json({
      total: feeds.length,
      dealFeeds: dealFeeds.length,
      deals: dealFeeds.map(f => ({
        name: f.promo_name || f.feed_name,
        products: f.product_num,
      })),
      all: feeds.map(f => ({
        name: f.promo_name || f.feed_name,
        products: f.product_num,
      })),
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
