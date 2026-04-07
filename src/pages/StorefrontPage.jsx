import { useState, useEffect, useMemo } from 'react'
import {
  ShoppingCart, Search, X, Plus, Minus, Trash2, Package, ChevronLeft,
  Store, Truck, Shield, Loader2, CheckCircle, AlertCircle,
} from 'lucide-react'
import { getThemeById, DEFAULT_THEME_ID } from '../lib/storefrontThemes'

const API_BASE = import.meta.env.VITE_API_URL || ''

// Theme is now loaded from the store's database record (via API)

// ─── Cart state (in-memory, persisted to sessionStorage per store) ────────
function useCart(subdomain) {
  const key = `tg-cart-${subdomain}`
  const [items, setItems] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(key) || '[]') } catch { return [] }
  })
  const save = (next) => { setItems(next); sessionStorage.setItem(key, JSON.stringify(next)) }

  return {
    items,
    count: items.reduce((s, i) => s + i.quantity, 0),
    total: items.reduce((s, i) => s + i.price * i.quantity, 0),
    add(product) {
      const existing = items.find((i) => i.id === product.id)
      if (existing) save(items.map((i) => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i))
      else save([...items, { id: product.id, title: product.title, image: product.image, price: product.price, quantity: 1 }])
    },
    updateQty(id, qty) {
      if (qty <= 0) save(items.filter((i) => i.id !== id))
      else save(items.map((i) => i.id === id ? { ...i, quantity: qty } : i))
    },
    remove(id) { save(items.filter((i) => i.id !== id)) },
    clear() { save([]) },
  }
}

// ─── Main Storefront Component ────────────────────────────────────────────
export default function StorefrontPage({ subdomain }) {
  const [storeData, setStoreData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('grid') // grid | product | cart | checkout | success | orders
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [priceRange, setPriceRange] = useState('')
  const cart = useCart(subdomain)

  // Always use midnight (dark) theme — stored in database, never localStorage
  const theme = getThemeById(storeData?.store?.themeId || 'midnight')

  useEffect(() => {
    fetch(`${API_BASE}/api/storefront/store?subdomain=${subdomain}`)
      .then((r) => r.ok ? r.json() : Promise.reject('Store not found'))
      .then((data) => setStoreData(data))
      .catch(() => {
        setStoreData(null)
      })
      .finally(() => setLoading(false))

    // Check if returning from Stripe checkout
    const params = new URLSearchParams(window.location.search)
    if (params.get('checkout') === 'success') {
      setView('success')
      cart.clear()
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [subdomain])

  const filteredProducts = useMemo(() => {
    if (!storeData?.products) return []
    return storeData.products.filter((p) => {
      if (searchQuery && !p.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
      if (selectedCategory && p.category !== selectedCategory) return false
      if (priceRange === 'under10' && p.price >= 10) return false
      if (priceRange === '10to20' && (p.price < 10 || p.price >= 20)) return false
      if (priceRange === '20to50' && (p.price < 20 || p.price >= 50)) return false
      if (priceRange === 'over50' && p.price < 50) return false
      return true
    })
  }, [storeData?.products, searchQuery, selectedCategory, priceRange])

  // ─── Loading ──────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f172a]">
      <div className="text-center">
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-[#FF6B35]" />
        <p className="mt-3 text-sm text-slate-400">Loading store...</p>
      </div>
    </div>
  )

  if (!storeData) return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f172a]">
      <div className="text-center max-w-md px-6">
        <Store className="mx-auto h-16 w-16 text-slate-600 mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Store Not Found</h1>
        <p className="text-slate-400 mb-6">
          The store at <strong className="text-white">{subdomain}.togogo.me</strong> doesn't exist or hasn't been set up yet.
        </p>
        <a href="https://togogo.me" className="inline-block rounded-xl px-6 py-3 text-sm font-medium text-white bg-[#FF6B35] hover:bg-[#e85d2c]">
          Visit ToGoGo
        </a>
      </div>
    </div>
  )

  const store = storeData.store

  // ─── Success View ────────────────────────────────────────────────────
  if (view === 'success') return (
    <div className={`flex min-h-screen items-center justify-center ${theme.pageBg} p-6`}>
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#06D6A0]/10">
          <CheckCircle className="h-10 w-10 text-[#06D6A0]" />
        </div>
        <h1 className={`text-2xl font-bold ${theme.textPrimary} mb-2`}>Order Placed!</h1>
        <p className={`${theme.textSecondary} mb-6`}>
          Thank you for your order. {store.owner} will process it shortly and you'll receive updates via email.
        </p>
        <button
          onClick={() => { setView('grid'); cart.clear() }}
          className="rounded-xl px-6 py-3 text-sm font-medium text-white transition-colors"
          style={{ backgroundColor: theme.accent }}
        >
          Continue Shopping
        </button>
      </div>
    </div>
  )

  // ─── Order Tracking View ─────────────────────────────────────────────
  if (view === 'orders') return (
    <OrderTrackingView store={store} theme={theme} subdomain={subdomain} cart={cart} onBack={() => setView('grid')} />
  )

  // ─── Checkout View ──────────────────────────────────────────────────
  if (view === 'checkout') return (
    <CheckoutView
      store={store}
      cart={cart}
      subdomain={subdomain}
      theme={theme}
      onBack={() => setView('cart')}
      onSuccess={() => setView('success')}
    />
  )

  // ─── Product Detail View ────────────────────────────────────────────
  if (view === 'product' && selectedProduct) return (
    <ProductDetailView
      product={selectedProduct}
      store={store}
      cart={cart}
      theme={theme}
      subdomain={subdomain}
      onBack={() => setView('grid')}
      onCartClick={() => setView('cart')}
    />
  )

  // ─── Cart View ──────────────────────────────────────────────────────
  if (view === 'cart') return (
    <div className={`min-h-screen ${theme.pageBg} overflow-x-hidden`}>
      <StoreHeader store={store} cart={cart} theme={theme} onCartClick={() => {}} />
      <div className="mx-auto max-w-2xl px-4 py-8">
        <button
          onClick={() => setView('grid')}
          className={`mb-6 flex items-center gap-1 text-sm ${theme.textSecondary}`}
        >
          <ChevronLeft className="h-4 w-4" /> Continue shopping
        </button>
        <h1 className={`text-2xl font-bold ${theme.textPrimary} mb-6`}>Your Cart ({cart.count})</h1>
        {cart.items.length === 0 ? (
          <div className={`rounded-2xl ${theme.cardBg} ${theme.cardBorder} p-12 text-center shadow-sm`}>
            <ShoppingCart className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <p className={theme.textSecondary}>Your cart is empty</p>
            <button onClick={() => setView('grid')} className="mt-4 text-sm font-medium hover:underline" style={{ color: theme.accent }}>
              Browse products
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-3 mb-6">
              {cart.items.map((item) => (
                <div key={item.id} className={`flex items-center gap-3 rounded-xl ${theme.cardBg} ${theme.cardBorder} p-3 shadow-sm`}>
                  <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                    {item.image ? (
                      <img src={item.image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center"><Package className="h-5 w-5 text-gray-300" /></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${theme.textPrimary} truncate`}>{item.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <button onClick={() => cart.updateQty(item.id, item.quantity - 1)} className="rounded-lg p-1" style={{ backgroundColor: theme.accentLight }}>
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className={`w-5 text-center text-xs font-medium ${theme.textPrimary}`}>{item.quantity}</span>
                      <button onClick={() => cart.updateQty(item.id, item.quantity + 1)} className="rounded-lg p-1" style={{ backgroundColor: theme.accentLight }}>
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <p className={`font-semibold ${theme.textPrimary} text-sm`}>A${(item.price * item.quantity).toFixed(2)}</p>
                  <button onClick={() => cart.remove(item.id)} className={`p-1 ${theme.textMuted} hover:text-red-500`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className={`rounded-xl ${theme.cardBg} ${theme.cardBorder} p-5 shadow-sm`}>
              <div className={`flex justify-between text-lg font-bold ${theme.textPrimary} mb-4`}>
                <span>Total</span>
                <span>A${cart.total.toFixed(2)}</span>
              </div>
              <button
                onClick={() => setView('checkout')}
                className="w-full rounded-xl py-3.5 text-sm font-semibold text-white transition-colors"
                style={{ backgroundColor: theme.accent }}
              >
                Proceed to Checkout
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )

  // Category emoji mapping
  const CATEGORY_EMOJIS = {
    'For you': '',
    'Home & Garden': '🏡',
    'Computer & Office': '💻',
    'Consumer Electronics': '📱',
    'Phones & Telecommunications': '📞',
    'Phones & Telecommunications Accessories': '📞',
    'Sports & Entertainment': '⚽',
    'Toys & Hobbies': '🎮',
    'Beauty & Health': '💄',
    'Jewelry & Accessories': '💎',
    'Women\'s Clothing': '👗',
    'Men\'s Clothing': '👔',
    'Mother & Kids': '👶',
    'Shoes': '👟',
    'Bags & Shoes': '👜',
    'Luggage & Bags': '🧳',
    'Automobiles & Motorcycles': '🚗',
    'Lights & Lighting': '💡',
    'Electronic Components & Supplies': '🔌',
    'Tools': '🔧',
    'Home Improvement': '🏠',
    'Pet Supplies': '🐾',
    'Hair Extensions & Wigs': '💇',
    'Apparel Accessories': '🧢',
    'Education & Office Supplies': '📚',
    'Security & Protection': '🔒',
    'Furniture': '🛋️',
    'Watches': '⌚',
  }
  const getCategoryEmoji = (name) => {
    for (const [key, emoji] of Object.entries(CATEGORY_EMOJIS)) {
      if (name.toLowerCase().includes(key.toLowerCase())) return emoji
    }
    return '📦'
  }

  // Featured products (top 6 most expensive for carousel)
  const featuredProducts = useMemo(() => {
    if (!storeData?.products) return []
    return [...storeData.products].sort((a, b) => (b.price || 0) - (a.price || 0)).slice(0, 6)
  }, [storeData?.products])

  // Top categories for tabs
  const topCategories = useMemo(() => {
    if (!storeData?.categories) return []
    return storeData.categories.slice(0, 6)
  }, [storeData?.categories])

  // ─── Product Grid (default view) ───────────────────────────────────
  return (
    <div className={`min-h-screen ${theme.pageBg} overflow-x-hidden`}>
      <StoreHeader store={store} cart={cart} theme={theme} onCartClick={() => setView('cart')} onTrackOrder={() => setView('orders')} searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] px-4 pt-6 pb-4">
        <div className="absolute inset-0 opacity-20" style={{ background: `radial-gradient(circle at 50% 50%, ${theme.accent}40, transparent 70%)` }} />
        <div className="relative flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white leading-tight">New arrivals,<br/>great discounts</h1>
          </div>
          <div className="flex items-center gap-4 text-right text-sm">
            <div><span className="font-bold text-white">{storeData.products.length}</span><br/><span className="text-slate-400 text-xs">products</span></div>
            <span className="text-slate-600">•</span>
            <div><span className="font-bold text-white">{storeData.categories.length}</span><br/><span className="text-slate-400 text-xs">categories</span></div>
            <span className="text-slate-600">•</span>
            <div><span className="font-bold text-green-400">A$6</span><br/><span className="text-slate-400 text-xs">shipping</span></div>
          </div>
        </div>

        {/* Featured Products Carousel */}
        {featuredProducts.length > 0 && (
          <div className="relative -mx-1 overflow-x-auto scrollbar-hide pb-2">
            <div className="flex gap-3 px-1" style={{ minWidth: 'max-content' }}>
              {featuredProducts.map((product) => (
                <div
                  key={product.id}
                  onClick={() => { setSelectedProduct(product); setView('product') }}
                  className="relative flex-shrink-0 w-36 cursor-pointer group"
                >
                  <div className="relative aspect-square overflow-hidden rounded-xl bg-white/[0.05]">
                    {product.image ? (
                      <img src={product.image} alt={product.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center"><Package className="h-8 w-8 text-slate-600" /></div>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); cart.add(product) }}
                      className="absolute bottom-2 right-2 rounded-full bg-white/90 p-1.5 shadow-lg transition-transform group-hover:scale-110"
                    >
                      <Plus className="h-4 w-4 text-slate-800" />
                    </button>
                  </div>
                  <h3 className="mt-1.5 text-xs font-medium text-white line-clamp-2 leading-tight">{product.title}</h3>
                  <p className="text-sm font-bold" style={{ color: theme.accent }}>A${(product.price || 0).toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Category Tabs + Price Filters (sticky) */}
      <div className="sticky top-[52px] z-30 bg-[#0f172a] border-b border-white/[0.06]">
        {/* Category tabs with emojis */}
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex gap-1 px-3 pt-2 pb-1" style={{ minWidth: 'max-content' }}>
            <button
              onClick={() => setSelectedCategory('')}
              className={`rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${
                selectedCategory === ''
                  ? 'text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              style={selectedCategory === '' ? { backgroundColor: theme.accent } : {}}
            >
              For you
            </button>
            {topCategories.map((c) => {
              const catName = c.name || c
              const emoji = getCategoryEmoji(catName)
              return (
                <button
                  key={catName}
                  onClick={() => setSelectedCategory(catName)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${
                    selectedCategory === catName
                      ? 'text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  style={selectedCategory === catName ? { backgroundColor: theme.accent } : {}}
                >
                  {emoji && <span className="mr-1">{emoji}</span>}{catName}
                </button>
              )
            })}
          </div>
        </div>
        {/* Price range filters */}
        <div className="flex gap-1.5 px-3 pb-2 overflow-x-auto scrollbar-hide">
          {[
            { key: '', label: 'All Prices' },
            { key: 'under10', label: 'Under $10' },
            { key: '10to20', label: '$10–$20' },
            { key: '20to50', label: '$20–$50' },
            { key: 'over50', label: '$50+' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPriceRange(key)}
              className={`rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap transition-all ${
                priceRange === key
                  ? 'text-white'
                  : 'text-slate-500 border border-white/[0.08] hover:border-white/[0.2]'
              }`}
              style={priceRange === key ? { backgroundColor: theme.accent } : {}}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <div className="mx-auto max-w-7xl px-3 py-4">
        {filteredProducts.length === 0 ? (
          <div className={`rounded-2xl ${theme.cardBg} ${theme.cardBorder} py-16 text-center shadow-sm`}>
            <Package className="mx-auto h-16 w-16 text-gray-300 mb-3" />
            <h3 className={`text-lg font-semibold ${theme.textPrimary} mb-1`}>
              {storeData.products.length === 0 ? 'Coming Soon' : 'No matches'}
            </h3>
            <p className={`text-sm ${theme.textSecondary}`}>
              {storeData.products.length === 0
                ? 'This store is setting up — check back soon!'
                : 'Try a different search or category.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                onClick={() => { setSelectedProduct(product); setView('product') }}
                className={`group cursor-pointer overflow-hidden rounded-2xl ${theme.cardBg} ${theme.cardBorder} shadow-sm transition-all hover:shadow-md`}
              >
                <div className="aspect-square overflow-hidden bg-gray-100">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.title}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Package className="h-12 w-12 text-gray-300" />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className={`text-xs ${theme.textMuted} mb-0.5`}>{product.category}</p>
                  <h3 className={`text-sm font-medium ${theme.textPrimary} line-clamp-2 mb-2`}>{product.title}</h3>
                  <div className="flex items-center justify-between">
                    <p className={`text-lg font-bold`} style={{ color: theme.accent }}>A${(product.price || 0).toFixed(2)}</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); cart.add(product) }}
                      className="rounded-full p-2 transition-colors bg-white/[0.05] hover:bg-white/[0.15]"
                      style={{ color: theme.accent }}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Powered by ToGoGo footer */}
      <footer className={`border-t ${theme.footerBg} py-6 text-center`} style={{ borderColor: theme.accentLight }}>
        <p className={`text-xs ${theme.textMuted}`}>
          Powered by <a href="https://togogo.me" className="font-medium hover:underline" style={{ color: theme.accent }}>ToGoGo</a>
        </p>
      </footer>
    </div>
  )
}

// ─── Store Header ─────────────────────────────────────────────────────────
// ─── Product Detail View — fetches full details from AliExpress DS API ──
function ProductDetailView({ product, store, cart, theme, subdomain, onBack, onCartClick }) {
  const [details, setDetails] = useState(null)
  const [loadingDetails, setLoadingDetails] = useState(true)
  const [selectedVariant, setSelectedVariant] = useState(null)
  const [selectedProps, setSelectedProps] = useState({}) // e.g. { Color: "Beige", Size: "S" }

  useEffect(() => {
    // Use the supplier product ID (AliExpress ID) for fetching details
    const aeId = (product.supplierProductId || product.id || '').replace('ae_', '')
    // Skip if it's a UUID (not an AliExpress numeric ID)
    if (!aeId || aeId.includes('-') || aeId.startsWith('cur_')) {
      setLoadingDetails(false)
      return
    }

    fetch(`${API_BASE}/api/products/details?id=${aeId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) setDetails(data)
      })
      .catch(() => {})
      .finally(() => setLoadingDetails(false))
  }, [product.id])

  // Merge details with basic product data — safely handle images
  const safeImages = (arr) => Array.isArray(arr) ? arr : typeof arr === 'string' ? arr.replace(/[{}]/g, '').split(',').filter(Boolean) : []
  const displayProduct = details ? {
    ...product,
    images: safeImages(details.images).length > 0 ? safeImages(details.images) : safeImages(product.images),
    description: details.description || product.description,
    title: details.title || product.title,
  } : product

  // Always use the store's sale_price (product.price) — NOT the AliExpress variant/cost price
  // Variant selection changes the option but the store price is what customers pay
  const displayPrice = product.price || 0
  const hasVariants = details?.variants?.length > 1

  return (
    <div className="min-h-screen bg-[#0f172a] overflow-x-hidden">
      <StoreHeader store={store} cart={cart} theme={theme} onCartClick={onCartClick} />
      <div className="mx-auto max-w-5xl px-4 py-8 overflow-hidden">
        <button
          onClick={onBack}
          className="mb-6 flex items-center gap-1 text-sm text-slate-400 hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" /> Back to products
        </button>
        <div className="grid gap-8 md:grid-cols-2 overflow-hidden">
          {/* Image Gallery */}
          <div className="min-w-0">
            <ProductImageGallery product={displayProduct} />
          </div>

          {/* Product Info */}
          <div>
            <p className="text-sm font-medium mb-1" style={{ color: theme.accent }}>{product.category}</p>
            <h1 className="text-2xl font-bold text-white mb-3">{displayProduct.title}</h1>
            <p className="text-3xl font-bold text-white mb-2">${displayPrice.toFixed(2)} <span className="text-sm text-slate-500">AUD</span></p>

            {product.originalPrice && product.originalPrice > displayPrice && (
              <p className="text-sm text-slate-500 line-through mb-4">${parseFloat(product.originalPrice).toFixed(2)}</p>
            )}

            {/* Rating + Orders */}
            {(product.totalSold > 0 || details?.rating) && (
              <div className="flex items-center gap-3 mb-4 text-xs text-slate-400">
                {details?.rating && <span className="text-[#FFD23F]">{'★'.repeat(Math.round(parseFloat(details.rating)))} {details.rating}</span>}
                {product.totalSold > 0 && <span>{product.totalSold.toLocaleString()} sold</span>}
              </div>
            )}

            {/* Variants (sizes/colors) — grouped by property type */}
            {hasVariants && (() => {
              // Group variants by property types (e.g., Color, Size)
              const propGroups = {}
              details.variants.forEach(v => {
                (v.properties || []).forEach(p => {
                  if (p.name && p.value) {
                    if (!propGroups[p.name]) propGroups[p.name] = new Set()
                    propGroups[p.name].add(p.value)
                  }
                })
              })
              const groupNames = Object.keys(propGroups)

              // Helper: update one property, keep others, then find best matching variant
              const handleSelect = (groupName, val) => {
                const next = { ...selectedProps }
                if (next[groupName] === val) {
                  delete next[groupName] // deselect
                } else {
                  next[groupName] = val
                }
                setSelectedProps(next)
                // Find the variant that matches ALL selected properties
                const match = details.variants.find(v => {
                  const vProps = v.properties || []
                  return Object.entries(next).every(([k, vv]) =>
                    vProps.some(p => p.name === k && p.value === vv)
                  )
                })
                setSelectedVariant(match || null)
              }

              // If we can't parse properties, fall back to flat list
              if (groupNames.length === 0) {
                return (
                  <div className="mb-6">
                    <p className="text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">Options</p>
                    <div className="flex flex-wrap gap-2 overflow-x-auto">
                      {details.variants.map((v, i) => {
                        const label = v.label || `Option ${i + 1}`
                        const isSelected = selectedVariant?.skuId === v.skuId
                        return (
                          <button key={v.skuId} onClick={() => setSelectedVariant(isSelected ? null : v)}
                            className={`flex-shrink-0 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-all ${isSelected ? 'border-[#FF6B35] bg-[#FF6B35]/10 text-white' : 'border-white/[0.08] text-slate-300 hover:border-white/[0.2]'}`}>
                            {v.image && <img src={v.image} alt="" className="h-6 w-6 rounded object-cover" />}
                            <span>{label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              }

              return (
                <div className="mb-6 space-y-4">
                  {groupNames.map(groupName => (
                    <div key={groupName}>
                      <p className="text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">{groupName}</p>
                      <div className="flex flex-wrap gap-2 overflow-x-auto">
                        {[...propGroups[groupName]].map(val => {
                          const img = details.variants.find(v =>
                            (v.properties || []).some(p => p.name === groupName && p.value === val && p.image)
                          )?.properties?.find(p => p.name === groupName && p.value === val)?.image
                          const isSelected = selectedProps[groupName] === val
                          return (
                            <button key={val} onClick={() => handleSelect(groupName, val)}
                              className={`flex-shrink-0 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-all ${isSelected ? 'border-[#FF6B35] bg-[#FF6B35]/10 text-white' : 'border-white/[0.08] text-slate-300 hover:border-white/[0.2]'}`}>
                              {img && <img src={img} alt="" className="h-6 w-6 rounded object-cover" />}
                              <span>{val}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )
            })()}

            {/* Shipping */}
            <div className="flex flex-wrap gap-2 mb-6">
              <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-400 bg-white/[0.05]">
                <Truck className="h-4 w-4" /> Shipping only $6
              </div>
              <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-400 bg-white/[0.05]">
                <Shield className="h-4 w-4" /> Buyer Protection
              </div>
              <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-400 bg-white/[0.05]">
                Price includes GST
              </div>
            </div>

            {/* Shipping options from API */}
            {details?.shipping?.length > 0 && (
              <div className="mb-6">
                <p className="text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">Shipping Options</p>
                <div className="space-y-2">
                  {details.shipping.slice(0, 3).map((s, i) => (
                    <div key={i} className="flex justify-between items-center rounded-lg px-3 py-2 bg-white/[0.03] text-xs">
                      <span className="text-slate-300">{s.serviceName || s.company}</span>
                      <div className="text-right">
                        <span className="text-white">{s.shippingFee > 0 ? `$${s.shippingFee.toFixed(2)}` : 'Free'}</span>
                        {s.estimatedDays && <span className="text-slate-500 ml-2">{s.estimatedDays}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Store info */}
            {details?.store?.name && (
              <p className="text-xs text-slate-500 mb-4">Sold by: {details.store.name}</p>
            )}

            {/* Add to Cart */}
            <button
              onClick={() => { cart.add({ ...product, price: displayPrice }); onCartClick() }}
              className="w-full rounded-xl py-3.5 text-sm font-semibold text-white transition-colors hover:opacity-90"
              style={{ backgroundColor: theme.accent }}
            >
              Add to Cart — A${displayPrice.toFixed(2)}
            </button>
          </div>
        </div>

        {/* HTML Description */}
        {details?.description && details.description !== details.title && (
          <div className="mt-10 rounded-2xl bg-[#1e293b] border border-white/[0.06] p-6">
            <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">Product Description</h3>
            {details.description.includes('<') ? (
              <div
                className="prose prose-invert prose-sm max-w-none [&_img]:rounded-lg [&_img]:max-w-full [&_img]:h-auto [&_img]:my-4 overflow-x-hidden break-words [&_*]:!text-slate-300 [&_h1]:!text-white [&_h2]:!text-white [&_h3]:!text-white [&_strong]:!text-white [&_b]:!text-white"
                dangerouslySetInnerHTML={{ __html: fixDescriptionImages(details.description) }}
              />
            ) : (
              <p className="text-sm text-slate-400 leading-relaxed">{details.description}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function StoreHeader({ store, cart, theme, onCartClick, onTrackOrder, searchQuery, onSearchChange }) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#0f172a]/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-3 py-2.5">
        <div className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: theme.accent }}>
          <Store className="h-4 w-4 text-white" />
        </div>
        {/* Search bar in header */}
        {onSearchChange ? (
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery || ''}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full rounded-full border border-white/[0.08] bg-white/[0.05] py-2 pl-9 pr-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-white/[0.2]"
              style={{ fontSize: '16px' }}
            />
          </div>
        ) : (
          <span className="flex-1 text-lg font-bold text-white">{store.name}</span>
        )}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {onTrackOrder && (
            <button
              onClick={onTrackOrder}
              className="rounded-xl p-2 text-slate-400 hover:text-white transition-colors border border-white/[0.08]"
              title="Track Order"
            >
              <Package className="h-4 w-4" />
            </button>
          )}
          <a
            href="/auth"
            className="flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs text-slate-300 hover:text-white transition-colors border border-white/[0.08]"
          >
            Sign In
          </a>
          <button
            onClick={onCartClick}
            className="relative flex items-center justify-center rounded-xl p-2 text-white transition-colors"
            style={{ backgroundColor: theme.accent }}
          >
            <ShoppingCart className="h-4 w-4" />
            {cart.count > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-4.5 w-4.5 items-center justify-center rounded-full text-[10px] font-bold text-white bg-red-500 min-w-[18px] h-[18px]">
                {cart.count}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  )
}

// ─── Checkout View ────────────────────────────────────────────────────────
function CheckoutView({ store, cart, subdomain, theme, onBack, onSuccess }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', city: '', state: '', zip: '', country: 'Australia' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.email) return setError('Name and email are required')

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`${API_BASE}/api/storefront/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subdomain,
          items: cart.items.map((i) => ({ productId: i.id, quantity: i.quantity })),
          customer: {
            name: form.name,
            email: form.email,
            phone: form.phone,
            address: {
              line1: form.address,
              city: form.city,
              state: form.state,
              zip: form.zip,
              country: form.country,
            },
          },
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create checkout')

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('No checkout URL returned')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass = `rounded-lg border px-3 py-2.5 text-base ${theme.cardBg} ${theme.textPrimary} focus:outline-none`

  return (
    <div className={`min-h-screen ${theme.pageBg}`}>
      <header className={`border-b ${theme.headerBg}`} style={{ borderColor: theme.accentLight }}>
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-4">
          <button onClick={onBack} className="rounded-lg p-1" style={{ backgroundColor: theme.accentLight }}>
            <ChevronLeft className="h-5 w-5" style={{ color: theme.accent }} />
          </button>
          <h1 className={`text-lg font-bold ${theme.headerText}`}>Checkout</h1>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Order Summary */}
          <div className={`rounded-xl ${theme.cardBg} ${theme.cardBorder} p-5 shadow-sm`}>
            <h2 className={`text-sm font-semibold ${theme.textPrimary} mb-3`}>Order Summary</h2>
            {cart.items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 py-3 border-b border-white/[0.06] last:border-0">
                <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                  {item.image ? (
                    <img src={item.image} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center"><Package className="h-5 w-5 text-gray-300" /></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${theme.textPrimary} line-clamp-2`}>{item.title}</p>
                  <p className={`text-xs ${theme.textMuted}`}>Qty: {item.quantity}</p>
                </div>
                <span className={`font-semibold ${theme.textPrimary} text-sm`}>A${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div className={`mt-3 border-t pt-3 space-y-2`} style={{ borderColor: theme.accentLight }}>
              <div className={`flex justify-between text-sm ${theme.textSecondary}`}>
                <span>Subtotal</span>
                <span>A${cart.total.toFixed(2)}</span>
              </div>
              <div className={`flex justify-between text-sm text-emerald-400`}>
                <span>Shipping</span>
                <span>A$6.00</span>
              </div>
              <div className={`flex justify-between text-base font-bold ${theme.textPrimary} pt-2 border-t`} style={{ borderColor: theme.accentLight }}>
                <span>Total</span>
                <span>A${(cart.total + 6).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Contact Details */}
          <div className={`rounded-xl ${theme.cardBg} ${theme.cardBorder} p-5 shadow-sm`}>
            <h2 className={`text-sm font-semibold ${theme.textPrimary} mb-4`}>Contact Details</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <input type="text" placeholder="Full Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} style={{ borderColor: theme.accentLight }} required />
              <input type="email" placeholder="Email *" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} style={{ borderColor: theme.accentLight }} required />
              <input type="tel" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={`col-span-full ${inputClass}`} style={{ borderColor: theme.accentLight }} />
            </div>
          </div>

          {/* Shipping Address */}
          <div className={`rounded-xl ${theme.cardBg} ${theme.cardBorder} p-5 shadow-sm`}>
            <h2 className={`text-sm font-semibold ${theme.textPrimary} mb-4`}>Shipping Address</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <input type="text" placeholder="Street Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={`col-span-full ${inputClass}`} style={{ borderColor: theme.accentLight }} />
              <input type="text" placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={inputClass} style={{ borderColor: theme.accentLight }} />
              <input type="text" placeholder="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className={inputClass} style={{ borderColor: theme.accentLight }} />
              <input type="text" placeholder="Postcode" value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} className={inputClass} style={{ borderColor: theme.accentLight }} />
              <input type="text" placeholder="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className={inputClass} style={{ borderColor: theme.accentLight }} />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl py-3.5 text-sm font-semibold text-white disabled:opacity-50 transition-colors"
            style={{ backgroundColor: theme.accent }}
          >
            {submitting ? 'Placing Order...' : `Place Order — A$${(cart.total + 6).toFixed(2)}`}
          </button>

          <p className={`text-center text-xs ${theme.textMuted}`}>
            Powered by <a href="https://togogo.me" className="hover:underline" style={{ color: theme.accent }}>ToGoGo</a> — Secure checkout
          </p>
        </form>
      </div>
    </div>
  )
}

// ─── Product Image Gallery — shows all images with thumbnails ──────────
// Fix AliExpress description HTML: lazy-loaded images, protocol-relative URLs
function fixDescriptionImages(html) {
  return html
    // Move data-src to src (AliExpress lazy loading)
    .replace(/<img([^>]*?)data-src="([^"]+)"([^>]*?)>/gi, (match, before, url, after) => {
      const fixedUrl = url.startsWith('//') ? 'https:' + url : url
      // Remove any existing empty/placeholder src
      const cleaned = (before + after).replace(/src="[^"]*"/gi, '')
      return `<img${cleaned} src="${fixedUrl}">`
    })
    // Fix protocol-relative URLs in remaining src attributes
    .replace(/src="\/\//g, 'src="https://')
    // Fix images with empty src that have data-lazy-src or similar
    .replace(/<img([^>]*?)data-lazy-src="([^"]+)"([^>]*?)>/gi, (match, before, url, after) => {
      const fixedUrl = url.startsWith('//') ? 'https:' + url : url
      const cleaned = (before + after).replace(/src="[^"]*"/gi, '')
      return `<img${cleaned} src="${fixedUrl}">`
    })
}

function ProductImageGallery({ product }) {
  const [selectedIdx, setSelectedIdx] = useState(0)
  // Safely handle images — could be array, string, or null from DB
  const rawImages = Array.isArray(product.images) ? product.images
    : typeof product.images === 'string' ? product.images.replace(/[{}]/g, '').split(',').filter(Boolean)
    : []
  const images = rawImages.length > 0
    ? [...new Set(rawImages)].filter(Boolean)
    : product.image ? [product.image] : []

  if (images.length === 0) {
    return (
      <div className="aspect-square rounded-2xl bg-[#1e293b] flex items-center justify-center">
        <Package className="h-20 w-20 text-slate-600" />
      </div>
    )
  }

  return (
    <div className="w-full min-w-0 max-w-full">
      {/* Main image */}
      <div className="aspect-square overflow-hidden rounded-2xl bg-[#1e293b] mb-3 w-full">
        <img
          src={images[selectedIdx] || images[0]}
          alt={product.title}
          className="h-full w-full object-contain"
          onError={(e) => { e.target.style.display = 'none' }}
        />
      </div>
      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setSelectedIdx(i)}
              className={`flex-shrink-0 h-16 w-16 rounded-lg overflow-hidden border-2 transition-all ${
                i === selectedIdx ? 'border-[#FF6B35] ring-2 ring-[#FF6B35]/30' : 'border-white/[0.08] hover:border-white/[0.2]'
              }`}
            >
              <img src={img} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Order Tracking View ──────────────────────────────────────────────
function OrderTrackingView({ store, theme, subdomain, cart, onBack }) {
  const [email, setEmail] = useState('')
  const [orderRef, setOrderRef] = useState('')
  const [orders, setOrders] = useState(null)
  const [customer, setCustomer] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function lookupOrders(e) {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ email })
      if (orderRef) params.set('orderRef', orderRef)
      else params.set('subdomain', subdomain)

      const res = await fetch(`${API_BASE}/api/storefront/customer?${params}`)
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Order not found')
        setOrders(null)
        return
      }

      setOrders(data.orders || [])
      setCustomer(data.customer || null)
    } catch {
      setError('Failed to look up orders. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const statusConfig = {
    pending: { color: 'text-yellow-400', bg: 'bg-yellow-400/10', label: 'Pending' },
    pending_payment: { color: 'text-orange-400', bg: 'bg-orange-400/10', label: 'Awaiting Payment' },
    processing: { color: 'text-blue-400', bg: 'bg-blue-400/10', label: 'Processing' },
    shipped: { color: 'text-purple-400', bg: 'bg-purple-400/10', label: 'Shipped' },
    delivered: { color: 'text-green-400', bg: 'bg-green-400/10', label: 'Delivered' },
    cancelled: { color: 'text-red-400', bg: 'bg-red-400/10', label: 'Cancelled' },
    refunded: { color: 'text-zinc-400', bg: 'bg-zinc-400/10', label: 'Refunded' },
  }

  return (
    <div className="min-h-screen bg-[#0f172a] overflow-x-hidden">
      <StoreHeader store={store} cart={cart} theme={theme} onCartClick={onBack} />
      <div className="mx-auto max-w-2xl px-4 py-8">
        <button onClick={onBack} className="mb-6 flex items-center gap-1 text-sm text-slate-400 hover:text-white">
          <ChevronLeft className="h-4 w-4" /> Back to store
        </button>

        <div className="mb-8 text-center">
          <Package className="mx-auto h-12 w-12 text-slate-500 mb-3" />
          <h2 className="text-2xl font-bold text-white mb-1">Track Your Order</h2>
          <p className="text-sm text-slate-400">Enter your email to see your orders from {store.name}</p>
        </div>

        <form onSubmit={lookupOrders} className="mb-8 space-y-3">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Your email address"
            required
            className="w-full rounded-xl border border-white/[0.08] bg-[#0a0a0a] px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-[#FF6B35] focus:outline-none"
          />
          <input
            type="text"
            value={orderRef}
            onChange={e => setOrderRef(e.target.value)}
            placeholder="Order reference (optional — e.g. TG-XXXXX)"
            className="w-full rounded-xl border border-white/[0.08] bg-[#0a0a0a] px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-[#FF6B35] focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || !email}
            className="w-full rounded-xl py-3 text-sm font-semibold text-white transition-colors disabled:opacity-50"
            style={{ backgroundColor: theme.accent }}
          >
            {loading ? 'Looking up...' : 'Find My Orders'}
          </button>
        </form>

        {error && (
          <div className="mb-6 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-center">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {customer && (
          <div className="mb-6 rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
            <p className="text-sm text-slate-400">Welcome back, <span className="text-white font-medium">{customer.name}</span></p>
            <p className="text-xs text-slate-500 mt-1">{customer.order_count} order{customer.order_count !== 1 ? 's' : ''} · ${parseFloat(customer.total_spent || 0).toFixed(2)} AUD total</p>
          </div>
        )}

        {orders && orders.length === 0 && (
          <div className="text-center py-12">
            <Package className="mx-auto h-10 w-10 text-slate-600 mb-3" />
            <p className="text-slate-400">No orders found for this email.</p>
          </div>
        )}

        {orders && orders.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Your Orders ({orders.length})</h3>
            {orders.map(order => {
              const sc = statusConfig[order.status] || statusConfig.pending
              return (
                <div key={order.id} className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
                  <div className="flex items-start gap-4">
                    {order.product_image && (
                      <img src={order.product_image} alt="" className="h-16 w-16 rounded-lg object-cover flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{order.product_title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">Ref: {order.order_ref} · {new Date(order.created_at).toLocaleDateString()}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${sc.bg} ${sc.color}`}>
                          {sc.label}
                        </span>
                        <span className="text-sm font-semibold text-white">${parseFloat(order.sale_price).toFixed(2)}</span>
                      </div>
                      {order.tracking_number && (
                        <div className="mt-2 flex items-center gap-2">
                          <Truck className="h-3.5 w-3.5 text-slate-500" />
                          <span className="text-xs text-slate-400">Tracking: </span>
                          {order.tracking_url ? (
                            <a href={order.tracking_url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium" style={{ color: theme.accent }}>{order.tracking_number}</a>
                          ) : (
                            <span className="text-xs font-medium text-white">{order.tracking_number}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
