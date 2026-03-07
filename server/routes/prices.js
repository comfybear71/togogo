import { Router } from 'express'
import { requireAuth, supabase } from '../middleware/auth.js'

const router = Router()

/**
 * Price Aggregation Service
 *
 * This service coordinates checking prices across multiple retailer APIs.
 * In production, this would be called by a cron job (node-cron) multiple times per day.
 *
 * Supported retailer API integrations:
 * - Amazon Product Advertising API
 * - eBay Browse API
 * - Google Shopping API
 * - Affiliate networks (CJ, ShareASale, etc.)
 * - Direct retailer feeds (CSV/XML)
 */

// Trigger a price check for all active deals (called by cron or admin)
router.post('/check-all', requireAuth, async (req, res, next) => {
  try {
    // Get all active retailers
    const { data: retailers } = await supabase
      .from('retailers')
      .select('*')
      .eq('is_active', true)

    if (!retailers?.length) {
      return res.json({ message: 'No active retailers configured', checked: 0 })
    }

    // Get all active deals to check
    const { data: deals } = await supabase
      .from('deals')
      .select('*, product:products(name, barcode)')
      .eq('in_stock', true)

    let checked = 0
    let updated = 0
    const errors = []

    for (const deal of (deals || [])) {
      try {
        const retailer = retailers.find(r => r.id === deal.retailer_id)
        if (!retailer) continue

        const newPrice = await checkPrice(deal, retailer)
        if (newPrice !== null && newPrice !== deal.price) {
          // Update the deal price
          await supabase
            .from('deals')
            .update({
              price: newPrice,
              original_price: deal.price > newPrice ? deal.price : deal.original_price,
              last_checked_at: new Date().toISOString(),
              deal_score: calculateDealScore(newPrice, deal.original_price),
            })
            .eq('id', deal.id)

          // Record in price history
          await supabase
            .from('price_history')
            .insert({ deal_id: deal.id, price: newPrice })

          // Check if any watchlist items should trigger alerts
          await checkWatchlistAlerts(deal, newPrice)
          updated++
        } else {
          // Just update last_checked_at
          await supabase
            .from('deals')
            .update({ last_checked_at: new Date().toISOString() })
            .eq('id', deal.id)
        }
        checked++
      } catch (err) {
        errors.push({ deal_id: deal.id, error: err.message })
      }
    }

    res.json({ checked, updated, errors: errors.length, errorDetails: errors.slice(0, 10) })
  } catch (err) {
    next(err)
  }
})

// Check price for a single product across all retailers
router.post('/check/:productId', async (req, res, next) => {
  try {
    const { productId } = req.params

    const { data: product } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single()

    if (!product) {
      return res.status(404).json({ error: 'Product not found' })
    }

    const { data: retailers } = await supabase
      .from('retailers')
      .select('*')
      .eq('is_active', true)

    const results = []
    for (const retailer of (retailers || [])) {
      try {
        const price = await searchRetailer(product, retailer)
        if (price) results.push({ retailer, ...price })
      } catch {
        // Skip failed retailers
      }
    }

    res.json({ product, prices: results.sort((a, b) => a.price - b.price) })
  } catch (err) {
    next(err)
  }
})

// Get list of supported retailers
router.get('/retailers', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('retailers')
      .select('id, name, domain, country, logo_url, is_active')
      .eq('is_active', true)
      .order('name')

    if (error) throw error
    res.json(data || [])
  } catch (err) {
    next(err)
  }
})

/**
 * Check price from a specific retailer.
 * Each retailer type has its own API integration.
 */
async function checkPrice(deal, retailer) {
  const config = retailer.api_config || {}

  switch (retailer.api_type) {
    case 'api':
      return await checkViaAPI(deal, retailer, config)
    case 'affiliate':
      return await checkViaAffiliate(deal, retailer, config)
    case 'scrape':
      return await checkViaScrape(deal, retailer, config)
    default:
      return null
  }
}

/**
 * Check price via retailer's API (Amazon PA-API, eBay Browse API, etc.)
 */
async function checkViaAPI(deal, retailer, config) {
  const domain = retailer.domain?.toLowerCase()

  // Amazon Product Advertising API
  if (domain?.includes('amazon')) {
    const apiKey = process.env.AMAZON_PA_API_KEY
    const apiSecret = process.env.AMAZON_PA_API_SECRET
    const partnerTag = process.env.AMAZON_PARTNER_TAG
    if (!apiKey) return null

    // In production: use Amazon PA-API v5 to search/lookup by ASIN or keyword
    // For now, return null (price unchanged)
    return null
  }

  // eBay Browse API
  if (domain?.includes('ebay')) {
    const token = process.env.EBAY_API_TOKEN
    if (!token) return null

    // In production: use eBay Browse API to search and get current prices
    return null
  }

  // Google Shopping via SerpAPI or similar
  if (config.provider === 'google_shopping') {
    const serpKey = process.env.SERPAPI_KEY
    if (!serpKey) return null

    // In production: use SerpAPI Google Shopping endpoint
    return null
  }

  return null
}

/**
 * Check price via affiliate network feed
 */
async function checkViaAffiliate(deal, retailer, config) {
  // Affiliate networks provide product feeds (CSV/XML) that can be parsed
  // Examples: CJ Affiliate, ShareASale, Rakuten, Impact
  return null
}

/**
 * Check price via web scraping (last resort, use responsibly)
 */
async function checkViaScrape(deal, retailer, config) {
  // Web scraping should be done responsibly:
  // - Respect robots.txt
  // - Rate limit requests
  // - Use proper User-Agent
  // - Cache results
  return null
}

/**
 * Search a retailer for a product and return price info
 */
async function searchRetailer(product, retailer) {
  // In production, this would search the retailer's API for the product
  // using barcode (EAN/UPC), product name, or brand + name
  return null
}

/**
 * Calculate how good a deal is (0-100 score)
 */
function calculateDealScore(currentPrice, originalPrice) {
  if (!originalPrice || originalPrice <= 0 || currentPrice >= originalPrice) return 50
  const discount = ((originalPrice - currentPrice) / originalPrice) * 100
  return Math.min(Math.round(50 + discount), 100)
}

/**
 * Check if any watchlist users should be alerted about a price change
 */
async function checkWatchlistAlerts(deal, newPrice) {
  // Get all watchlist entries for this product with target prices
  const { data: watchers } = await supabase
    .from('watchlist')
    .select('*')
    .eq('product_id', deal.product_id)

  for (const watcher of (watchers || [])) {
    // Alert if price dropped below target
    if (watcher.target_price && newPrice <= watcher.target_price) {
      await supabase.from('price_alerts').insert({
        user_id: watcher.user_id,
        deal_id: deal.id,
        watchlist_id: watcher.id,
        alert_type: 'price_drop',
        message: `Price dropped to $${newPrice.toFixed(2)} (your target: $${watcher.target_price.toFixed(2)})`,
      })
    }
    // Also alert on significant drops (>10%)
    else if (newPrice < deal.price * 0.9) {
      await supabase.from('price_alerts').insert({
        user_id: watcher.user_id,
        deal_id: deal.id,
        watchlist_id: watcher.id,
        alert_type: 'price_drop',
        message: `Price dropped ${Math.round(((deal.price - newPrice) / deal.price) * 100)}% to $${newPrice.toFixed(2)}`,
      })
    }
  }
}

export default router
