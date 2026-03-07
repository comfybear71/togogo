import { Router } from 'express'
import { requireAuth, supabase } from '../middleware/auth.js'

const router = Router()

// Import product from supplier URL
router.post('/import', requireAuth, async (req, res, next) => {
  try {
    const { url, supplierType } = req.body

    let productData

    if (supplierType === 'cj' || url.includes('cjdropshipping.com')) {
      productData = await importFromCJ(url)
    } else if (url.includes('aliexpress.com')) {
      productData = await importFromAliExpress(url)
    } else {
      // Manual import fallback
      productData = {
        title: 'Imported Product',
        description: 'Product imported from external supplier. Please edit details.',
        images: [],
        supplierCost: 0,
        supplierUrl: url,
        source: 'manual',
      }
    }

    res.json(productData)
  } catch (err) {
    next(err)
  }
})

// Search CJ Dropshipping products
router.get('/cj/search', requireAuth, async (req, res, next) => {
  try {
    const { query, page = 1 } = req.query
    const apiKey = process.env.CJ_DROPSHIPPING_API_KEY

    if (!apiKey) {
      return res.json({
        products: getSampleProducts(query),
        source: 'sample_data',
        message: 'CJ Dropshipping API key not configured. Showing sample data.',
      })
    }

    const response = await fetch(`https://developers.cjdropshipping.com/api2.0/v1/product/list`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CJ-Access-Token': apiKey,
      },
      body: JSON.stringify({
        productNameEn: query,
        pageNum: page,
        pageSize: 20,
      }),
    })

    if (!response.ok) throw new Error('CJ API error')

    const data = await response.json()
    const products = (data.data?.list || []).map(p => ({
      id: p.pid,
      title: p.productNameEn,
      description: p.description || '',
      images: p.productImageSet || [],
      supplierCost: p.sellPrice || 0,
      shippingCost: p.shippingPrice || 0,
      deliveryDays: p.logisticsDays || 14,
      source: 'cj',
      sourceUrl: p.productUrl,
      minOrderQty: p.moqNum || 1,
    }))

    res.json({ products })
  } catch (err) {
    next(err)
  }
})

// Best supplier finder - compare across suppliers
router.post('/compare', requireAuth, async (req, res, next) => {
  try {
    const { productName } = req.body

    // Query multiple supplier APIs in parallel
    const results = await Promise.allSettled([
      searchCJ(productName),
      searchManualSuppliers(productName),
    ])

    const suppliers = results
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => r.value)
      .sort((a, b) => (a.unitCost + a.shippingCost) - (b.unitCost + b.shippingCost))

    // Mark the best option
    if (suppliers.length > 0) {
      suppliers[0].recommended = true
    }

    res.json({ suppliers })
  } catch (err) {
    next(err)
  }
})

// Get saved suppliers for user
router.get('/suppliers', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    res.json(data)
  } catch (err) {
    next(err)
  }
})

// Helper functions
async function importFromCJ(url) {
  const apiKey = process.env.CJ_DROPSHIPPING_API_KEY
  if (!apiKey) {
    return {
      title: 'CJ Dropshipping Product',
      description: 'Configure CJ API key to auto-import product details.',
      images: [],
      supplierCost: 0,
      source: 'cj',
      supplierUrl: url,
    }
  }

  // Extract product ID from URL
  const match = url.match(/product\/(\d+)/)
  const productId = match?.[1]

  if (!productId) {
    return { title: 'CJ Product', description: 'Could not extract product ID from URL.', images: [], supplierCost: 0, source: 'cj', supplierUrl: url }
  }

  const response = await fetch(`https://developers.cjdropshipping.com/api2.0/v1/product/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'CJ-Access-Token': apiKey },
    body: JSON.stringify({ pid: productId }),
  })

  const data = await response.json()
  const p = data.data

  return {
    title: p?.productNameEn || 'CJ Product',
    description: p?.description || '',
    images: p?.productImageSet || [],
    supplierCost: p?.sellPrice || 0,
    shippingCost: p?.shippingPrice || 0,
    source: 'cj',
    supplierUrl: url,
  }
}

async function importFromAliExpress(url) {
  // AliExpress affiliate API requires approval - return manual import
  return {
    title: 'AliExpress Product',
    description: 'Paste the product details manually or configure AliExpress API access.',
    images: [],
    supplierCost: 0,
    source: 'aliexpress',
    supplierUrl: url,
  }
}

async function searchCJ(query) {
  const apiKey = process.env.CJ_DROPSHIPPING_API_KEY
  if (!apiKey) return getSampleProducts(query).map(p => ({ ...p, supplier: 'CJ Dropshipping' }))

  try {
    const response = await fetch('https://developers.cjdropshipping.com/api2.0/v1/product/list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'CJ-Access-Token': apiKey },
      body: JSON.stringify({ productNameEn: query, pageNum: 1, pageSize: 5 }),
    })
    const data = await response.json()
    return (data.data?.list || []).map(p => ({
      supplier: 'CJ Dropshipping',
      productName: p.productNameEn,
      unitCost: p.sellPrice || 0,
      shippingCost: p.shippingPrice || 0,
      deliveryDays: p.logisticsDays || 14,
      minOrderQty: p.moqNum || 1,
      rating: 4.2,
    }))
  } catch {
    return []
  }
}

async function searchManualSuppliers(query) {
  const { data } = await supabase
    .from('suppliers')
    .select('*')
    .eq('is_active', true)
    .eq('api_type', 'manual')

  return (data || []).map(s => ({
    supplier: s.name,
    productName: query,
    unitCost: 0,
    shippingCost: s.base_shipping_cost,
    deliveryDays: s.avg_delivery_days,
    minOrderQty: 1,
    rating: 0,
  }))
}

function getSampleProducts(query) {
  return [
    { id: 'sample-1', title: `${query} - Premium Quality`, supplierCost: 5.99, shippingCost: 2.50, deliveryDays: 12, source: 'sample' },
    { id: 'sample-2', title: `${query} - Budget Option`, supplierCost: 3.49, shippingCost: 1.99, deliveryDays: 18, source: 'sample' },
    { id: 'sample-3', title: `${query} - Deluxe Version`, supplierCost: 12.99, shippingCost: 3.50, deliveryDays: 8, source: 'sample' },
  ]
}

export default router
