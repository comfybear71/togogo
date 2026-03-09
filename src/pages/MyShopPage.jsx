import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Store, Package, Plus, Crown, Trash2, Eye, ExternalLink,
  TrendingUp, DollarSign, ShoppingBag, ArrowRight, Palette,
  Search, Loader2, Rocket, Check
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { STOREFRONT_THEMES, getThemeById, DEFAULT_THEME_ID } from '../lib/storefrontThemes'

const API_BASE = import.meta.env.VITE_API_URL || ''

function safe$(val) { return (Number(val) || 0).toFixed(2) }

export default function MyShopPage() {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const token = useAuthStore(s => s.token)

  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [storeTheme, setStoreTheme] = useState(DEFAULT_THEME_ID)
  const [showThemePicker, setShowThemePicker] = useState(false)
  const [storeName, setStoreName] = useState('My Store')
  const [storeSubdomain, setStoreSubdomain] = useState(null)
  const [commissionRate, setCommissionRate] = useState(0.05)

  useEffect(() => {
    if (user && token) {
      fetchProducts()
      fetchStoreInfo()
      fetchCommission()
    }
  }, [user, token])

  async function fetchCommission() {
    try {
      const res = await fetch(`${API_BASE}/api/config/commission`)
      if (res.ok) {
        const data = await res.json()
        setCommissionRate((data.commissionPercent || 5) / 100)
      }
    } catch { /* use default */ }
  }

  async function fetchProducts() {
    try {
      const res = await fetch(`${API_BASE}/api/my-shop/products`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setProducts(data.products || [])
      }
    } catch (err) {
      console.error('Failed to fetch products:', err)
    } finally {
      setLoading(false)
    }
  }

  async function fetchStoreInfo() {
    try {
      const res = await fetch(`${API_BASE}/api/admin/stores`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        const myStore = (data.stores || []).find(s => s.user_id === user?.id)
        if (myStore) {
          setStoreName(myStore.store_name || 'My Store')
          setStoreSubdomain(myStore.subdomain)
        }
      }
    } catch { /* ignore */ }
  }

  async function removeProduct(productId) {
    try {
      await fetch(`${API_BASE}/api/my-shop/products?id=${productId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      setProducts(products.filter(p => p.id !== productId))
    } catch (err) {
      console.error('Failed to delete product:', err)
    }
  }

  // Cost displayed to user = supplier_cost + ToGoGo commission (shown as one number)
  function getUserCost(product) {
    const supplierCost = parseFloat(product.supplier_cost) || 0
    return supplierCost + (supplierCost * commissionRate)
  }

  // Stats
  const totalRevenue = products.reduce((sum, p) => sum + (parseFloat(p.sale_price) || 0), 0)
  const totalProfit = products.reduce((sum, p) => {
    const cost = getUserCost(p)
    return sum + ((parseFloat(p.sale_price) || 0) - cost)
  }, 0)

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF6B35]" />
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
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#FFD23F]/15 text-[#FFD23F] flex items-center gap-0.5">
                <Crown className="h-2.5 w-2.5" /> PRO
              </span>
            </div>
            <p className="text-[10px] text-zinc-500">
              {storeSubdomain
                ? <a href={`https://${storeSubdomain}.togogo.me`} target="_blank" rel="noopener noreferrer" className="text-[#FF6B35] hover:underline">{storeSubdomain}.togogo.me</a>
                : 'Set up your store to go live'}
            </p>
          </div>
        </div>
        <Link
          to="/suppliers"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#FF6B35] text-white text-xs font-semibold hover:bg-[#FF6B35]/90 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Product
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="rounded-xl bg-[#111] border border-white/[0.06] p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Package className="h-3 w-3 text-[#a78bfa]" />
            <span className="text-[9px] text-zinc-500 uppercase tracking-wider">Products</span>
          </div>
          <p className="text-lg font-bold text-white">{products.length}</p>
          <p className="text-[9px] text-zinc-600">Unlimited</p>
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

      {/* Store Theme */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Store Theme</h2>
          <button
            onClick={() => setShowThemePicker(!showThemePicker)}
            className="flex items-center gap-1.5 text-[10px] font-medium text-[#FF6B35] hover:text-[#FF6B35]/80 transition-colors"
          >
            <Palette className="h-3 w-3" />
            {showThemePicker ? 'Close' : 'Change Theme'}
          </button>
        </div>

        {!showThemePicker && (
          <div className="rounded-xl bg-[#111] border border-white/[0.06] p-3 flex items-center gap-3">
            <div className="flex gap-1">
              <div className="h-8 w-8 rounded-lg" style={{ backgroundColor: getThemeById(storeTheme).preview.bg, border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="h-full w-full rounded-lg flex items-center justify-center">
                  <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: getThemeById(storeTheme).preview.accent }} />
                </div>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-white">{getThemeById(storeTheme).name}</p>
              <p className="text-[10px] text-zinc-500">{getThemeById(storeTheme).description}</p>
            </div>
            {storeSubdomain && (
              <a
                href={`https://${storeSubdomain}.togogo.me`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/[0.04] text-[10px] font-medium text-zinc-400 hover:text-white transition-colors"
              >
                <Eye className="h-3 w-3" /> Preview
              </a>
            )}
          </div>
        )}

        {showThemePicker && (
          <div className="grid grid-cols-2 gap-2">
            {STOREFRONT_THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => setStoreTheme(t.id)}
                className={`rounded-xl border p-3 text-left transition-all ${
                  storeTheme === t.id
                    ? 'border-[#FF6B35]/50 bg-[#FF6B35]/5'
                    : 'border-white/[0.06] bg-[#111] hover:border-white/[0.12]'
                }`}
              >
                <div className="h-16 rounded-lg mb-2 overflow-hidden flex flex-col" style={{ backgroundColor: t.preview.bg }}>
                  <div className="h-5 w-full" style={{ backgroundColor: t.preview.accent }} />
                  <div className="flex-1 p-1.5 flex gap-1">
                    <div className="flex-1 rounded-sm" style={{ backgroundColor: t.preview.card, border: '1px solid rgba(0,0,0,0.05)' }} />
                    <div className="flex-1 rounded-sm" style={{ backgroundColor: t.preview.card, border: '1px solid rgba(0,0,0,0.05)' }} />
                    <div className="flex-1 rounded-sm" style={{ backgroundColor: t.preview.card, border: '1px solid rgba(0,0,0,0.05)' }} />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-white">{t.name}</p>
                    <p className="text-[9px] text-zinc-500">{t.description}</p>
                  </div>
                  {storeTheme === t.id && <Check className="h-4 w-4 text-[#FF6B35] flex-shrink-0" />}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Listed Products */}
      {products.length > 0 ? (
        <div>
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
            Your Listed Products
          </h2>
          <div className="space-y-3">
            {products.map((product) => {
              const cost = getUserCost(product)
              const salePrice = parseFloat(product.sale_price) || 0
              const profit = salePrice - cost
              return (
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
                            {product.supplier}
                            <span className="text-zinc-700">·</span>
                            <span className={product.is_active ? 'text-emerald-400' : 'text-yellow-400'}>
                              {product.is_active ? 'Live' : 'Draft'}
                            </span>
                            {product.category && (
                              <>
                                <span className="text-zinc-700">·</span>
                                <span className="text-zinc-500">{product.category}</span>
                              </>
                            )}
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
                          <p className="text-[11px] font-medium text-zinc-300">${safe$(cost)}</p>
                        </div>
                        <div>
                          <span className="text-[9px] text-zinc-600">Price</span>
                          <p className="text-[11px] font-medium text-white">${safe$(salePrice)}</p>
                        </div>
                        <div>
                          <span className="text-[9px] text-zinc-600">Profit</span>
                          <p className={`text-[11px] font-bold ${profit > 0 ? 'text-[#06D6A0]' : 'text-red-400'}`}>
                            {profit > 0 ? '+' : ''}${safe$(profit)}
                          </p>
                        </div>
                        {product.total_sold > 0 && (
                          <div className="ml-auto">
                            <span className="text-[9px] text-zinc-600">Sold</span>
                            <p className="text-[11px] text-zinc-400">{product.total_sold}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/[0.08] p-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#111] border border-white/[0.06] mx-auto mb-4">
            <ShoppingBag className="h-7 w-7 text-zinc-600" />
          </div>
          <h3 className="text-sm font-semibold text-white mb-1">No products listed yet</h3>
          <p className="text-xs text-zinc-500 mb-5 max-w-[240px] mx-auto">
            Add your first product to start selling. Browse our supplier catalog and pick what you want to sell.
          </p>
          <Link
            to="/suppliers"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF6B35] text-white text-sm font-semibold hover:bg-[#FF6B35]/90 transition-colors"
          >
            <Plus className="h-4 w-4" /> Add Your First Product
          </Link>
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
    </div>
  )
}
