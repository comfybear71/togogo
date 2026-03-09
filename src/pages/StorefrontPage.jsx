import { useState, useEffect, useMemo } from 'react'
import {
  ShoppingCart, Search, X, Plus, Minus, Trash2, Package, ChevronLeft,
  Store, Truck, Shield, Loader2, CheckCircle, AlertCircle,
} from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || ''

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
  const [error, setError] = useState(null)
  const [view, setView] = useState('grid') // grid | product | cart | checkout | success
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const cart = useCart(subdomain)

  useEffect(() => {
    fetch(`${API_BASE}/api/storefront/store?subdomain=${subdomain}`)
      .then((r) => r.ok ? r.json() : Promise.reject('Store not found'))
      .then((data) => setStoreData(data))
      .catch((err) => setError(typeof err === 'string' ? err : 'Failed to load store'))
      .finally(() => setLoading(false))
  }, [subdomain])

  const filteredProducts = useMemo(() => {
    if (!storeData?.products) return []
    return storeData.products.filter((p) => {
      if (searchQuery && !p.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
      if (selectedCategory && p.category !== selectedCategory) return false
      return true
    })
  }, [storeData?.products, searchQuery, selectedCategory])

  // ─── Loading / Error / Not Found ────────────────────────────────────
  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="text-center">
        <Loader2 className="mx-auto h-10 w-10 text-[#FF6B35] animate-spin" />
        <p className="mt-3 text-sm text-gray-500">Loading store...</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center max-w-md px-6">
        <Store className="mx-auto h-16 w-16 text-gray-300 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Store Not Found</h1>
        <p className="text-gray-500 mb-6">
          The store at <strong>{subdomain}.togogo.me</strong> doesn't exist or hasn't been set up yet.
        </p>
        <a href="https://togogo.me" className="inline-block rounded-xl bg-[#FF6B35] px-6 py-3 text-sm font-medium text-white hover:bg-[#FF6B35]/90">
          Visit ToGoGo
        </a>
      </div>
    </div>
  )

  const store = storeData.store

  // ─── Success View ────────────────────────────────────────────────────
  if (view === 'success') return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#06D6A0]/10">
          <CheckCircle className="h-10 w-10 text-[#06D6A0]" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Placed!</h1>
        <p className="text-gray-500 mb-6">
          Thank you for your order. {store.owner} will process it shortly and you'll receive updates via email.
        </p>
        <button
          onClick={() => { setView('grid'); cart.clear() }}
          className="rounded-xl bg-[#FF6B35] px-6 py-3 text-sm font-medium text-white hover:bg-[#FF6B35]/90"
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
      onBack={() => setView('cart')}
      onSuccess={() => setView('success')}
    />
  )

  // ─── Product Detail View ────────────────────────────────────────────
  if (view === 'product' && selectedProduct) return (
    <div className="min-h-screen bg-white">
      <StoreHeader store={store} cart={cart} onCartClick={() => setView('cart')} />
      <div className="mx-auto max-w-4xl px-4 py-8">
        <button
          onClick={() => setView('grid')}
          className="mb-6 flex items-center gap-1 text-sm text-gray-500 hover:text-[#FF6B35]"
        >
          <ChevronLeft className="h-4 w-4" /> Back to products
        </button>
        <div className="grid gap-8 md:grid-cols-2">
          <div className="aspect-square overflow-hidden rounded-2xl bg-gray-100">
            {selectedProduct.image ? (
              <img src={selectedProduct.image} alt={selectedProduct.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Package className="h-20 w-20 text-gray-300" />
              </div>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-[#FF6B35] mb-1">{selectedProduct.category}</p>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">{selectedProduct.title}</h1>
            <p className="text-3xl font-bold text-gray-900 mb-4">${selectedProduct.price.toFixed(2)}</p>
            {selectedProduct.description && (
              <p className="text-gray-600 mb-6 leading-relaxed">{selectedProduct.description}</p>
            )}
            <div className="flex gap-3 mb-6">
              <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
                <Truck className="h-4 w-4" /> Free Shipping
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
                <Shield className="h-4 w-4" /> Buyer Protection
              </div>
            </div>
            {selectedProduct.totalSold > 0 && (
              <p className="text-xs text-gray-400 mb-4">{selectedProduct.totalSold} sold</p>
            )}
            <button
              onClick={() => { cart.add(selectedProduct); setView('cart') }}
              className="w-full rounded-xl bg-[#FF6B35] py-3.5 text-sm font-semibold text-white hover:bg-[#FF6B35]/90 transition-colors"
            >
              Add to Cart — ${selectedProduct.price.toFixed(2)}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  // ─── Cart View ──────────────────────────────────────────────────────
  if (view === 'cart') return (
    <div className="min-h-screen bg-gray-50">
      <StoreHeader store={store} cart={cart} onCartClick={() => {}} />
      <div className="mx-auto max-w-2xl px-4 py-8">
        <button
          onClick={() => setView('grid')}
          className="mb-6 flex items-center gap-1 text-sm text-gray-500 hover:text-[#FF6B35]"
        >
          <ChevronLeft className="h-4 w-4" /> Continue shopping
        </button>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Your Cart ({cart.count})</h1>
        {cart.items.length === 0 ? (
          <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
            <ShoppingCart className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500">Your cart is empty</p>
            <button onClick={() => setView('grid')} className="mt-4 text-sm font-medium text-[#FF6B35] hover:underline">
              Browse products
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-3 mb-6">
              {cart.items.map((item) => (
                <div key={item.id} className="flex items-center gap-4 rounded-xl bg-white p-4 shadow-sm">
                  <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                    {item.image ? (
                      <img src={item.image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center"><Package className="h-6 w-6 text-gray-300" /></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{item.title}</p>
                    <p className="text-sm font-semibold text-gray-700">${item.price.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => cart.updateQty(item.id, item.quantity - 1)} className="rounded-lg bg-gray-100 p-1.5 hover:bg-gray-200">
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                    <button onClick={() => cart.updateQty(item.id, item.quantity + 1)} className="rounded-lg bg-gray-100 p-1.5 hover:bg-gray-200">
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="w-20 text-right font-semibold text-gray-900">${(item.price * item.quantity).toFixed(2)}</p>
                  <button onClick={() => cart.remove(item.id)} className="p-1.5 text-gray-400 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="rounded-xl bg-white p-5 shadow-sm">
              <div className="flex justify-between text-lg font-bold text-gray-900 mb-4">
                <span>Total</span>
                <span>${cart.total.toFixed(2)}</span>
              </div>
              <button
                onClick={() => setView('checkout')}
                className="w-full rounded-xl bg-[#FF6B35] py-3.5 text-sm font-semibold text-white hover:bg-[#FF6B35]/90"
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
    <div className="min-h-screen bg-gray-50">
      <StoreHeader store={store} cart={cart} onCartClick={() => setView('cart')} />

      {/* Hero */}
      <div className="bg-gradient-to-br from-[#FF6B35] to-[#FF8F5E] py-12 px-4 text-center text-white">
        <h1 className="text-3xl font-bold md:text-4xl">{store.name}</h1>
        <p className="mt-2 text-white/80">Quality products, fast shipping</p>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Search + Filters */}
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-[#FF6B35] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20"
            />
          </div>
          {storeData.categories.length > 0 && (
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-[#FF6B35] focus:outline-none"
            >
              <option value="">All Categories</option>
              {storeData.categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}
        </div>

        {/* Products */}
        {filteredProducts.length === 0 ? (
          <div className="rounded-2xl bg-white py-16 text-center shadow-sm">
            <Package className="mx-auto h-16 w-16 text-gray-300 mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {storeData.products.length === 0 ? 'Coming Soon' : 'No matches'}
            </h3>
            <p className="text-sm text-gray-500">
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
                className="group cursor-pointer overflow-hidden rounded-2xl bg-white shadow-sm transition-all hover:shadow-md"
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
                  <p className="text-xs text-gray-400 mb-0.5">{product.category}</p>
                  <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-2">{product.title}</h3>
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-bold text-gray-900">${product.price.toFixed(2)}</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); cart.add(product) }}
                      className="rounded-lg bg-[#FF6B35]/10 p-2 text-[#FF6B35] hover:bg-[#FF6B35] hover:text-white transition-colors"
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
      <footer className="border-t border-gray-200 bg-white py-6 text-center">
        <p className="text-xs text-gray-400">
          Powered by <a href="https://togogo.me" className="font-medium text-[#FF6B35] hover:underline">ToGoGo</a>
        </p>
      </footer>
    </div>
  )
}

// ─── Store Header ─────────────────────────────────────────────────────────
function StoreHeader({ store, cart, onCartClick }) {
  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FF6B35]">
            <Store className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold text-gray-900">{store.name}</span>
        </div>
        <button
          onClick={onCartClick}
          className="relative flex items-center gap-2 rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
        >
          <ShoppingCart className="h-4 w-4" />
          Cart
          {cart.count > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#FF6B35] text-xs font-bold text-white">
              {cart.count}
            </span>
          )}
        </button>
      </div>
    </header>
  )
}

// ─── Checkout View ────────────────────────────────────────────────────────
function CheckoutView({ store, cart, subdomain, onBack, onSuccess }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', city: '', state: '', zip: '', country: 'Australia' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.email) return setError('Name and email are required')

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`${API_BASE}/api/storefront/order`, {
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
      if (!res.ok) throw new Error(data.error || 'Failed to place order')
      onSuccess()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-4">
          <button onClick={onBack} className="rounded-lg p-1 hover:bg-gray-100">
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">Checkout</h1>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Order Summary */}
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Order Summary</h2>
            {cart.items.map((item) => (
              <div key={item.id} className="flex justify-between py-2 text-sm">
                <span className="text-gray-600">{item.title} x{item.quantity}</span>
                <span className="font-medium text-gray-900">${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div className="mt-3 border-t border-gray-100 pt-3 flex justify-between text-base font-bold text-gray-900">
              <span>Total</span>
              <span>${cart.total.toFixed(2)}</span>
            </div>
          </div>

          {/* Contact Details */}
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Contact Details</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="text" placeholder="Full Name *" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#FF6B35] focus:outline-none"
                required
              />
              <input
                type="email" placeholder="Email *" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#FF6B35] focus:outline-none"
                required
              />
              <input
                type="tel" placeholder="Phone" value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="col-span-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#FF6B35] focus:outline-none"
              />
            </div>
          </div>

          {/* Shipping Address */}
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Shipping Address</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="text" placeholder="Street Address" value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="col-span-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#FF6B35] focus:outline-none"
              />
              <input
                type="text" placeholder="City" value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#FF6B35] focus:outline-none"
              />
              <input
                type="text" placeholder="State" value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#FF6B35] focus:outline-none"
              />
              <input
                type="text" placeholder="Postcode" value={form.zip}
                onChange={(e) => setForm({ ...form, zip: e.target.value })}
                className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#FF6B35] focus:outline-none"
              />
              <input
                type="text" placeholder="Country" value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#FF6B35] focus:outline-none"
              />
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
            className="w-full rounded-xl bg-[#FF6B35] py-3.5 text-sm font-semibold text-white hover:bg-[#FF6B35]/90 disabled:opacity-50"
          >
            {submitting ? 'Placing Order...' : `Place Order — $${cart.total.toFixed(2)}`}
          </button>

          <p className="text-center text-xs text-gray-400">
            Powered by <a href="https://togogo.me" className="text-[#FF6B35] hover:underline">ToGoGo</a> — Secure checkout
          </p>
        </form>
      </div>
    </div>
  )
}
