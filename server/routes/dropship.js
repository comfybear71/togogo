import { Router } from 'express'
import { requireAuth, supabase } from '../middleware/auth.js'

const router = Router()

// ============================================
// UNIFIED PRODUCT SEARCH — The master gateway
// Searches ALL suppliers through ToGoGo's API keys
// Users never need their own accounts
// ============================================
router.get('/search', async (req, res, next) => {
  try {
    const { query, page = 1, category, supplier, sort = 'relevance' } = req.query

    if (!query && !category) {
      return res.status(400).json({ error: 'Search query or category is required' })
    }

    // Search all suppliers in parallel through our master keys
    const results = await Promise.allSettled([
      searchCJ(query || category, Number(page)),
      searchPrintful(query || category),
    ])

    // Merge and normalise into unified format
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

    res.json({
      products,
      total: products.length,
      page: Number(page),
      suppliers: ['CJ Dropshipping', 'Printful'],
      live: hasLiveData,
      message: hasLiveData ? null : 'Showing sample data. Live supplier APIs will be connected soon.',
    })
  } catch (err) {
    next(err)
  }
})

// Get trending/popular products (no search needed)
router.get('/trending', async (req, res, next) => {
  try {
    const { category = '' } = req.query

    const results = await Promise.allSettled([
      searchCJ(category || 'trending', 1),
      searchPrintful(category || 'bestseller'),
    ])

    const products = results
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => r.value)
      .sort(() => Math.random() - 0.5) // Shuffle for variety
      .slice(0, 20)

    res.json({ products })
  } catch (err) {
    next(err)
  }
})

// Get product categories
router.get('/categories', async (_req, res) => {
  res.json({
    categories: [
      { id: 'electronics', name: 'Electronics & Gadgets', emoji: '📱', popular: true },
      { id: 'fashion', name: 'Fashion & Accessories', emoji: '👗', popular: true },
      { id: 'home', name: 'Home & Garden', emoji: '🏡', popular: true },
      { id: 'beauty', name: 'Beauty & Health', emoji: '💄', popular: true },
      { id: 'toys', name: 'Toys & Hobbies', emoji: '🎮', popular: false },
      { id: 'sports', name: 'Sports & Outdoors', emoji: '⚽', popular: false },
      { id: 'pets', name: 'Pet Supplies', emoji: '🐾', popular: false },
      { id: 'automotive', name: 'Automotive', emoji: '🚗', popular: false },
      { id: 'custom', name: 'Custom / Print-on-Demand', emoji: '🎨', popular: true },
    ],
  })
})

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

// Search CJ Dropshipping products (existing endpoint kept for direct access)
router.get('/cj/search', requireAuth, async (req, res, next) => {
  try {
    const { query, page = 1 } = req.query
    const products = await searchCJ(query, Number(page))
    const hasLiveData = products.length > 0 && products[0]._live

    res.json({
      products,
      source: hasLiveData ? 'cj_api' : 'sample_data',
      message: hasLiveData ? null : 'CJ Dropshipping API key not configured. Showing sample data.',
    })
  } catch (err) {
    next(err)
  }
})

// Search Printful products
router.get('/printful/search', async (req, res, next) => {
  try {
    const { query } = req.query
    const products = await searchPrintful(query)
    const hasLiveData = products.length > 0 && products[0]._live

    res.json({
      products,
      source: hasLiveData ? 'printful_api' : 'sample_data',
      message: hasLiveData ? null : 'Printful API key not configured. Showing sample data.',
    })
  } catch (err) {
    next(err)
  }
})

// Best supplier finder - compare across suppliers
router.post('/compare', requireAuth, async (req, res, next) => {
  try {
    const { productName } = req.body

    const results = await Promise.allSettled([
      searchCJ(productName, 1),
      searchPrintful(productName),
      searchManualSuppliers(productName),
    ])

    const suppliers = results
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => r.value)
      .sort((a, b) => a.cost - b.cost)

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

// ============================================
// SUPPLIER API HELPERS
// All use ToGoGo's master API keys
// ============================================

// --- CJ Dropshipping ---
async function searchCJ(query, page = 1) {
  const apiKey = process.env.CJ_DROPSHIPPING_API_KEY
  if (!apiKey) {
    return getSampleCJProducts(query)
  }

  try {
    const response = await fetch('https://developers.cjdropshipping.com/api2.0/v1/product/list', {
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
    return (data.data?.list || []).map(p => normaliseCJProduct(p))
  } catch {
    return getSampleCJProducts(query)
  }
}

function normaliseCJProduct(p) {
  const cost = p.sellPrice || 0
  const shipping = p.shippingPrice || 0
  const suggestedPrice = Math.ceil((cost + shipping) * 2.5 * 100) / 100 // 2.5x markup
  return {
    id: `cj_${p.pid}`,
    title: p.productNameEn,
    description: p.description || '',
    image: p.productImage || (p.productImageSet?.[0]) || '',
    images: p.productImageSet || [],
    cost,
    shipping,
    totalCost: Math.round((cost + shipping) * 100) / 100,
    suggestedPrice,
    suggestedMargin: Math.round((suggestedPrice - cost - shipping) * 100) / 100,
    deliveryDays: p.logisticsDays || 14,
    supplier: 'CJ Dropshipping',
    supplierLogo: '📦',
    sourceUrl: p.productUrl || '',
    minOrderQty: p.moqNum || 1,
    category: p.categoryName || '',
    _live: true,
  }
}

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

  const match = url.match(/product\/(\d+)/)
  const productId = match?.[1]

  if (!productId) {
    return { title: 'CJ Product', description: 'Could not extract product ID from URL.', images: [], supplierCost: 0, source: 'cj', supplierUrl: url }
  }

  const response = await fetch('https://developers.cjdropshipping.com/api2.0/v1/product/query', {
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

// --- Printful ---
// Cache the catalog since it changes rarely (avoid burning rate limit)
let printfulCatalogCache = null
let printfulCacheTime = 0
const PRINTFUL_CACHE_TTL = 30 * 60 * 1000 // 30 minutes

async function fetchPrintfulCatalog(apiKey) {
  const now = Date.now()
  if (printfulCatalogCache && (now - printfulCacheTime) < PRINTFUL_CACHE_TTL) {
    return printfulCatalogCache
  }

  const response = await fetch('https://api.printful.com/products', {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  })

  if (!response.ok) throw new Error(`Printful API ${response.status}`)

  const data = await response.json()
  printfulCatalogCache = data.result || []
  printfulCacheTime = now
  return printfulCatalogCache
}

async function searchPrintful(query) {
  const apiKey = process.env.PRINTFUL_API_KEY
  if (!apiKey) {
    return getSamplePrintfulProducts(query)
  }

  try {
    const catalog = await fetchPrintfulCatalog(apiKey)
    const q = (query || '').toLowerCase()

    // Filter catalog by search query (match title, type, brand, model)
    const filtered = catalog
      .filter(p => {
        if (p.is_discontinued) return false
        const fields = [p.title, p.type_name, p.brand, p.model].map(f => (f || '').toLowerCase())
        return fields.some(f => f.includes(q) || q.includes(f))
      })
      .slice(0, 15)

    return filtered.map(p => normalisePrintfulProduct(p))
  } catch {
    return getSamplePrintfulProducts(query)
  }
}

function normalisePrintfulProduct(p) {
  // Printful catalog doesn't return pricing — use known base costs by product type
  const baseCost = PRINTFUL_BASE_COSTS[p.type_name] || 15.00
  const shipping = 4.50
  const suggestedPrice = Math.ceil(baseCost * 2.2 * 100) / 100
  const fulfillmentDays = p.avg_fulfillment_time || 3
  const deliveryDays = fulfillmentDays + 4 // fulfillment + shipping transit

  return {
    id: `pf_${p.id}`,
    title: p.title || 'Printful Product',
    description: p.description || `Custom ${p.type_name || 'product'} by ${p.brand || 'Printful'} — print your own design`,
    image: p.image || '',
    images: [p.image].filter(Boolean),
    cost: baseCost,
    shipping,
    totalCost: Math.round((baseCost + shipping) * 100) / 100,
    suggestedPrice,
    suggestedMargin: Math.round((suggestedPrice - baseCost - shipping) * 100) / 100,
    deliveryDays,
    supplier: 'Printful',
    supplierLogo: '🎨',
    sourceUrl: `https://www.printful.com/custom/${p.type_name?.toLowerCase().replace(/\s+/g, '-') || 'products'}`,
    minOrderQty: 1,
    category: p.type_name || 'Custom',
    brand: p.brand || '',
    variantCount: p.variant_count || 0,
    customisable: true,
    _live: true,
  }
}

// Approximate base costs by product type (Printful public pricing)
const PRINTFUL_BASE_COSTS = {
  'T-SHIRT': 9.50,
  'HOODIE': 22.00,
  'TANK TOP': 10.00,
  'LONG SLEEVE SHIRT': 14.00,
  'CROP TOP': 12.00,
  'DRESS': 25.00,
  'LEGGINGS': 22.00,
  'SHORTS': 18.00,
  'SWIMSUIT': 26.00,
  'MUG': 6.50,
  'POSTER': 7.00,
  'CANVAS': 14.00,
  'PHONE CASE': 8.50,
  'TOTE BAG': 10.00,
  'BACKPACK': 28.00,
  'HAT': 12.00,
  'BEANIE': 14.00,
  'SOCKS': 8.00,
  'FACE MASK': 6.00,
  'PILLOW': 14.00,
  'BLANKET': 30.00,
  'STICKER': 2.00,
  'NOTEBOOK': 10.00,
  'MOUSE PAD': 8.00,
  'APRON': 16.00,
  'ONESIE': 12.00,
  'KIDS T-SHIRT': 9.00,
}

// --- AliExpress (placeholder for future) ---
async function importFromAliExpress(url) {
  return {
    title: 'AliExpress Product',
    description: 'AliExpress API integration coming soon. Paste the product details manually for now.',
    images: [],
    supplierCost: 0,
    source: 'aliexpress',
    supplierUrl: url,
  }
}

// --- Manual/DB suppliers ---
async function searchManualSuppliers(query) {
  const { data } = await supabase
    .from('suppliers')
    .select('*')
    .eq('is_active', true)
    .eq('api_type', 'manual')

  return (data || []).map(s => ({
    id: `manual_${s.id}`,
    title: query,
    description: '',
    image: '',
    images: [],
    cost: 0,
    shipping: s.base_shipping_cost || 0,
    totalCost: s.base_shipping_cost || 0,
    suggestedPrice: 0,
    suggestedMargin: 0,
    deliveryDays: s.avg_delivery_days || 14,
    supplier: s.name,
    supplierLogo: '📋',
    sourceUrl: '',
    minOrderQty: 1,
    category: '',
    _live: false,
  }))
}

// ============================================
// SAMPLE DATA (shown when API keys not configured)
// ============================================
function getSampleCJProducts(query) {
  const q = query || 'Product'
  return [
    { id: 'cj_sample_1', title: `${q} - Premium Quality`, description: 'High-quality product with fast shipping from CJ warehouse', image: '', images: [], cost: 5.99, shipping: 2.50, totalCost: 8.49, suggestedPrice: 21.99, suggestedMargin: 13.50, deliveryDays: 12, supplier: 'CJ Dropshipping', supplierLogo: '📦', sourceUrl: '', minOrderQty: 1, category: 'General', _live: false },
    { id: 'cj_sample_2', title: `${q} - Budget Option`, description: 'Affordable option perfect for testing your market', image: '', images: [], cost: 3.49, shipping: 1.99, totalCost: 5.48, suggestedPrice: 14.99, suggestedMargin: 9.51, deliveryDays: 18, supplier: 'CJ Dropshipping', supplierLogo: '📦', sourceUrl: '', minOrderQty: 1, category: 'General', _live: false },
    { id: 'cj_sample_3', title: `${q} - Deluxe Version`, description: 'Premium tier with better packaging and faster shipping', image: '', images: [], cost: 12.99, shipping: 3.50, totalCost: 16.49, suggestedPrice: 39.99, suggestedMargin: 23.50, deliveryDays: 8, supplier: 'CJ Dropshipping', supplierLogo: '📦', sourceUrl: '', minOrderQty: 1, category: 'General', _live: false },
    { id: 'cj_sample_4', title: `${q} - Value Pack (3x)`, description: 'Bundle pack — sell individually for higher margins', image: '', images: [], cost: 9.99, shipping: 3.99, totalCost: 13.98, suggestedPrice: 34.99, suggestedMargin: 21.01, deliveryDays: 14, supplier: 'CJ Dropshipping', supplierLogo: '📦', sourceUrl: '', minOrderQty: 1, category: 'General', _live: false },
  ]
}

function getSamplePrintfulProducts(query) {
  const q = query || 'Custom'
  return [
    { id: 'pf_sample_1', title: `${q} T-Shirt`, description: 'Unisex cotton tee — add your own design', image: '', images: [], cost: 12.50, shipping: 4.50, totalCost: 17.00, suggestedPrice: 29.99, suggestedMargin: 12.99, deliveryDays: 5, supplier: 'Printful', supplierLogo: '🎨', sourceUrl: '', minOrderQty: 1, category: 'Custom', customisable: true, _live: false },
    { id: 'pf_sample_2', title: `${q} Mug`, description: '11oz ceramic mug — full wrap print', image: '', images: [], cost: 7.50, shipping: 4.50, totalCost: 12.00, suggestedPrice: 22.99, suggestedMargin: 10.99, deliveryDays: 5, supplier: 'Printful', supplierLogo: '🎨', sourceUrl: '', minOrderQty: 1, category: 'Custom', customisable: true, _live: false },
    { id: 'pf_sample_3', title: `${q} Phone Case`, description: 'Tough snap case for iPhone/Samsung — your design', image: '', images: [], cost: 10.00, shipping: 4.50, totalCost: 14.50, suggestedPrice: 27.99, suggestedMargin: 13.49, deliveryDays: 5, supplier: 'Printful', supplierLogo: '🎨', sourceUrl: '', minOrderQty: 1, category: 'Custom', customisable: true, _live: false },
    { id: 'pf_sample_4', title: `${q} Poster Print`, description: 'Museum-quality poster on thick matte paper', image: '', images: [], cost: 8.00, shipping: 4.50, totalCost: 12.50, suggestedPrice: 24.99, suggestedMargin: 12.49, deliveryDays: 5, supplier: 'Printful', supplierLogo: '🎨', sourceUrl: '', minOrderQty: 1, category: 'Custom', customisable: true, _live: false },
  ]
}

export default router
