import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  ShoppingCart, Search, X, Plus, Minus, Trash2, Package, ChevronLeft, ChevronRight,
  Store, Truck, Shield, Loader2, CheckCircle, AlertCircle, Star, Share2, Check, Copy,
  Mail, MessageCircle, Facebook, Twitter, MessageSquare,
} from 'lucide-react'
import { getThemeById, DEFAULT_THEME_ID } from '../lib/storefrontThemes'
import { splitBrand } from '../lib/brand'

const API_BASE = import.meta.env.VITE_API_URL || ''

// Theme is now loaded from the store's database record (via API)

// ─── Cart state (in-memory, persisted to sessionStorage per store) ────────
function useCart(subdomain) {
  const key = `tg-cart-${subdomain}`
  const [items, setItems] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(key) || '[]') } catch { return [] }
  })
  const save = (next) => { setItems(next); sessionStorage.setItem(key, JSON.stringify(next)) }

  // Cart items are keyed by "productId::skuId" so different variants of the
  // same product (e.g. Pink vs Blue) are separate rows and never collide.
  // For products without variants, skuId is null and the key is just the id.
  const rowKey = (productId, skuId) => `${productId}::${skuId || ''}`

  return {
    items,
    count: items.reduce((s, i) => s + i.quantity, 0),
    total: items.reduce((s, i) => s + i.price * i.quantity, 0),
    shippingTotal: items.reduce((s, i) => s + (i.shipping || 0) * i.quantity, 0),
    add(product) {
      const key = rowKey(product.id, product.skuId)
      const existing = items.find((i) => rowKey(i.id, i.skuId) === key)
      if (existing) {
        save(items.map((i) => rowKey(i.id, i.skuId) === key ? { ...i, quantity: i.quantity + 1 } : i))
      } else {
        save([...items, {
          id: product.id,
          title: product.title,
          image: product.variantImage || product.image,
          price: product.price,                     // AUD (post-markup, server-converted)
          shipping: product.shipping || 0,
          quantity: 1,
          // Variant identity — flows all the way to AE order.create
          skuId: product.skuId || null,
          skuAttr: product.skuAttr || null,
          variantLabel: product.variantLabel || '',
          variantPriceUsd: product.variantPriceUsd || null,
          supplierProductId: product.supplierProductId || null,
        }])
      }
    },
    updateQty(id, skuId, qty) {
      const key = rowKey(id, skuId)
      if (qty <= 0) save(items.filter((i) => rowKey(i.id, i.skuId) !== key))
      else save(items.map((i) => rowKey(i.id, i.skuId) === key ? { ...i, quantity: qty } : i))
    },
    remove(id, skuId) {
      const key = rowKey(id, skuId)
      save(items.filter((i) => rowKey(i.id, i.skuId) !== key))
    },
    clear() { save([]) },
  }
}

// ─── Share button ─────────────────────────────────────────────────────────
// Share a product link to messaging / social. Uses the OS share sheet
// via Web Share API on mobile (one tap → Messages, WhatsApp, email,
// the lot). Falls back on desktop to a small popover with copy-link
// + explicit social buttons. Always shares the storefront subdomain
// URL so the customer who opens the link lands in the SAME shop.
function ShareButton({ product, subdomain, theme, size = 'md' }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const ref = useRef(null)

  const url = product?.id
    ? `https://${subdomain}.togogo.me/product/${product.id}`
    : `https://${subdomain}.togogo.me`
  const title = product?.title || `Check out this product`
  const text = product?.title
    ? `Found this on ${subdomain}.togogo.me — ${product.title}`
    : `Check out this shop on ToGoGo`

  // Close popover on click-outside (desktop fallback only)
  useEffect(() => {
    if (!open) return
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  // Detect a touch / mobile device — pointer:coarse covers iOS, Android
  // and Windows tablets; matchMedia is supported on every browser we
  // care about. Falls back to the popover on anything else.
  // We deliberately gate Web Share on this rather than on
  // navigator.share alone because Chrome desktop on Windows reports
  // navigator.share = function but opens a Windows share sheet that
  // doesn't include Facebook / X / SMS — customers who tested PC
  // share couldn't even copy the link. Desktop = popover, always.
  const isTouchDevice =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(pointer: coarse)').matches

  async function onClick(e) {
    e.preventDefault()
    e.stopPropagation()
    // Native share sheet ONLY on touch devices — covers WhatsApp,
    // Messages, email, AirDrop, system contacts in one prompt and
    // can attach the image File for richer previews. Desktop falls
    // through to the popover so customers see an explicit choice
    // of Facebook / X / WhatsApp / Email / SMS / Copy link.
    if (isTouchDevice && typeof navigator !== 'undefined' && navigator.share) {
      try {
        const shareData = { title, text, url }
        if (product?.image && typeof navigator.canShare === 'function') {
          try {
            const imgRes = await fetch(product.image, { mode: 'cors' })
            if (imgRes.ok) {
              const blob = await imgRes.blob()
              const ext = (blob.type.split('/')[1] || 'jpg').split('+')[0]
              const file = new File([blob], `product.${ext}`, { type: blob.type || 'image/jpeg' })
              if (navigator.canShare({ files: [file] })) {
                shareData.files = [file]
              }
            }
          } catch { /* CORS / network — share text+url only */ }
        }
        await navigator.share(shareData)
        return
      } catch (err) {
        // User cancelled — silent. Any other rejection falls through
        // to the popover so they have an alternative.
        if (err && err.name === 'AbortError') return
      }
    }
    setOpen(v => !v)
  }

  function copyLink(e) {
    e.preventDefault()
    e.stopPropagation()
    try {
      navigator.clipboard?.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* no-op */ }
  }

  // Build share intents that work without OAuth or SDKs.
  const enc = encodeURIComponent
  // Plain href share intents — every platform supports a URL-based
  // share without needing their SDK. SMS uses the sms: scheme which
  // Android & iOS open in Messages; on desktop browsers it prompts
  // the user to pick a handler (often nothing, hence we tag it
  // "(mobile)"). X (formerly Twitter) takes both `text` and `url`.
  const targets = [
    { key: 'fb',    label: 'Facebook', Icon: Facebook,      href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}` },
    { key: 'x',     label: 'X (Twitter)', Icon: Twitter,    href: `https://twitter.com/intent/tweet?url=${enc(url)}&text=${enc(title)}` },
    { key: 'wa',    label: 'WhatsApp', Icon: MessageCircle, href: `https://wa.me/?text=${enc(text + ' ' + url)}` },
    { key: 'email', label: 'Email',    Icon: Mail,          href: `mailto:?subject=${enc(title)}&body=${enc(text + '\n\n' + url)}` },
    { key: 'sms',   label: 'SMS',      Icon: MessageSquare, href: `sms:?&body=${enc(text + ' ' + url)}` },
  ]

  const sizeClasses = size === 'sm'
    ? 'h-8 w-8'
    : 'h-10 w-10'
  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'

  // Card variant ('sm') sits over a product image whose background can
  // be anything (often pure white photography), so it needs hard contrast
  // — solid dark backdrop + white icon. Detail-page variant ('md') sits
  // over the dark card body, so the lighter translucent style is fine
  // and matches the rest of the action chrome.
  const buttonClasses = size === 'sm'
    ? 'bg-black/55 hover:bg-black/75 text-white shadow-md'
    : 'bg-white/[0.08] hover:bg-white/[0.16] backdrop-blur text-white'

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={onClick}
        aria-label="Share this product"
        className={`inline-flex items-center justify-center rounded-full transition-colors ${buttonClasses} ${sizeClasses}`}
      >
        <Share2 className={iconSize} aria-hidden />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-white/[0.08] bg-[#0f0f0f] p-1 shadow-xl z-50"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={copyLink}
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[14px] text-white hover:bg-white/[0.06] min-h-[40px]"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-400" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
            {copied ? 'Copied!' : 'Copy link'}
          </button>
          {targets.map(({ key, label, Icon, href }) => (
            <a
              key={key}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              role="menuitem"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-[14px] text-white hover:bg-white/[0.06] min-h-[40px]"
              onClick={() => setOpen(false)}
            >
              <Icon className="h-4 w-4" aria-hidden style={{ color: theme?.accent }} />
              {label}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Storefront Component ────────────────────────────────────────────
export default function StorefrontPage({ subdomain }) {
  const [storeData, setStoreData] = useState(null)
  const [allProducts, setAllProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [view, setView] = useState('grid') // grid | product | cart | checkout | success | orders
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const searchTimerRef = useRef(null)
  const [selectedCategory, setSelectedCategory] = useState('')
  const [priceRange, setPriceRange] = useState('')
  // 'featured' = the daily-rotating shuffle on the API. Keeps the page
  // from always showing the same hero products on cold-start. Customers
  // can switch to Newest, Price, Rating etc. via the dropdown.
  const [sortBy, setSortBy] = useState('featured')
  const cart = useCart(subdomain)
  const loadingRef = useRef(false)
  const PRODUCTS_PER_PAGE = 30

  // Handle browser back button — return to grid instead of leaving site
  useEffect(() => {
    const handlePopState = (e) => {
      if (e.state?.view) {
        setView(e.state.view)
        if (e.state.product) setSelectedProduct(e.state.product)
      } else {
        setView('grid')
        setSelectedProduct(null)
      }
    }
    window.addEventListener('popstate', handlePopState)
    // Push initial state
    if (!window.history.state?.view) {
      window.history.replaceState({ view: 'grid' }, '')
    }
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // When view changes, push to browser history
  const navigateTo = useCallback((newView, product = null) => {
    if (newView === 'product' && product) {
      setSelectedProduct(product)
      setView('product')
      // Push the canonical /product/{id} URL so refresh + share + back
      // button all work. Same path the OG endpoint serves, so a copy
      // of the URL bar is the same URL we want for sharing.
      window.history.pushState({ view: 'product', product }, '', `/product/${product.id}`)
    } else if (newView === 'cart') {
      setView('cart')
      window.history.pushState({ view: 'cart' }, '', '/')
    } else if (newView === 'grid') {
      setView('grid')
      setSelectedProduct(null)
      // Replace the current history entry with grid so the back button
      // doesn't return to cart / orders / checkout / success that the
      // user just clicked away from. Reset URL to root.
      window.history.replaceState({ view: 'grid' }, '', '/')
    } else {
      setView(newView)
      window.history.pushState({ view: newView }, '', '/')
    }
    // View changes are React state swaps, not real navigations — browser keeps
    // the previous scroll position. Reset to top so every view starts fresh.
    if (newView !== 'grid') {
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
  }, [])

  // Always use midnight (dark) theme — stored in database, never localStorage
  const theme = getThemeById(storeData?.store?.themeId || 'midnight')

  // Build API URL with filters. Featured (= shuffled) responses get a
  // monotonically-increasing cache-bust suffix so neither the browser
  // disk cache nor any CDN edge cache can return a stale order. We
  // already set Cache-Control: no-store on the API and exclude the
  // route from the PWA service worker, but the cache-bust is the
  // belt-and-braces guarantee that every refresh produces a new URL
  // → new request → new shuffle.
  const buildUrl = useCallback((page) => {
    const params = new URLSearchParams({
      subdomain, page, limit: PRODUCTS_PER_PAGE,
    })
    if (selectedCategory) params.set('category', selectedCategory)
    if (priceRange) params.set('priceRange', priceRange)
    if (sortBy !== 'featured') params.set('sort', sortBy)
    if (searchQuery) params.set('search', searchQuery)
    if (sortBy === 'featured') params.set('_t', Date.now().toString())
    return `${API_BASE}/api/storefront/store?${params}`
  }, [subdomain, selectedCategory, priceRange, sortBy, searchQuery])

  // Load initial page. Default (no sort) hits the shuffled featured
  // response, so cache-bust suffix here too — otherwise mobile Safari
  // / Chrome might disk-cache the first SSR-style response.
  useEffect(() => {
    fetch(`${API_BASE}/api/storefront/store?subdomain=${subdomain}&page=1&limit=${PRODUCTS_PER_PAGE}&_t=${Date.now()}`)
      .then((r) => r.ok ? r.json() : Promise.reject('Store not found'))
      .then((data) => {
        setStoreData(data)
        setAllProducts(data.products || [])
        setHasMore(data.pagination?.hasMore || false)
        setCurrentPage(1)
      })
      .catch(() => { setStoreData(null) })
      .finally(() => setLoading(false))

    // Deep-link support: when a customer opens a shared
    // /product/{uuid} link, jump straight to the detail view for that
    // product. We don't use React Router on storefront subdomains
    // (StorefrontPage is the only top-level), so we parse the path by
    // hand. Fetches the product directly via the storefront API's
    // single-id filter so it works even if the product is on page 5
    // of the shuffle.
    const pathMatch = (window.location.pathname || '').match(/^\/product\/([0-9a-f-]{36})$/i)
    if (pathMatch) {
      const productId = pathMatch[1]
      fetch(`${API_BASE}/api/storefront/store?subdomain=${subdomain}&id=${productId}&page=1&limit=1`)
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          const p = (data?.products || [])[0]
          if (p) {
            setSelectedProduct(p)
            setView('product')
            window.history.replaceState({ view: 'product', product: p }, '')
          }
        })
        .catch(() => { /* fall back to grid view */ })
    }

    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('checkout') === 'success') {
      setView('success')
      cart.clear()
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [subdomain])

  // Reload when filters change (server-side filtering)
  // Don't flash the page — load in background and swap products smoothly
  const [filterLoading, setFilterLoading] = useState(false)
  const filterAbortRef = useRef(null)

  useEffect(() => {
    if (!storeData) return
    // Abort previous filter request
    if (filterAbortRef.current) filterAbortRef.current.abort()
    const controller = new AbortController()
    filterAbortRef.current = controller

    // Scroll the page to the top of the product grid whenever filters
    // change. Without this, tapping a category from halfway down the
    // page leaves the customer staring at the middle of the new
    // results — usually the same screen position but a different
    // product set, which feels broken. `behavior: 'smooth'` is gentle.
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    setFilterLoading(true)
    fetch(buildUrl(1), { signal: controller.signal })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) {
          setAllProducts(data.products || [])
          setHasMore(data.pagination?.hasMore || false)
          setCurrentPage(1)
          if (data.pagination) setStoreData(prev => prev ? { ...prev, pagination: data.pagination } : prev)
        }
      })
      .catch((err) => { if (err.name !== 'AbortError') console.error(err) })
      .finally(() => setFilterLoading(false))
  }, [selectedCategory, priceRange, sortBy, searchQuery])

  // Load more products — `buildUrl` must be in the deps so page 2+ uses the
  // current filters. Without it, loadMore captures the stale `buildUrl` from
  // before the user changed filters, pulling unfiltered results.
  const loadMore = useCallback(() => {
    if (loadingRef.current || !hasMore) return
    loadingRef.current = true
    setLoadingMore(true)
    const nextPage = currentPage + 1
    fetch(buildUrl(nextPage))
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.products?.length) {
          setAllProducts(prev => [...prev, ...data.products])
          setHasMore(data.pagination?.hasMore || false)
          setCurrentPage(nextPage)
          // Update categories from full data
          if (data.categories) {
            setStoreData(prev => prev ? { ...prev, categories: data.categories } : prev)
          }
        } else {
          setHasMore(false)
        }
      })
      .catch(() => { setHasMore(false) })
      .finally(() => { setLoadingMore(false); loadingRef.current = false })
  }, [buildUrl, currentPage, hasMore])

  // Infinite scroll listener — prefetches ~2 screen heights before the bottom
  // so new products are visible by the time the user scrolls to them.
  useEffect(() => {
    if (view !== 'grid') return
    const handleScroll = () => {
      const fromBottom = document.body.offsetHeight - (window.innerHeight + window.scrollY)
      const threshold = Math.max(1500, window.innerHeight * 1.5)
      if (fromBottom <= threshold) {
        loadMore()
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [view, loadMore])

  // Products are now filtered and sorted server-side
  const filteredProducts = allProducts

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
          onClick={() => { cart.clear(); navigateTo('grid') }}
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
    <OrderTrackingView store={store} theme={theme} subdomain={subdomain} cart={cart} onBack={() => navigateTo('grid')} />
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
      allProducts={allProducts}
      onSelectProduct={(p) => navigateTo('product', p)}
      onBack={() => window.history.back()}
      onCartClick={() => navigateTo('cart')}
    />
  )

  // ─── Cart View with availability verification ─────────────────────
  if (view === 'cart') return (
    <CartView store={store} cart={cart} theme={theme} subdomain={subdomain} onBack={() => navigateTo('grid')} onCheckout={() => setView('checkout')} />
  )

  // ─── Product Grid (default view) ───────────────────────────────────
  return (
    <div className={`min-h-screen ${theme.pageBg}`} style={{ overflowX: 'clip' }}>
      <StoreHeader store={store} cart={cart} theme={theme} onCartClick={() => navigateTo('cart')} onTrackOrder={() => navigateTo('orders')} searchInput={searchInput} onSearchChange={(e) => {
        const v = e.target.value
        setSearchInput(v)
        clearTimeout(searchTimerRef.current)
        // Clearing the search bar (empty value, e.g. via the X button)
        // should reset results immediately — debouncing the empty
        // string would leave the previous filter applied for a second
        // and feels broken to customers.
        if (v === '') {
          setSearchQuery('')
        } else {
          searchTimerRef.current = setTimeout(() => setSearchQuery(v), 1000)
        }
      }} />

      {/* New Arrivals — horizontal scroll like AliExpress */}
      {allProducts.length > 0 && (
        <div className="bg-gradient-to-b from-[#0f172a] to-[#0c1222] px-4 py-6">
          <div className="mx-auto max-w-7xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">New arrivals, great discounts</h2>
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span>{storeData.pagination?.totalProducts || allProducts.length} products</span>
                <span>•</span>
                <span>{storeData.categories?.length || 0} categories</span>
              </div>
            </div>
            <div className="relative group">
              <div className="flex gap-3 overflow-x-auto pb-2 category-scroll" style={{ WebkitOverflowScrolling: 'touch' }} id="newArrivalsScroll">
                {allProducts.slice(0, 15).map((p) => (
                  <div
                    key={p.id}
                    onClick={() => navigateTo('product', p)}
                    className="flex-shrink-0 w-[140px] sm:w-[160px] cursor-pointer"
                  >
                    <div className="relative aspect-square overflow-hidden rounded-xl bg-gray-100 mb-1.5">
                      {p.image && <img src={p.image} alt={p.title} className="h-full w-full object-cover" />}
                      {p.discountPercent > 0 && (
                        <div className="absolute top-1.5 left-1.5 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">-{p.discountPercent}%</div>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); cart.add(p) }}
                        className="absolute bottom-2 right-2 rounded-full p-1.5 bg-white/80 hover:bg-white shadow text-gray-700"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="text-xs text-white line-clamp-2 leading-tight mb-0.5">{p.title}</p>
                    {p.ordersCount > 0 && <p className="text-[10px] text-slate-500">{p.ordersCount}+ sold</p>}
                    <p className="text-sm font-bold text-red-500">A${(p.price || 0).toFixed(2)}</p>
                  </div>
                ))}
              </div>
              {/* Left/right scroll buttons */}
              <button
                onClick={() => document.getElementById('newArrivalsScroll')?.scrollBy({ left: -300, behavior: 'smooth' })}
                className="absolute left-0 top-0 h-[140px] sm:h-[160px] w-10 flex items-center justify-center bg-black/30 hover:bg-black/50 text-white rounded-l-xl opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => document.getElementById('newArrivalsScroll')?.scrollBy({ left: 300, behavior: 'smooth' })}
                className="absolute right-0 top-0 h-[140px] sm:h-[160px] w-10 flex items-center justify-center bg-black/30 hover:bg-black/50 text-white rounded-r-xl opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Bar — horizontal scroll like AliExpress */}
      {storeData.categories?.length > 0 && (
        <div className="border-b border-white/[0.06] bg-[#0c1222] sticky top-[104px] sm:top-[57px] z-30">
          <div className="mx-auto max-w-7xl px-4">
            {/* Category tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-2 pb-1 category-scroll" style={{ WebkitOverflowScrolling: 'touch' }}>
              <style>{`
                .category-scroll::-webkit-scrollbar { height: 6px; }
                .category-scroll::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); border-radius: 6px; }
                .category-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.25); border-radius: 6px; }
                .category-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.4); }
                .category-scroll { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.25) rgba(255,255,255,0.05); }
              `}</style>
              <button
                onClick={() => setSelectedCategory('')}
                className={`scrollbar-hide flex-shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                  !selectedCategory ? 'text-white bg-[#FF6B35]' : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                For you
              </button>
              {storeData.categories.slice(0, 20).map((c) => {
                const catEmojis = {
                  'Home & Garden': '🏡', 'Home Improvement': '🔨', 'Computer & Office': '💻',
                  'Beauty & Health': '💄', 'Automobiles, Parts & Accessories': '🚗',
                  'Shoes': '👟', 'Apparel Accessories': '👒', 'Toys & Hobbies': '🧸',
                  'Consumer Electronics': '📱', 'Sports Shoes,Clothing&Accessories': '⚽',
                  'Phones & Telecommunications Accessories': '📞',
                  'Luggage & Bags': '👜', 'Sports & Entertainment': '🏋️',
                  'Mother & Kids': '👶', 'Tools': '🔧', 'Electronic Components & Supplies': '🔌',
                  'Lights & Lighting': '💡', 'Jewelry & Accessories': '💍',
                  "Men's Clothing": '👔', "Women's Clothing": '👗',
                  'Kitchen': '🍳', 'Pet': '🐕', 'Audio': '🎧',
                  'Office & School Supplies': '📎', 'Hair Extensions & Wigs': '💇',
                  'Furniture': '🪑', 'Security & Protection': '🔒',
                  'Underwear & Sleepwears': '🩱', 'Novelty & Special Use': '🎭',
                  'Weddings & Events': '💒', 'Food': '🍔',
                }
                const emoji = catEmojis[c.name] || '🛍️'
                return (
                <button
                  key={c.name}
                  onClick={() => setSelectedCategory(selectedCategory === c.name ? '' : c.name)}
                  className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap ${
                    selectedCategory === c.name ? 'text-white bg-[#FF6B35]' : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  {emoji} {(c.name || '').replace('&', ' & ')}
                </button>
              )})}
            </div>
            {/* Price filters + Sort — in sticky bar */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 category-scroll" style={{ WebkitOverflowScrolling: 'touch' }}>
              {[
                { key: '', label: 'All Prices' },
                { key: 'under10', label: `Under $10${storeData.priceRanges?.under10 ? ` (${storeData.priceRanges.under10})` : ''}` },
                { key: '10to20', label: `$10–$20${storeData.priceRanges?.['10to20'] ? ` (${storeData.priceRanges['10to20']})` : ''}` },
                { key: '20to50', label: `$20–$50${storeData.priceRanges?.['20to50'] ? ` (${storeData.priceRanges['20to50']})` : ''}` },
                { key: 'over50', label: `$50+${storeData.priceRanges?.over50 ? ` (${storeData.priceRanges.over50})` : ''}` },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setPriceRange(key)}
                  className={`flex-shrink-0 rounded-full px-3 py-1 text-[11px] font-medium transition-all ${
                    priceRange === key
                      ? 'text-white bg-[#FF6B35]'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {label}
                </button>
              ))}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="flex-shrink-0 ml-auto rounded-full border border-white/[0.1] px-3 py-1 text-[11px] text-slate-400 bg-transparent"
                style={{ outline: 'none', colorScheme: 'dark' }}
              >
                <option value="featured">Featured</option>
                <option value="newest">Newest</option>
                <option value="bestsellers">Bestsellers</option>
                <option value="price-low">Price: Low → High</option>
                <option value="price-high">Price: High → Low</option>
                <option value="rating">Top Rated</option>
                <option value="discount">Biggest Discounts</option>
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 py-4">

        {/* Products */}
        {searchQuery && filterLoading ? (
          // Search request in flight — hide stale products so the
          // customer doesn't see dimmed unrelated cards and assume
          // the search matched nothing useful. Plain spinner instead.
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-slate-400 mb-3" />
            <p className="text-sm text-slate-400">Searching for "{searchQuery}"…</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className={`rounded-2xl ${theme.cardBg} ${theme.cardBorder} py-16 text-center shadow-sm`}>
            <Package className="mx-auto h-16 w-16 text-gray-300 mb-3" />
            <h3 className={`text-lg font-semibold ${theme.textPrimary} mb-1`}>
              {searchQuery
                ? `No matches for "${searchQuery}"`
                : storeData.products.length === 0 ? 'Coming Soon' : 'No matches'}
            </h3>
            <p className={`text-sm ${theme.textSecondary}`}>
              {storeData.products.length === 0
                ? 'This store is setting up — check back soon!'
                : 'Try a different search or category.'}
            </p>
          </div>
        ) : (
          <>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-xl font-bold text-white">
              {selectedCategory ? `${selectedCategory}` : 'More to love'}
            </h2>
            {filterLoading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
          </div>
          <div className={`grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 transition-opacity duration-200 ${filterLoading ? 'opacity-50' : 'opacity-100'}`}>
            {filteredProducts.map((product) => {
              const price = product.price || 0
              const originalPrice = product.originalPrice || 0
              const discount = product.discountPercent || (originalPrice > price ? Math.round((1 - price / originalPrice) * 100) : 0)
              const rating = product.rating || 0
              const soldCount = product.ordersCount || product.totalSold || 0
              const savings = originalPrice > price ? (originalPrice - price) : 0
              const outOfStock = product.inStock === false
              const shippingCost = product.shipping || 0

              return (
              <div
                key={product.id}
                onClick={() => !outOfStock && navigateTo('product', product)}
                className={`group overflow-hidden rounded-xl ${theme.cardBg} ${theme.cardBorder} shadow-sm transition-all ${outOfStock ? 'opacity-60 cursor-default' : 'cursor-pointer hover:shadow-lg hover:-translate-y-0.5'}`}
              >
                {/* Image with discount badge */}
                <div className="relative aspect-square overflow-hidden bg-gray-100">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.title}
                      className={`h-full w-full object-cover transition-transform ${outOfStock ? 'grayscale' : 'group-hover:scale-105'}`}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Package className="h-12 w-12 text-gray-300" />
                    </div>
                  )}
                  {/* Out of stock overlay */}
                  {outOfStock && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <span className="bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-full">Unavailable</span>
                    </div>
                  )}
                  {/* Discount badge */}
                  {!outOfStock && discount > 0 && (
                    <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded">
                      -{discount}%
                    </div>
                  )}
                  {/* Share button — top-right of the image. Stops the
                      card's onClick navigation so tapping share doesn't
                      also open the product. */}
                  <div
                    className="absolute top-2 right-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ShareButton product={product} subdomain={subdomain} theme={theme} size="sm" />
                  </div>
                  {/* Quick add button — hidden when out of stock */}
                  {!outOfStock && (
                    <button
                      onClick={(e) => { e.stopPropagation(); cart.add(product) }}
                      className="absolute bottom-2 right-2 rounded-full p-2 shadow-lg transition-all opacity-0 group-hover:opacity-100 bg-white/90 hover:bg-white text-gray-700 hover:text-black"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Product info */}
                <div className="p-2.5">
                  <h3 className={`text-xs font-medium ${theme.textPrimary} line-clamp-2 mb-1.5 leading-tight`}>{product.title}</h3>

                  {/* Price section */}
                  <div className="mb-1">
                    <span className="text-lg font-bold text-red-500">A${price.toFixed(2)}</span>
                    {originalPrice > price && (
                      <span className={`text-xs ${theme.textMuted} line-through ml-1.5`}>A${originalPrice.toFixed(2)}</span>
                    )}
                  </div>

                  {/* Savings callout */}
                  {savings > 0 && (
                    <p className="text-xs text-green-500 font-medium mb-1">Save A${savings.toFixed(2)}</p>
                  )}

                  {/* Rating + sold */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {rating > 0 && (
                      <div className="flex items-center gap-0.5">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span className={`text-xs ${theme.textMuted}`}>{rating >= 1 ? rating.toFixed(1) : (rating * 5).toFixed(1)}</span>
                      </div>
                    )}
                    {soldCount > 0 && (
                      <span className={`text-xs ${theme.textMuted}`}>{soldCount >= 1000 ? `${(soldCount/1000).toFixed(1)}k` : soldCount}+ sold</span>
                    )}
                  </div>

                  {/* Shipping badge on product card. Always rendered so
                      every card has the same vertical rhythm — when AE
                      didn't return a shipping cost we treat it as free
                      (which is how the customer experiences it: their
                      total is the displayed price). When AE did return
                      a value, surface it explicitly so we're not hiding
                      a fee. */}
                  <div className="mt-1.5">
                    <span className={`inline-flex items-center gap-0.5 text-xs ${theme.textMuted}`}>
                      <Truck className="h-3 w-3" />{' '}
                      {shippingCost > 0
                        ? `Incl. A$${shippingCost.toFixed(2)} shipping`
                        : 'Free shipping'}
                    </span>
                  </div>
                </div>
              </div>
            )})}
          </div>
          </>
        )}

        {/* Skeleton placeholders while next page is loading — keeps the grid
            pattern intact so users never see the flash of a spinner */}
        {loadingMore && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 mt-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={`skel-${i}`} className="rounded-xl overflow-hidden bg-[#1e293b] animate-pulse">
                <div className="aspect-square bg-white/[0.04]"></div>
                <div className="p-2.5 space-y-2">
                  <div className="h-3 rounded bg-white/[0.04]"></div>
                  <div className="h-3 w-2/3 rounded bg-white/[0.04]"></div>
                  <div className="h-4 w-1/2 rounded bg-white/[0.06]"></div>
                </div>
              </div>
            ))}
          </div>
        )}
        {hasMore && !loadingMore && filteredProducts.length > 0 && (
          <div className="flex justify-center py-6">
            <button
              onClick={loadMore}
              className="rounded-full px-6 py-2 text-sm font-medium border border-white/[0.1] text-slate-400 hover:text-white hover:border-white/[0.3] transition-all"
            >
              Load more products
            </button>
          </div>
        )}
        {!hasMore && allProducts.length > PRODUCTS_PER_PAGE && (
          <p className="text-center py-6 text-xs text-slate-500">You've seen all {allProducts.length} products</p>
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

// ─── Cart View — with live AliExpress availability verification ──────────
function CartView({ store, cart, theme, subdomain, onBack, onCheckout }) {
  const [verifying, setVerifying] = useState(true)
  const [itemStatus, setItemStatus] = useState({}) // { productId: { available, reason, message, availableQty } }
  const [hasIssues, setHasIssues] = useState(false)

  // Verify all cart items on mount
  useEffect(() => {
    if (cart.items.length === 0) { setVerifying(false); return }

    const verify = async () => {
      setVerifying(true)
      try {
        const res = await fetch(`${API_BASE}/api/storefront/verify-cart`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: cart.items.map(i => ({
              productId: i.supplierProductId || i.id,
              title: i.title,
              skuId: i.skuId || null,
              skuAttr: i.skuAttr || '',
              quantity: i.quantity,
            })),
          }),
        })
        if (res.ok) {
          const data = await res.json()
          const statusMap = {}
          let issues = false
          for (const item of (data.items || [])) {
            statusMap[item.productId] = item
            if (!item.available) issues = true
          }
          setItemStatus(statusMap)
          setHasIssues(issues)
        }
      } catch { /* verification failed — allow checkout */ }
      setVerifying(false)
    }
    verify()
  }, [cart.items])

  const getStatus = (item) => {
    const id = item.supplierProductId || item.id
    return itemStatus[id] || null
  }

  return (
    <div className={`min-h-screen bg-[#0f172a]`}>
      <StoreHeader store={store} cart={cart} theme={theme} onCartClick={() => {}} />
      <div className="mx-auto max-w-2xl px-4 py-8">
        <button onClick={onBack} className="mb-6 flex items-center gap-1 text-sm text-slate-400">
          <ChevronLeft className="h-4 w-4" /> Continue shopping
        </button>
        <h1 className="text-2xl font-bold text-white mb-6">Your Cart ({cart.count})</h1>

        {cart.items.length === 0 ? (
          <div className="rounded-2xl bg-[#1e293b] border border-white/[0.06] p-12 text-center">
            <ShoppingCart className="mx-auto h-12 w-12 text-slate-600 mb-3" />
            <p className="text-slate-400">Your cart is empty</p>
            <button onClick={onBack} className="mt-4 text-sm font-medium text-[#FF6B35] hover:underline">
              Browse products
            </button>
          </div>
        ) : (
          <>
            {/* Verification banner */}
            {verifying && (
              <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-3 mb-4 flex items-center gap-2">
                <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />
                <p className="text-sm text-blue-300">Verifying availability...</p>
              </div>
            )}
            {!verifying && hasIssues && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 mb-4 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <p className="text-sm text-red-300">Some items in your cart are no longer available. Please remove them to continue.</p>
              </div>
            )}
            {!verifying && !hasIssues && Object.keys(itemStatus).length > 0 && (
              <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-3 mb-4 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <p className="text-sm text-green-300">All items are in stock at current prices. Shipping to your address will be confirmed at checkout.</p>
              </div>
            )}

            {/* Cart items */}
            <div className="space-y-3 mb-6">
              {cart.items.map((item) => {
                const status = getStatus(item)
                const isUnavailable = status && !status.available
                return (
                  <div key={item.id} className={`rounded-xl bg-[#1e293b] border p-3 shadow-sm ${isUnavailable ? 'border-red-500/30 bg-red-500/5' : 'border-white/[0.06]'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 ${isUnavailable ? 'opacity-40' : ''}`}>
                        {item.image ? (
                          <img src={item.image} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center"><Package className="h-5 w-5 text-gray-300" /></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium text-white truncate ${isUnavailable ? 'line-through opacity-50' : ''}`}>{item.title}</p>
                        {item.variantLabel && (
                          <p className="text-[11px] text-slate-400 mt-0.5 truncate">{item.variantLabel}</p>
                        )}
                        {!isUnavailable && (
                          <div className="flex items-center gap-2 mt-1">
                            <button onClick={() => cart.updateQty(item.id, item.skuId, item.quantity - 1)} className="rounded-lg p-1 bg-white/[0.06]">
                              <Minus className="h-3 w-3 text-slate-400" />
                            </button>
                            <span className="w-5 text-center text-xs font-medium text-white">{item.quantity}</span>
                            <button onClick={() => cart.updateQty(item.id, item.skuId, item.quantity + 1)} className="rounded-lg p-1 bg-white/[0.06]">
                              <Plus className="h-3 w-3 text-slate-400" />
                            </button>
                          </div>
                        )}
                      </div>
                      <p className={`font-semibold text-sm ${isUnavailable ? 'text-slate-600 line-through' : 'text-white'}`}>A${(item.price * item.quantity).toFixed(2)}</p>
                      <button onClick={() => cart.remove(item.id, item.skuId)} className="p-1 text-slate-500 hover:text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    {/* Availability issue message */}
                    {isUnavailable && (
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-xs text-red-400">{status.message}</p>
                        {status.reason === 'low_stock' && status.availableQty > 0 ? (
                          <button
                            onClick={() => cart.updateQty(item.id, item.skuId, status.availableQty)}
                            className="text-xs font-medium text-[#FF6B35] hover:underline"
                          >
                            Update to {status.availableQty}
                          </button>
                        ) : (
                          <button
                            onClick={() => cart.remove(item.id, item.skuId)}
                            className="text-xs font-medium text-red-400 hover:underline"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Total + shipping transparency + Checkout button */}
            <div className="rounded-xl bg-[#1e293b] border border-white/[0.06] p-5 shadow-sm">
              <div className="flex justify-between text-lg font-bold text-white mb-1">
                <span>Total</span>
                <span>A${cart.total.toFixed(2)}</span>
              </div>
              {/* Shipping is bundled into total post-markup, so the
                  separate shipping line here was removed. */}
              <button
                onClick={onCheckout}
                disabled={verifying || hasIssues}
                className={`w-full rounded-xl py-3.5 text-sm font-semibold text-white transition-colors ${
                  verifying || hasIssues ? 'opacity-50 cursor-not-allowed bg-slate-600' : ''
                }`}
                style={!(verifying || hasIssues) ? { backgroundColor: '#FF6B35' } : {}}
              >
                {verifying ? 'Verifying availability...' : hasIssues ? 'Remove unavailable items to continue' : 'Proceed to Checkout'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Store Header ─────────────────────────────────────────────────────────
// ─── Product Detail View — fetches full details from AliExpress DS API ──
function ProductDetailView({ product, store, cart, theme, subdomain, allProducts = [], onSelectProduct, onBack, onCartClick }) {
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

  // Variant-aware pricing — customer sees a single price that already
  // includes everything (product cost + shipping + 10% tax estimate + the
  // store's markup). Break-even is what AE bills us; markup is the
  // store-owner's margin on top of break-even.
  //
  // Shown price  = break_even_total × (1 + store.markup / 100)
  // where break_even_total = product + shipping + 10% tax.
  //
  // The list page applied this markup server-side to product.price
  // Customer-facing pricing — all in AUD, derived by proportional
  // scaling from product.price (the storefront's known-correct AUD
  // price for the cheapest variant). This avoids the unit-confusion
  // bug the previous version hit: it computed displayPrice in USD
  // (breakEvenTotal × markupMultiplier) and rendered it as "A$X",
  // silently dropping the USD→AUD conversion. Customers added to
  // cart at the USD figure and got surprised when checkout charged
  // the proper AUD figure (~1.45× higher).
  //
  // Math:
  //   product.price          = AUD for cheapest-variant break-even × markup × audRate
  //   product.breakEvenUsd   = USD break-even (cost+ship+tax) for cheapest variant
  //   variantBreakEvenUsd    = (selectedVariant.priceUsd + shipping) × (1+TAX_RATE)
  //   displayPrice (AUD)     = product.price × variantBreakEvenUsd / product.breakEvenUsd
  // Only the *ratio* of break-evens matters — markup and audRate cancel
  // out, so we never have to know audRate on the frontend at all.
  const TAX_RATE = 0.10
  const productShippingUsd = Number(product.shipping) || 0
  const basePrice = Number(product.price) || 0
  const baseBreakEvenUsd = Number(product.breakEvenUsd) || 0
  const selectedProductUsd = selectedVariant?.priceUsd > 0 ? selectedVariant.priceUsd : null
  // Variant break-even in USD for the currently-selected variant.
  // When no variant is picked, fall back to the base break-even so
  // displayPrice == basePrice exactly (no math drift).
  const variantBreakEvenUsd = selectedProductUsd != null
    ? (selectedProductUsd + productShippingUsd) * (1 + TAX_RATE)
    : baseBreakEvenUsd
  const breakEvenProductUsd = selectedProductUsd != null
    ? selectedProductUsd
    : Math.max(0, baseBreakEvenUsd / (1 + TAX_RATE) - productShippingUsd)
  const breakEvenShippingUsd = productShippingUsd
  const breakEvenTaxUsd = Math.round((breakEvenProductUsd + breakEvenShippingUsd) * TAX_RATE * 100) / 100
  // Customer-facing total — proportional scale of basePrice.
  const displayPrice = (basePrice > 0 && baseBreakEvenUsd > 0)
    ? Math.round((basePrice * variantBreakEvenUsd / baseBreakEvenUsd) * 100) / 100
    : basePrice
  // Per-line breakdown: split displayPrice across product / shipping /
  // tax in proportion to their USD shares of the variant break-even,
  // so the three lines always sum exactly to displayPrice (AUD).
  const displayProductAud = variantBreakEvenUsd > 0
    ? Math.round((breakEvenProductUsd / variantBreakEvenUsd) * displayPrice * 100) / 100
    : 0
  const displayShippingAud = variantBreakEvenUsd > 0
    ? Math.round((breakEvenShippingUsd / variantBreakEvenUsd) * displayPrice * 100) / 100
    : 0
  // Derived so the three lines sum to displayPrice exactly regardless
  // of rounding artefacts.
  const displayTaxAud = Math.round((displayPrice - displayProductAud - displayShippingAud) * 100) / 100
  const hasVariants = (details?.variants?.length > 1) || (Array.isArray(product.variants) && product.variants.length > 1)
  const needsVariantChoice = hasVariants && !selectedVariant
  const availableStock = selectedVariant?.stock ?? null
  const outOfStockVariant = selectedVariant != null && (selectedVariant.stock === 0)

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
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium mb-1" style={{ color: theme.accent }}>{product.category}</p>
              {/* Share — same intent as the small button on each card,
                  bigger touch target on the detail page where the
                  customer is more likely to want to send it on. */}
              <ShareButton product={displayProduct} subdomain={subdomain} theme={theme} size="md" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-3">{displayProduct.title}</h1>
            <p className="text-3xl font-bold text-white mb-2">
              A${displayPrice.toFixed(2)} <span className="text-sm text-slate-500">AUD</span>
            </p>
            {/* Transparent 3-line breakdown so customer sees what they're paying for.
                Matches how AE displays their own checkout. "Est. tax" labelled
                clearly — flat 10% because AE doesn't expose tax via any API. */}
            <div className="text-xs text-slate-400 mb-3 space-y-0.5">
              <div className="flex justify-between max-w-[240px]">
                <span>Product</span>
                <span className="tabular-nums">A${displayProductAud.toFixed(2)}</span>
              </div>
              <div className="flex justify-between max-w-[240px]">
                <span>Shipping</span>
                <span className="tabular-nums">A${displayShippingAud.toFixed(2)}</span>
              </div>
              <div className="flex justify-between max-w-[240px]">
                <span>Est. tax</span>
                <span className="tabular-nums">A${displayTaxAud.toFixed(2)}</span>
              </div>
            </div>
            {selectedVariant && (
              <p className="text-xs text-slate-500 mb-2">
                {selectedVariant.label || Object.values(selectedVariant.propertyMap || {}).join(' / ')}
              </p>
            )}

            {product.originalPrice && product.originalPrice > displayPrice && (
              <p className="text-sm text-slate-500 line-through mb-4">${parseFloat(product.originalPrice).toFixed(2)}</p>
            )}

            {/* DEV: quick link to the source AE listing for price verification.
                Hidden from customers via a query param only admins would know. */}
            {product.supplierProductId && typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('verify') === '1' && (
              <a
                href={`https://www.aliexpress.com/item/${String(product.supplierProductId).replace('ae_', '')}.html`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-1 mb-3 rounded-md border border-orange-400/40 bg-orange-400/5 px-2.5 py-1 text-xs text-orange-300 hover:bg-orange-400/10"
              >
                🔍 View this product on AliExpress (verify price)
              </a>
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
              // Prefer live details (fresher stock + image), fall back to the
              // variants we stored on the product row. Using || here ensures
              // we never touch a null object.
              const variants = (details?.variants && details.variants.length > 0)
                ? details.variants
                : (Array.isArray(product.variants) ? product.variants : [])
              if (variants.length === 0) return null
              // Group variants by property types (e.g., Color, Size)
              const propGroups = {}
              variants.forEach(v => {
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
                const match = variants.find(v => {
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
                    {/* Scroll horizontally on mobile, but allow the
                        hover-zoom popover to escape on desktop where
                        overflow:auto would otherwise clip it. */}
                    <div className="flex flex-wrap gap-2 overflow-x-auto md:overflow-visible">
                      {details.variants.map((v, i) => {
                        const label = v.label || `Option ${i + 1}`
                        const isSelected = selectedVariant?.skuId === v.skuId
                        return (
                          <button key={v.skuId} onClick={() => setSelectedVariant(isSelected ? null : v)}
                            className={`group/swatch relative flex-shrink-0 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-all ${isSelected ? 'border-[#FF6B35] bg-[#FF6B35]/10 text-white' : 'border-white/[0.08] text-slate-300 hover:border-white/[0.2]'}`}>
                            {v.image && <img src={v.image} alt="" className="h-6 w-6 rounded object-cover" />}
                            <span>{label}</span>
                            {/* Hover-zoom (PC only) — bigger preview pops
                                above the swatch on mouse hover so customers
                                can compare colour/style without selecting.
                                Mobile users tap to select normally.
                                Container is explicitly square; the inner
                                img fills it via h-full w-full + object-cover
                                so AE thumbnails with weird aspects don't
                                stretch into a tall rectangle. */}
                            {v.image && (
                              <span className="hidden md:block pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50 w-56 h-56 opacity-0 group-hover/swatch:opacity-100 transition-opacity duration-150">
                                <img
                                  src={v.image}
                                  alt=""
                                  className="block h-full w-full rounded-lg object-cover border border-white/[0.12] shadow-2xl bg-[#0a0a0a]"
                                />
                              </span>
                            )}
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
                      <div className="flex flex-wrap gap-2 overflow-x-auto md:overflow-visible">
                        {[...propGroups[groupName]].map(val => {
                          const img = variants.find(v =>
                            (v.properties || []).some(p => p.name === groupName && p.value === val && p.image)
                          )?.properties?.find(p => p.name === groupName && p.value === val)?.image
                          const isSelected = selectedProps[groupName] === val
                          return (
                            <button key={val} onClick={() => handleSelect(groupName, val)}
                              className={`group/swatch relative flex-shrink-0 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-all ${isSelected ? 'border-[#FF6B35] bg-[#FF6B35]/10 text-white' : 'border-white/[0.08] text-slate-300 hover:border-white/[0.2]'}`}>
                              {img && <img src={img} alt="" className="h-6 w-6 rounded object-cover" />}
                              <span>{val}</span>
                              {/* Hover-zoom (PC only) — see flat-list
                                  branch above for the rationale. */}
                              {img && (
                                <span className="hidden md:block pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50 w-56 h-56 opacity-0 group-hover/swatch:opacity-100 transition-opacity duration-150">
                                  <img
                                    src={img}
                                    alt=""
                                    className="block h-full w-full rounded-lg object-cover border border-white/[0.12] shadow-2xl bg-[#0a0a0a]"
                                  />
                                </span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )
            })()}

            {/* Trust badges — "Free shipping" removed because shipping is
                bundled into the product price post-markup. */}
            <div className="flex flex-wrap gap-2 mb-6">
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

            {/* Delivery estimate — previously labelled "Free shipping" but
                shipping is bundled into the price post-markup, so we just
                show the ETA now. */}
            <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-[#1e293b] border border-white/[0.06]">
              <Truck className="h-5 w-5 text-emerald-400 flex-shrink-0" />
              <div>
                <p className="text-sm text-white font-medium">Ships to Australia</p>
                <p className="text-xs text-slate-400">Estimated delivery: 15–25 business days</p>
              </div>
            </div>

            {/* Deal tag */}
            {(product.discountPercent > 30 || product.ordersCount > 100) && (
              <div className="flex items-center gap-2 mb-4">
                {product.discountPercent > 30 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 text-red-400 text-xs font-medium px-2.5 py-1">
                    🔥 Deal — {product.discountPercent}% off
                  </span>
                )}
                {product.ordersCount > 100 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#FF6B35]/10 text-[#FF6B35] text-xs font-medium px-2.5 py-1">
                    ⭐ Popular — {product.ordersCount}+ sold
                  </span>
                )}
              </div>
            )}

            {/* Add to Cart — always clickable during testing. When a variant
                is picked, its skuId/skuAttr/priceUsd flow all the way through
                cart → checkout → Stripe → AE order.create. When nothing is
                picked the cart gets the base price and skuId=null (AE
                order-time will auto-resolve). */}
            <button
              onClick={() => {
                cart.add({
                  ...product,
                  price: displayPrice,
                  skuId: selectedVariant?.skuId || null,
                  skuAttr: selectedVariant?.skuAttr || null,
                  variantLabel: selectedVariant?.label || '',
                  variantImage: selectedVariant?.colorImage || selectedVariant?.image || product.image,
                  variantPriceUsd: selectedVariant?.priceUsd || null,
                })
                onCartClick()
              }}
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
                className="prose prose-invert prose-sm max-w-none [&_img]:rounded-lg [&_img]:max-w-full [&_img]:h-auto [&_img]:my-4 overflow-x-hidden break-words [&_*]:!text-slate-200 [&_h1]:!text-white [&_h2]:!text-white [&_h3]:!text-white [&_h4]:!text-white [&_strong]:!text-white [&_b]:!text-white [&_p]:!text-slate-200 [&_li]:!text-slate-200 [&_span]:!text-slate-200 [&_td]:!text-slate-200 [&_th]:!text-white [&_a]:!text-[#FF6B35]"
                style={{ colorScheme: 'dark', color: '#e2e8f0' }}
                dangerouslySetInnerHTML={{ __html: fixDescriptionImages(details.description) }}
              />
            ) : (
              <p className="text-sm text-slate-200 leading-relaxed">{details.description}</p>
            )}
          </div>
        )}

        {/* Similar Products */}
        {allProducts.length > 0 && (() => {
          const similar = allProducts
            .filter(p => p.id !== product.id && p.category === product.category)
            .slice(0, 12)
          const alsoLike = similar.length < 6
            ? allProducts.filter(p => p.id !== product.id && !similar.find(s => s.id === p.id)).slice(0, 12 - similar.length)
            : []
          const showProducts = [...similar, ...alsoLike]
          if (showProducts.length === 0) return null
          return (
            <div className="mt-10">
              <h3 className="text-lg font-bold text-white mb-4">You may also like</h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                {showProducts.map(p => {
                  const discount = p.discountPercent || 0
                  return (
                    <div
                      key={p.id}
                      onClick={() => { onSelectProduct?.(p); window.scrollTo(0, 0) }}
                      className="cursor-pointer overflow-hidden rounded-xl bg-[#1e293b] border border-white/[0.06] hover:shadow-lg hover:-translate-y-0.5 transition-all"
                    >
                      <div className="relative aspect-square overflow-hidden bg-gray-100">
                        {p.image && <img src={p.image} alt={p.title} className="h-full w-full object-cover" />}
                        {discount > 0 && (
                          <div className="absolute top-1.5 left-1.5 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">-{discount}%</div>
                        )}
                      </div>
                      <div className="p-2">
                        <h4 className="text-xs text-white line-clamp-2 mb-1">{p.title}</h4>
                        <span className="text-sm font-bold text-red-500">A${(p.price || 0).toFixed(2)}</span>
                        {p.ordersCount > 0 && <span className="text-[10px] text-slate-500 ml-1">{p.ordersCount}+ sold</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}

function StoreHeader({ store, cart, theme, onCartClick, onTrackOrder, searchInput, onSearchChange }) {
  // The header wordmark belongs to the OWNER's shop, not the platform —
  // customers visiting jum.togogo.me are in "Jummi's", not in "ToGoGo".
  // Right-half coloured with the store's chosen theme.accent so the
  // wordmark blends into the rest of the storefront palette. Falls
  // back to the platform name when store_name is unset.
  //
  // Wordmark is a plain <a href="/"> so customers landing on a
  // product page from an external link (Facebook ad, shared URL,
  // etc.) always have a one-tap path back to the storefront grid.
  // Using a real anchor (not a button) means it works from every
  // sub-view (cart, checkout, success, product detail) without
  // having to pipe a callback prop through each one.
  const [brandLeft, brandRight] = splitBrand(store?.name || '')
  // Search bar is hoisted into a const so we can render it in two
  // different positions without duplicating markup. On mobile it sits
  // on its own row below the brand+actions (full width). On desktop
  // it lives between the brand and the actions, single-row.
  const searchBar = onSearchChange ? (
    <div className="relative w-full min-w-0">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      <input
        type="text"
        placeholder="Search products..."
        value={searchInput || ''}
        onChange={onSearchChange}
        onKeyDown={(e) => { if (e.key === ' ') e.stopPropagation() }}
        className="w-full rounded-full border border-white/[0.12] py-2 pl-10 pr-10 text-sm text-white bg-white/[0.06] placeholder-slate-500"
        style={{ fontSize: '16px', outline: 'none' }}
        onFocus={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.3)'}
        onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
      />
      {/* Clear button — only when there's text. Synthesises an empty-
          value change event so the parent's onSearchChange handler
          updates state through its existing path. */}
      {searchInput && (
        <button
          type="button"
          onClick={() => onSearchChange({ target: { value: '' } })}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  ) : null
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#0f172a]/95 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 py-2.5">
        {/* Single row on desktop (≥ sm). On mobile the search bar
            wraps to a second row below brand + actions because
            crammed into one row it left only a few characters of
            input visible. */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 flex-shrink-0 min-w-0">
            <a
              href="/"
              className="text-base font-bold tracking-tight text-white truncate hover:opacity-80 transition-opacity"
              title={`${store?.name || 'ToGoGo'} — back to home`}
              aria-label={`${store?.name || 'ToGoGo'} home`}
            >
              {brandLeft}<span style={{ color: theme?.accent || '#FF6B35' }}>{brandRight}</span>
            </a>
          </div>
          {/* Desktop-only search slot — hidden on mobile (where the
              search renders below). Flex-1 so it eats the remaining
              middle space. */}
          {searchBar && (
            <div className="hidden sm:block flex-1 min-w-0">
              {searchBar}
            </div>
          )}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 ml-auto">
            {onTrackOrder && (
              <button
                onClick={onTrackOrder}
                className="flex items-center gap-1.5 rounded-xl px-2 sm:px-3 py-2 text-xs sm:text-sm text-slate-300 hover:text-white transition-colors border border-white/[0.08] hover:border-white/[0.15]"
              >
                <Package className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Track Order</span>
              </button>
            )}
            <a
              href="/auth"
              className="flex items-center gap-1.5 rounded-xl px-2 sm:px-3 py-2 text-xs sm:text-sm text-slate-300 hover:text-white transition-colors border border-white/[0.08] hover:border-white/[0.15]"
            >
              Sign In
            </a>
            <button
              onClick={onCartClick}
              className="relative flex items-center gap-2 rounded-xl px-3 sm:px-4 py-2 text-sm font-medium text-white transition-colors"
              style={{ backgroundColor: theme.accent }}
            >
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline">Cart</span>
              {cart.count > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white bg-red-500">
                  {cart.count}
                </span>
              )}
            </button>
          </div>
        </div>
        {/* Mobile-only search slot — full width below the top row. */}
        {searchBar && (
          <div className="sm:hidden mt-2">
            {searchBar}
          </div>
        )}
      </div>
    </header>
  )
}

// ─── Checkout View ────────────────────────────────────────────────────────
function CheckoutView({ store, cart, subdomain, theme, onBack, onSuccess }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', city: '', state: '', zip: '', country: 'Australia' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [shippingFee, setShippingFee] = useState(0)
  // Price drift state — populated when server detects the live AE total is
  // higher than what the customer saw in the cart. Setting the acknowledged
  // total causes the next submit to skip the drift check server-side.
  const [priceDrift, setPriceDrift] = useState(null)
  const [driftAcknowledgedTotal, setDriftAcknowledgedTotal] = useState(0)

  // Fetch shipping fee from admin settings
  useEffect(() => {
    fetch(`${API_BASE}/api/storefront/store?subdomain=${subdomain}&page=1&limit=1`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.shippingFee !== undefined) setShippingFee(parseFloat(data.shippingFee) || 0)
      })
      .catch(() => {})
  }, [subdomain])

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
          items: cart.items.map((i) => ({
            productId: i.id,
            quantity: i.quantity,
            // Variant identity flows through so checkout.js can look up the
            // variant's real price and the AE order.create can use the
            // customer's chosen SKU instead of auto-resolving.
            skuId: i.skuId || null,
            skuAttr: i.skuAttr || null,
            // What customer saw in their cart — used server-side to detect
            // price drift against them and show a warning if it happened.
            cartTotalUsd: (i.price + (i.shipping || 0)),
          })),
          // Set by the drift-confirmation flow: re-submit after customer
          // acknowledges the new total so server skips the drift check.
          acknowledgedDriftTotal: driftAcknowledgedTotal || undefined,
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

      // Server flagged a price drift against the customer — surface the
      // new total in a banner and let them confirm before we create
      // the Stripe session.
      if (data.priceUpdated) {
        setPriceDrift({
          oldTotalUsd: data.oldTotalUsd,
          newTotalUsd: data.newTotalUsd,
          message: data.message,
          priceDropped: !!data.priceDropped,  // true when AE is now cheaper
        })
        setSubmitting(false)
        return
      }

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

  // Customer clicked "Continue with new price" on the drift banner.
  // Record the acknowledged total and re-run handleSubmit so the server
  // skips the drift check.
  const confirmDriftAndSubmit = async () => {
    if (!priceDrift) return
    setDriftAcknowledgedTotal(priceDrift.newTotalUsd)
    setPriceDrift(null)
    // Re-submit programmatically — next handleSubmit sees the ack'd total
    setTimeout(() => {
      document.querySelector('form')?.requestSubmit()
    }, 0)
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
        {/* Price drift banner — shown when live AE total came back higher
            than what the customer saw in their cart. They confirm or
            cancel; no silent price increases. */}
        {priceDrift && (
          <div className="mb-5 rounded-xl border-2 border-amber-500 bg-amber-50 p-4 shadow-sm">
            <p className="text-sm font-bold text-amber-900 mb-1">Price updated at checkout</p>
            <p className="text-sm text-slate-800 mb-3">
              AliExpress changed the price while you were browsing.{' '}
              Previous: <span className="tabular-nums">A${priceDrift.oldTotalUsd.toFixed(2)}</span>
              {' → '}
              New: <span className="tabular-nums font-bold text-amber-900">A${priceDrift.newTotalUsd.toFixed(2)}</span>
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={confirmDriftAndSubmit}
                className="rounded-lg bg-amber-500 hover:bg-amber-400 px-4 py-2 text-xs font-semibold text-black"
              >
                Continue at new price
              </button>
              <button
                type="button"
                onClick={() => { setPriceDrift(null); onBack() }}
                className="rounded-lg border-2 border-amber-500 px-4 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100"
              >
                Back to cart
              </button>
            </div>
          </div>
        )}
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
              <div className={`flex justify-between text-sm ${shippingFee > 0 ? theme.textSecondary : 'text-emerald-400'}`}>
                <span>Shipping</span>
                <span>{shippingFee > 0 ? `A$${shippingFee.toFixed(2)}` : 'Free'}</span>
              </div>
              <div className={`flex justify-between text-base font-bold ${theme.textPrimary} pt-2 border-t`} style={{ borderColor: theme.accentLight }}>
                <span>Total</span>
                <span>A${(cart.total + shippingFee).toFixed(2)}</span>
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
            {submitting ? 'Placing Order...' : `Place Order — A$${(cart.total + shippingFee).toFixed(2)}`}
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
    // Strip dark inline text colours that are invisible on dark background
    .replace(/color\s*:\s*(#[0-3][0-9a-f]{5}|#[0-3][0-9a-f]{2}|rgb\s*\(\s*[0-9]{1,2}\s*,\s*[0-9]{1,2}\s*,\s*[0-9]{1,2}\s*\)|black)/gi, 'color: #e2e8f0')
    // Strip background-color that could clash with dark theme
    .replace(/background-color\s*:\s*(#[9a-f][0-9a-f]{5}|#[9a-f][0-9a-f]{2}|white|rgb\s*\(\s*2[0-9]{2}\s*,\s*2[0-9]{2}\s*,\s*2[0-9]{2}\s*\))/gi, 'background-color: transparent')
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
            <p className="text-xs text-slate-500 mt-1">{customer.order_count} order{customer.order_count !== 1 ? 's' : ''} · A${parseFloat(customer.total_spent || 0).toFixed(2)} total</p>
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
