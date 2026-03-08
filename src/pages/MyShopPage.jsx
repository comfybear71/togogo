import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Store, Package, Plus, Lock, Crown, Trash2, Eye, ExternalLink,
  TrendingUp, DollarSign, ShoppingBag, ArrowRight, Zap, Palette,
  Search, Filter, ChevronDown, AlertCircle, Rocket, Check, Star
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { DUMMY_PRODUCTS, DUMMY_SUPPLIERS, enrichProduct, getProductsForTier, getSuppliersForTier } from '../lib/dummyShopData'
import { SELLING_PLANS } from '../lib/constants'

function safe$(val) { return (Number(val) || 0).toFixed(2) }

export default function MyShopPage() {
  const navigate = useNavigate()
  const profile = useAuthStore(s => s.profile)
  const user = useAuthStore(s => s.user)

  // Simulated store state (persisted in localStorage)
  const [listedProducts, setListedProducts] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('togogo-listed-products') || '[]')
    } catch { return [] }
  })
  const [showAddModal, setShowAddModal] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [storeName] = useState(() => localStorage.getItem('togogo-store-name') || 'My Store')
  const [storeConnection] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('togogo-store-connection') || 'null')
    } catch { return null }
  })

  // Determine user tier
  const tier = profile?.subscription_plan?.toLowerCase() || 'free'
  const isPaid = tier === 'paid' || tier === 'basic' || tier === 'premium'
  const productLimit = isPaid ? Infinity : 1
  const canAddMore = listedProducts.length < productLimit

  // Save to localStorage whenever listed products change
  const saveProducts = (products) => {
    setListedProducts(products)
    localStorage.setItem('togogo-listed-products', JSON.stringify(products))
  }

  const addProduct = (product) => {
    if (!canAddMore) {
      setShowUpgradeModal(true)
      return
    }
    const newListed = [...listedProducts, { ...product, listedAt: new Date().toISOString(), status: 'active' }]
    saveProducts(newListed)
    setShowAddModal(false)
  }

  const removeProduct = (productId) => {
    saveProducts(listedProducts.filter(p => p.id !== productId))
  }

  // Available products for the "Add Product" modal
  const availableProducts = useMemo(() => {
    let products = getProductsForTier(tier)
    const listedIds = new Set(listedProducts.map(p => p.id))
    products = products.filter(p => !listedIds.has(p.id))
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      products = products.filter(p => p.title.toLowerCase().includes(q) || p.category.includes(q))
    }
    if (selectedCategory) {
      products = products.filter(p => p.category === selectedCategory)
    }
    return products
  }, [tier, listedProducts, searchQuery, selectedCategory])

  // Stats
  const totalRevenue = listedProducts.reduce((sum, p) => sum + (p.suggestedPrice || 0), 0)
  const totalProfit = listedProducts.reduce((sum, p) => sum + ((p.suggestedPrice || 0) - (p.cost || 0)), 0)

  if (!user) {
    return (
      <div className="py-16 text-center">
        <Store className="h-12 w-12 text-zinc-700 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-white mb-2">Sign in to manage your shop</h2>
        <p className="text-xs text-zinc-500 mb-6 max-w-[260px] mx-auto">
          Create an account to start listing products and building your store.
        </p>
        <Link
          to="/auth?redirect=/my-shop"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF6B35] text-white text-sm font-semibold hover:bg-[#FF6B35]/90 transition-colors"
        >
          Sign In <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    )
  }

  return (
    <div className="py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF6B35]/20 to-[#FFD23F]/20">
            <Store className="h-5 w-5 text-[#FF6B35]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-heading font-bold text-white">{storeName}</h1>
              {isPaid && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#FFD23F]/15 text-[#FFD23F] flex items-center gap-0.5">
                  <Crown className="h-2.5 w-2.5" /> PRO
                </span>
              )}
            </div>
            <p className="text-[10px] text-zinc-500">
              {storeConnection
                ? `Connected to ${storeConnection.platform}`
                : 'Demo mode — set up your store to go live'}
            </p>
          </div>
        </div>
        <button
          onClick={() => canAddMore ? setShowAddModal(true) : setShowUpgradeModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#FF6B35] text-white text-xs font-semibold hover:bg-[#FF6B35]/90 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Product
        </button>
      </div>


      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="rounded-xl bg-[#111] border border-white/[0.06] p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Package className="h-3 w-3 text-[#a78bfa]" />
            <span className="text-[9px] text-zinc-500 uppercase tracking-wider">Products</span>
          </div>
          <p className="text-lg font-bold text-white">{listedProducts.length}</p>
          <p className="text-[9px] text-zinc-600">
            {isPaid ? 'Unlimited' : `${productLimit - listedProducts.length} slot${productLimit - listedProducts.length !== 1 ? 's' : ''} left`}
          </p>
        </div>
        <div className="rounded-xl bg-[#111] border border-white/[0.06] p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <DollarSign className="h-3 w-3 text-[#06D6A0]" />
            <span className="text-[9px] text-zinc-500 uppercase tracking-wider">Potential</span>
          </div>
          <p className="text-lg font-bold text-white">${safe$(totalRevenue)}</p>
          <p className="text-[9px] text-zinc-600">Total listing value</p>
        </div>
        <div className="rounded-xl bg-[#111] border border-white/[0.06] p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="h-3 w-3 text-[#FFD23F]" />
            <span className="text-[9px] text-zinc-500 uppercase tracking-wider">Profit</span>
          </div>
          <p className="text-lg font-bold text-[#06D6A0]">${safe$(totalProfit)}</p>
          <p className="text-[9px] text-zinc-600">Per sale combined</p>
        </div>
      </div>

      {/* Listed Products */}
      {listedProducts.length > 0 ? (
        <div>
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
            Your Listed Products
          </h2>
          <div className="space-y-3">
            {listedProducts.map((product) => (
              <div key={product.id} className="rounded-xl bg-[#111] border border-white/[0.06] p-3">
                <div className="flex gap-3">
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-[#0a0a0a] flex-shrink-0">
                    {product.image ? (
                      <img src={product.image} alt={product.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-6 w-6 text-zinc-700" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="text-xs font-semibold text-white truncate">{product.title}</h3>
                        <p className="text-[10px] text-zinc-500 flex items-center gap-1 mt-0.5">
                          {product.supplierLogo} {product.supplier}
                          <span className="text-zinc-700">·</span>
                          <span className={product.status === 'active' ? 'text-emerald-400' : 'text-yellow-400'}>
                            {product.status === 'active' ? 'Live' : 'Draft'}
                          </span>
                        </p>
                      </div>
                      <button
                        onClick={() => removeProduct(product.id)}
                        className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-4 mt-2">
                      <div>
                        <span className="text-[9px] text-zinc-600">Cost</span>
                        <p className="text-[11px] font-medium text-zinc-300">${safe$(product.cost)}</p>
                      </div>
                      <div>
                        <span className="text-[9px] text-zinc-600">Price</span>
                        <p className="text-[11px] font-medium text-white">${safe$(product.suggestedPrice)}</p>
                      </div>
                      <div>
                        <span className="text-[9px] text-zinc-600">Profit</span>
                        <p className="text-[11px] font-bold text-[#06D6A0]">
                          +${safe$((product.suggestedPrice || 0) - (product.cost || 0))}
                        </p>
                      </div>
                      <div className="ml-auto">
                        <span className="text-[9px] text-zinc-600">Delivery</span>
                        <p className="text-[11px] text-zinc-400">{product.deliveryDays}d</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/[0.08] p-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#111] border border-white/[0.06] mx-auto mb-4">
            <ShoppingBag className="h-7 w-7 text-zinc-600" />
          </div>
          <h3 className="text-sm font-semibold text-white mb-1">No products listed yet</h3>
          <p className="text-xs text-zinc-500 mb-5 max-w-[240px] mx-auto">
            Add your first product to start selling. Browse our catalog and pick what you want to sell.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF6B35] text-white text-sm font-semibold hover:bg-[#FF6B35]/90 transition-colors"
          >
            <Plus className="h-4 w-4" /> Add Your First Product
          </button>
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3 mt-6">
        <Link
          to="/suppliers"
          className="flex items-center gap-3 p-4 rounded-xl bg-[#111] border border-white/[0.06] hover:border-white/[0.12] transition-colors"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FF6B35]/15">
            <Search className="h-4 w-4 text-[#FF6B35]" />
          </div>
          <div>
            <p className="text-xs font-semibold text-white">Browse Products</p>
            <p className="text-[10px] text-zinc-500">Find more to sell</p>
          </div>
        </Link>
        <Link
          to="/launch-store"
          className="flex items-center gap-3 p-4 rounded-xl bg-[#111] border border-white/[0.06] hover:border-white/[0.12] transition-colors"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#06D6A0]/15">
            <Rocket className="h-4 w-4 text-[#06D6A0]" />
          </div>
          <div>
            <p className="text-xs font-semibold text-white">Store Setup</p>
            <p className="text-[10px] text-zinc-500">Connect platforms</p>
          </div>
        </Link>
      </div>

      {/* ============================================ */}
      {/* ADD PRODUCT MODAL */}
      {/* ============================================ */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg max-h-[85vh] rounded-t-2xl sm:rounded-2xl bg-[#0a0a0a] border border-white/[0.08] flex flex-col">
            {/* Modal header */}
            <div className="p-4 border-b border-white/[0.06] flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white">Add Product to Your Shop</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-zinc-500 hover:text-white text-lg leading-none"
                >
                  &times;
                </button>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-600" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search products..."
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#111] border border-white/[0.06] text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF6B35]/40"
                  />
                </div>
              </div>
              {/* Category pills */}
              <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1 scrollbar-hide">
                <button
                  onClick={() => setSelectedCategory('')}
                  className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-colors ${!selectedCategory ? 'bg-[#FF6B35]/15 border-[#FF6B35]/30 text-[#FF6B35]' : 'bg-[#111] border-white/[0.06] text-zinc-500'}`}
                >
                  All
                </button>
                {['electronics', 'fashion', 'home', 'health', 'baby', 'sports', 'pets'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(selectedCategory === cat ? '' : cat)}
                    className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-colors capitalize ${selectedCategory === cat ? 'bg-[#FF6B35]/15 border-[#FF6B35]/30 text-[#FF6B35]' : 'bg-[#111] border-white/[0.06] text-zinc-500'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Product list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {availableProducts.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-8 w-8 text-zinc-700 mx-auto mb-2" />
                  <p className="text-xs text-zinc-500">No matching products found</p>
                </div>
              ) : (
                availableProducts.map((product) => {
                  const isLockedSupplier = !isPaid && DUMMY_SUPPLIERS.find(s => s.id === product.supplierId)?.tier === 'paid'
                  return (
                    <div
                      key={product.id}
                      className={`rounded-xl border p-3 transition-all ${
                        isLockedSupplier
                          ? 'bg-[#111] border-white/[0.04] opacity-50'
                          : 'bg-[#111] border-white/[0.06] hover:border-white/[0.12]'
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className="w-14 h-14 rounded-lg overflow-hidden bg-[#0a0a0a] flex-shrink-0">
                          {product.image ? (
                            <img src={product.image} alt={product.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl">
                              {product.supplierLogo}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-semibold text-white truncate">{product.title}</h4>
                          <p className="text-[10px] text-zinc-500 mt-0.5">
                            {product.supplierLogo} {product.supplier}
                            {product.customisable && (
                              <span className="ml-1 text-[#a78bfa]">
                                <Palette className="h-2.5 w-2.5 inline" /> Custom
                              </span>
                            )}
                          </p>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="text-[10px] text-zinc-600">Cost: <span className="text-zinc-300">${safe$(product.cost)}</span></span>
                            <span className="text-[10px] text-zinc-600">Sell: <span className="text-white font-medium">${safe$(product.suggestedPrice)}</span></span>
                            <span className="text-[10px] font-semibold text-[#06D6A0]">
                              +${safe$(product.margin)} profit
                            </span>
                          </div>
                        </div>
                        {isLockedSupplier ? (
                          <button
                            onClick={() => setShowUpgradeModal(true)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#FFD23F]/10 border border-[#FFD23F]/20 text-[10px] font-semibold text-[#FFD23F] flex-shrink-0 self-center"
                          >
                            <Lock className="h-3 w-3" /> Pro
                          </button>
                        ) : (
                          <button
                            onClick={() => addProduct(product)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#FF6B35] text-white text-[10px] font-semibold hover:bg-[#FF6B35]/90 transition-colors flex-shrink-0 self-center"
                          >
                            <Plus className="h-3 w-3" /> Add
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* UPGRADE MODAL */}
      {/* ============================================ */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-[#111] border border-white/[0.08] p-6">
            <div className="text-center mb-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFD23F]/15 mx-auto mb-3">
                <Crown className="h-6 w-6 text-[#FFD23F]" />
              </div>
              <h3 className="text-lg font-heading font-bold text-white mb-1">Upgrade to Pro Seller</h3>
              <p className="text-xs text-zinc-500 max-w-[260px] mx-auto">
                Unlock unlimited products, all suppliers, and your own branded store.
              </p>
            </div>

            <div className="rounded-xl bg-[#0a0a0a] border border-white/[0.06] p-4 mb-4">
              <div className="flex items-baseline justify-center gap-1 mb-3">
                <span className="text-2xl font-bold text-white">$19.99</span>
                <span className="text-xs text-zinc-500">/month</span>
              </div>
              <div className="space-y-2">
                {SELLING_PLANS[1].features.map((f, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-[#06D6A0] flex-shrink-0" />
                    <span className="text-[11px] text-zinc-400">{f}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                alert('Coming soon! Payment integration is on the way.')
                setShowUpgradeModal(false)
              }}
              className="w-full py-3 rounded-xl bg-[#FFD23F] text-black text-sm font-bold hover:bg-[#FFD23F]/90 transition-colors mb-2"
            >
              Upgrade Now
            </button>
            <button
              onClick={() => setShowUpgradeModal(false)}
              className="w-full py-2.5 text-xs text-zinc-500 hover:text-white transition-colors"
            >
              Maybe later
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
