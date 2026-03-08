// Shared supplier logic for Vercel serverless functions
// This mirrors server/routes/dropship.js but works in serverless context

// --- CJ Dropshipping ---
// In serverless, token can't persist across invocations reliably,
// but Vercel keeps warm instances for ~5 min, so caching still helps
let cjAccessToken = null
let cjTokenExpiry = 0

async function getCJAccessToken() {
  const apiKey = process.env.CJ_DROPSHIPPING_API_KEY
  if (!apiKey) return null

  const now = Date.now()
  if (cjAccessToken && cjTokenExpiry > now + 86400000) {
    return cjAccessToken
  }

  const response = await fetch('https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey }),
  })

  if (!response.ok) throw new Error(`CJ auth failed: ${response.status}`)

  const data = await response.json()
  if (!data.data?.accessToken) throw new Error(`CJ auth error: ${data.message || 'no token'}`)

  cjAccessToken = data.data.accessToken
  cjTokenExpiry = data.data.accessTokenExpiryDate
    ? new Date(data.data.accessTokenExpiryDate).getTime()
    : now + 14 * 86400000

  return cjAccessToken
}

export async function searchCJ(query, page = 1) {
  const apiKey = process.env.CJ_DROPSHIPPING_API_KEY
  if (!apiKey) return getSampleCJProducts(query)

  try {
    const token = await getCJAccessToken()
    if (!token) return getSampleCJProducts(query)

    const response = await fetch('https://developers.cjdropshipping.com/api2.0/v1/product/list', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CJ-Access-Token': token,
      },
      body: JSON.stringify({
        productNameEn: query,
        pageNum: page,
        pageSize: 20,
      }),
    })

    if (!response.ok) throw new Error('CJ API error')

    const data = await response.json()
    const products = (data.data?.list || []).map(p => normaliseCJProduct(p))

    if (products.length === 0) return getSampleCJProducts(query)
    return products
  } catch {
    return getSampleCJProducts(query)
  }
}

function normaliseCJProduct(p) {
  const cost = p.sellPrice || 0
  const shipping = p.shippingPrice || 0
  const suggestedPrice = Math.ceil((cost + shipping) * 2.5 * 100) / 100
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

// --- Printful ---
let printfulCatalogCache = null
let printfulCacheTime = 0
const PRINTFUL_CACHE_TTL = 30 * 60 * 1000

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

export async function searchPrintful(query) {
  const apiKey = process.env.PRINTFUL_API_KEY
  if (!apiKey) return getSamplePrintfulProducts(query)

  try {
    const catalog = await fetchPrintfulCatalog(apiKey)
    const q = (query || '').toLowerCase().trim()

    if (!q || q.length < 2) {
      const popular = catalog.filter(p => !p.is_discontinued).slice(0, 10)
      return popular.map(p => normalisePrintfulProduct(p))
    }

    const words = q.split(/\s+/).filter(w => w.length >= 2)

    const filtered = catalog
      .filter(p => {
        if (p.is_discontinued) return false
        const text = [p.title, p.type_name, p.brand, p.model]
          .map(f => (f || '').toLowerCase())
          .join(' ')
        return words.some(w => text.includes(w)) || text.includes(q)
      })
      .slice(0, 15)

    if (filtered.length === 0 && words.length > 0) {
      const loose = catalog
        .filter(p => {
          if (p.is_discontinued) return false
          const text = [p.title, p.type_name].map(f => (f || '').toLowerCase()).join(' ')
          return text.includes(words[0]) || text.includes(q.slice(0, 3))
        })
        .slice(0, 10)
      return loose.map(p => normalisePrintfulProduct(p))
    }

    return filtered.map(p => normalisePrintfulProduct(p))
  } catch {
    return getSamplePrintfulProducts(query)
  }
}

const PRINTFUL_BASE_COSTS = {
  'T-SHIRT': 9.50, 'HOODIE': 22.00, 'TANK TOP': 10.00,
  'LONG SLEEVE SHIRT': 14.00, 'CROP TOP': 12.00, 'DRESS': 25.00,
  'LEGGINGS': 22.00, 'SHORTS': 18.00, 'SWIMSUIT': 26.00,
  'MUG': 6.50, 'POSTER': 7.00, 'CANVAS': 14.00,
  'PHONE CASE': 8.50, 'TOTE BAG': 10.00, 'BACKPACK': 28.00,
  'HAT': 12.00, 'BEANIE': 14.00, 'SOCKS': 8.00,
  'FACE MASK': 6.00, 'PILLOW': 14.00, 'BLANKET': 30.00,
  'STICKER': 2.00, 'NOTEBOOK': 10.00, 'MOUSE PAD': 8.00,
  'APRON': 16.00, 'ONESIE': 12.00, 'KIDS T-SHIRT': 9.00,
}

function normalisePrintfulProduct(p) {
  const baseCost = PRINTFUL_BASE_COSTS[p.type_name] || 15.00
  const shipping = 4.50
  const suggestedPrice = Math.ceil(baseCost * 2.2 * 100) / 100
  const fulfillmentDays = p.avg_fulfillment_time || 3
  const deliveryDays = fulfillmentDays + 4

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

// --- Sample data ---
export function getSampleCJProducts(query) {
  const q = query || 'Product'
  return [
    { id: 'cj_sample_1', title: `${q} - Premium Quality`, description: 'High-quality product with fast shipping from CJ warehouse', image: '', images: [], cost: 5.99, shipping: 2.50, totalCost: 8.49, suggestedPrice: 21.99, suggestedMargin: 13.50, deliveryDays: 12, supplier: 'CJ Dropshipping', supplierLogo: '📦', sourceUrl: '', minOrderQty: 1, category: 'General', _live: false },
    { id: 'cj_sample_2', title: `${q} - Budget Option`, description: 'Affordable option perfect for testing your market', image: '', images: [], cost: 3.49, shipping: 1.99, totalCost: 5.48, suggestedPrice: 14.99, suggestedMargin: 9.51, deliveryDays: 18, supplier: 'CJ Dropshipping', supplierLogo: '📦', sourceUrl: '', minOrderQty: 1, category: 'General', _live: false },
    { id: 'cj_sample_3', title: `${q} - Deluxe Version`, description: 'Premium tier with better packaging and faster shipping', image: '', images: [], cost: 12.99, shipping: 3.50, totalCost: 16.49, suggestedPrice: 39.99, suggestedMargin: 23.50, deliveryDays: 8, supplier: 'CJ Dropshipping', supplierLogo: '📦', sourceUrl: '', minOrderQty: 1, category: 'General', _live: false },
    { id: 'cj_sample_4', title: `${q} - Value Pack (3x)`, description: 'Bundle pack — sell individually for higher margins', image: '', images: [], cost: 9.99, shipping: 3.99, totalCost: 13.98, suggestedPrice: 34.99, suggestedMargin: 21.01, deliveryDays: 14, supplier: 'CJ Dropshipping', supplierLogo: '📦', sourceUrl: '', minOrderQty: 1, category: 'General', _live: false },
  ]
}

export function getSamplePrintfulProducts(query) {
  const q = query || 'Custom'
  return [
    { id: 'pf_sample_1', title: `${q} T-Shirt`, description: 'Unisex cotton tee — add your own design', image: '', images: [], cost: 12.50, shipping: 4.50, totalCost: 17.00, suggestedPrice: 29.99, suggestedMargin: 12.99, deliveryDays: 5, supplier: 'Printful', supplierLogo: '🎨', sourceUrl: '', minOrderQty: 1, category: 'Custom', customisable: true, _live: false },
    { id: 'pf_sample_2', title: `${q} Mug`, description: '11oz ceramic mug — full wrap print', image: '', images: [], cost: 7.50, shipping: 4.50, totalCost: 12.00, suggestedPrice: 22.99, suggestedMargin: 10.99, deliveryDays: 5, supplier: 'Printful', supplierLogo: '🎨', sourceUrl: '', minOrderQty: 1, category: 'Custom', customisable: true, _live: false },
    { id: 'pf_sample_3', title: `${q} Phone Case`, description: 'Tough snap case for iPhone/Samsung — your design', image: '', images: [], cost: 10.00, shipping: 4.50, totalCost: 14.50, suggestedPrice: 27.99, suggestedMargin: 13.49, deliveryDays: 5, supplier: 'Printful', supplierLogo: '🎨', sourceUrl: '', minOrderQty: 1, category: 'Custom', customisable: true, _live: false },
    { id: 'pf_sample_4', title: `${q} Poster Print`, description: 'Museum-quality poster on thick matte paper', image: '', images: [], cost: 8.00, shipping: 4.50, totalCost: 12.50, suggestedPrice: 24.99, suggestedMargin: 12.49, deliveryDays: 5, supplier: 'Printful', supplierLogo: '🎨', sourceUrl: '', minOrderQty: 1, category: 'Custom', customisable: true, _live: false },
  ]
}

// --- Trending terms ---
export const TRENDING_TERMS = {
  '': ['phone case', 'led light', 't-shirt', 'jewellery', 'mug'],
  electronics: ['wireless earbuds', 'phone case', 'led strip light', 'portable charger'],
  fashion: ['sunglasses', 'watch', 'jewellery', 'necklace'],
  home: ['led light', 'organiser', 'kitchen gadget', 'pillow'],
  beauty: ['makeup brush', 'skincare', 'hair accessories', 'beauty'],
  toys: ['fidget toy', 'puzzle', 'RC car', 'plush toy'],
  sports: ['water bottle', 'yoga mat', 'resistance band', 'gym bag'],
  pets: ['dog toy', 'pet bed', 'cat toy', 'pet bowl'],
  automotive: ['car phone mount', 'car light', 'car organiser', 'dash cam'],
  custom: ['t-shirt', 'mug', 'phone case', 'hoodie', 'poster'],
}

// --- Categories ---
export const CATEGORIES = [
  { id: 'electronics', name: 'Electronics & Gadgets', emoji: '📱', popular: true },
  { id: 'fashion', name: 'Fashion & Accessories', emoji: '👗', popular: true },
  { id: 'home', name: 'Home & Garden', emoji: '🏡', popular: true },
  { id: 'beauty', name: 'Beauty & Health', emoji: '💄', popular: true },
  { id: 'toys', name: 'Toys & Hobbies', emoji: '🎮', popular: false },
  { id: 'sports', name: 'Sports & Outdoors', emoji: '⚽', popular: false },
  { id: 'pets', name: 'Pet Supplies', emoji: '🐾', popular: false },
  { id: 'automotive', name: 'Automotive', emoji: '🚗', popular: false },
  { id: 'custom', name: 'Custom / Print-on-Demand', emoji: '🎨', popular: true },
]
