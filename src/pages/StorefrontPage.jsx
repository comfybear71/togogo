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
  const [view, setView] = useState('grid') // grid | product | cart | checkout | success
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
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
      return true
    })
  }, [storeData?.products, searchQuery, selectedCategory])

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
                <div key={item.id} className={`flex items-center gap-4 rounded-xl ${theme.cardBg} ${theme.cardBorder} p-4 shadow-sm`}>
                  <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                    {item.image ? (
                      <img src={item.image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center"><Package className="h-6 w-6 text-gray-300" /></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium ${theme.textPrimary} truncate`}>{item.title}</p>
                    <p className={`text-sm font-semibold ${theme.textSecondary}`}>${item.price.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => cart.updateQty(item.id, item.quantity - 1)} className={`rounded-lg p-1.5 ${theme.cardBg}`} style={{ backgroundColor: theme.accentLight }}>
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className={`w-6 text-center text-sm font-medium ${theme.textPrimary}`}>{item.quantity}</span>
                    <button onClick={() => cart.updateQty(item.id, item.quantity + 1)} className={`rounded-lg p-1.5 ${theme.cardBg}`} style={{ backgroundColor: theme.accentLight }}>
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className={`w-20 text-right font-semibold ${theme.textPrimary}`}>${(item.price * item.quantity).toFixed(2)}</p>
                  <button onClick={() => cart.remove(item.id)} className={`p-1.5 ${theme.textMuted} hover:text-red-500`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className={`rounded-xl ${theme.cardBg} ${theme.cardBorder} p-5 shadow-sm`}>
              <div className={`flex justify-between text-lg font-bold ${theme.textPrimary} mb-4`}>
                <span>Total</span>
                <span>${cart.total.toFixed(2)}</span>
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

  // ─── Product Grid (default view) ───────────────────────────────────
  return (
    <div className={`min-h-screen ${theme.pageBg} overflow-x-hidden`}>
      <StoreHeader store={store} cart={cart} theme={theme} onCartClick={() => setView('cart')} />

      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] py-16 px-4 text-center">
        <div className="absolute inset-0 opacity-20" style={{ background: `radial-gradient(circle at 50% 50%, ${theme.accent}40, transparent 70%)` }} />
        <h1 className="relative text-4xl font-extrabold tracking-tight md:text-5xl bg-gradient-to-r from-white via-slate-200 to-white bg-clip-text text-transparent animate-pulse" style={{ animationDuration: '3s' }}>
          {store.name}
        </h1>
        <p className="relative mt-3 text-slate-400">Quality products, fast shipping</p>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Search + Filters */}
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center overflow-hidden">
          <div className="relative flex-1 min-w-0">
            <Search className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${theme.textMuted}`} />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full rounded-xl border py-2.5 pl-10 pr-4 text-base ${theme.cardBg} ${theme.textPrimary} focus:outline-none focus:ring-2`}
              style={{ borderColor: theme.accentLight, '--tw-ring-color': theme.accentLight, fontSize: '16px' }}
            />
          </div>
          {storeData.categories.length > 0 && (
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className={`w-full sm:w-auto rounded-xl border px-4 py-2.5 text-base ${theme.cardBg} ${theme.textPrimary} focus:outline-none`}
              style={{ borderColor: theme.accentLight, fontSize: '16px' }}
            >
              <option value="">All Categories ({storeData.products.length})</option>
              {storeData.categories.map((c) => (
                <option key={c.name || c} value={c.name || c}>
                  {c.name || c}{c.count ? ` (${c.count})` : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Products */}
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
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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
                    <p className={`text-lg font-bold ${theme.textPrimary}`}>${(product.price || 0).toFixed(2)}</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); cart.add(product) }}
                      className="rounded-lg p-2 transition-colors hover:text-white"
                      style={{ backgroundColor: theme.accentLight, color: theme.accent }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = theme.accent; e.currentTarget.style.color = '#fff' }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = theme.accentLight; e.currentTarget.style.color = theme.accent }}
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

  useEffect(() => {
    // Use supplierProductId (AliExpress numeric ID) — NOT the DB UUID
    const aeId = product.supplierProductId
      || (product.id || '').replace('ae_', '')
    // Skip if it's a UUID or non-AliExpress product
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
      <div className="mx-auto max-w-5xl px-4 py-8 overflow-x-hidden">
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
                            {v.price > 0 && <span className="text-slate-500">${(v.price || 0).toFixed(2)}</span>}
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
                          // Find a variant that has this property value
                          const matchingVariant = details.variants.find(v =>
                            (v.properties || []).some(p => p.name === groupName && p.value === val)
                          )
                          const img = matchingVariant?.properties?.find(p => p.name === groupName && p.value === val)?.image
                          const isSelected = selectedVariant?.properties?.some(p => p.name === groupName && p.value === val)
                          return (
                            <button key={val} onClick={() => {
                              if (matchingVariant) setSelectedVariant(isSelected ? null : matchingVariant)
                            }}
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
            <div className="flex gap-3 mb-6">
              <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-400 bg-white/[0.05]">
                <Truck className="h-4 w-4" /> Free Shipping
              </div>
              <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-400 bg-white/[0.05]">
                <Shield className="h-4 w-4" /> Buyer Protection
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
              Add to Cart — ${displayPrice.toFixed(2)}
            </button>
          </div>
        </div>

        {/* HTML Description */}
        {details?.description && details.description !== details.title && (
          <div className="mt-10 rounded-2xl bg-[#1e293b] border border-white/[0.06] p-6">
            <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">Product Description</h3>
            {details.description.includes('<') ? (
              <div
                className="prose prose-invert prose-sm max-w-none [&_img]:rounded-lg [&_img]:max-w-full [&_img]:h-auto overflow-x-hidden break-words"
                dangerouslySetInnerHTML={{ __html: details.description }}
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

function StoreHeader({ store, cart, theme, onCartClick }) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#0f172a]/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: theme.accent }}>
            <Store className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold text-white">{store.name}</span>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/auth"
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-slate-300 hover:text-white transition-colors border border-white/[0.08] hover:border-white/[0.15]"
          >
            Sign In
          </a>
          <button
            onClick={onCartClick}
            className="relative flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white transition-colors"
            style={{ backgroundColor: theme.accent }}
          >
            <ShoppingCart className="h-4 w-4" />
            Cart
            {cart.count > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white bg-red-500">
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
              <div key={item.id} className="flex justify-between py-2 text-sm">
                <span className={theme.textSecondary}>{item.title} x{item.quantity}</span>
                <span className={`font-medium ${theme.textPrimary}`}>${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div className={`mt-3 border-t pt-3 flex justify-between text-base font-bold ${theme.textPrimary}`} style={{ borderColor: theme.accentLight }}>
              <span>Total</span>
              <span>${cart.total.toFixed(2)}</span>
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
            {submitting ? 'Placing Order...' : `Place Order — $${cart.total.toFixed(2)}`}
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
