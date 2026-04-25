import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Search, Plus, Check, Loader2, ArrowLeft, PackageSearch, AlertTriangle,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'

const API_BASE = import.meta.env.VITE_API_URL || ''

// Browse-and-pick product page for store owners. Lives INSIDE the
// ClientDashboardLayout (unlike the public /browse marketplace which
// is for customers), so refresh keeps them signed in and "Add to my
// shop" is the obvious primary action on every card.
//
// Search hits /api/dropship/search → AE results. Each tile has a single
// big "Add" button that POSTs to /api/my-shop/products/add. The button
// flips to a green "Added" tick on success and stays disabled. Errors
// surface in a small inline message under the card so the user knows
// what failed without losing their place in the grid.
//
// Designed for elderly users:
//   - One search field, one button. No advanced filters that obscure
//     the path forward.
//   - Suggestions row above the search: tappable example queries so
//     they don't face an empty input.
//   - Add button is full-width on each card, 48px tall, plain language.

const SUGGESTIONS = [
  'ladies fashion',
  'handbags',
  'kitchen gadgets',
  'home decor',
  'pet supplies',
  'kids toys',
  'phone accessories',
]

export default function BrowseProductsPage() {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const authLoading = useAuthStore(s => s.loading)
  const token = typeof window !== 'undefined' ? localStorage.getItem('togogo-token') : null

  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [products, setProducts] = useState([])
  const [searchError, setSearchError] = useState('')
  const [hasSearched, setHasSearched] = useState(false)

  // Per-product UI state. Keys = AE productId. Values = 'idle' | 'adding'
  // | 'added' | error message string.
  const [addState, setAddState] = useState({})

  useEffect(() => {
    if (authLoading) useAuthStore.getState().initialize?.()
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (!user || !token) navigate('/auth?redirect=/my-shop/browse')
  }, [user, token, authLoading])

  async function runSearch(q) {
    const trimmed = (q || '').trim()
    if (!trimmed) return
    setQuery(trimmed)
    setSearching(true)
    setSearchError('')
    setHasSearched(true)
    try {
      const res = await fetch(`${API_BASE}/api/dropship/search?query=${encodeURIComponent(trimmed)}&page=1`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setSearchError(data?.error || 'Search failed. Please try again.')
        setProducts([])
        return
      }
      setProducts(Array.isArray(data.products) ? data.products : [])
    } catch (err) {
      setSearchError('Could not reach the search service. Please try again.')
      setProducts([])
    } finally {
      setSearching(false)
    }
  }

  function onSubmit(e) {
    e.preventDefault()
    runSearch(query)
  }

  async function addToShop(product) {
    const aeId = product.productId || (product.id || '').replace(/^ae_/, '')
    if (!aeId) return
    setAddState(s => ({ ...s, [aeId]: 'adding' }))
    try {
      const res = await fetch(`${API_BASE}/api/my-shop/products/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          supplierProductId: aeId,
          category: product.category || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setAddState(s => ({ ...s, [aeId]: data?.error || 'Couldn\'t add this one — please try another.' }))
        return
      }
      setAddState(s => ({ ...s, [aeId]: 'added' }))
    } catch {
      setAddState(s => ({ ...s, [aeId]: 'Network error — please try again.' }))
    }
  }

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-8 text-[16px]">
      {/* Back to Add products */}
      <Link
        to="/my-shop/add-products"
        className="inline-flex items-center gap-2 text-[15px] text-zinc-400 hover:text-white mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>

      <h1 className="text-[28px] md:text-[34px] font-bold text-white mb-1">Browse and pick products</h1>
      <p className="text-[16px] text-zinc-400 mb-6">
        Search our supplier catalogue, then tap <span className="text-white font-medium">Add to my shop</span> on
        any product you'd like to sell. You can add as many as you like — they'll appear in your shop straight
        away.
      </p>

      {/* Search */}
      <form onSubmit={onSubmit} className="mb-4 flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" aria-hidden />
          <input
            type="text"
            inputMode="search"
            placeholder="Try 'ladies handbags' or 'home decor'…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border border-white/[0.08] bg-[#111] pl-11 pr-4 py-3 min-h-[52px] text-[16px] text-white placeholder:text-zinc-500 focus:border-[#FF6B35] focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={searching || !query.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FF6B35] hover:bg-[#FF8255] disabled:opacity-60 disabled:cursor-wait px-5 min-h-[52px] text-[16px] font-semibold text-white"
        >
          {searching ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Search className="h-5 w-5" aria-hidden />}
          {searching ? 'Searching…' : 'Search'}
        </button>
      </form>

      {/* Suggestions */}
      <div className="mb-8 flex flex-wrap gap-2">
        {SUGGESTIONS.map(s => (
          <button
            key={s}
            type="button"
            onClick={() => runSearch(s)}
            className="rounded-full border border-white/[0.08] bg-[#0f0f0f] hover:bg-white/[0.06] px-4 py-1.5 text-[14px] text-zinc-300"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Errors */}
      {searchError && (
        <div className="mb-6 rounded-xl border border-red-500/40 bg-red-500/[0.08] p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" aria-hidden />
          <p className="text-[15px] text-red-200">{searchError}</p>
        </div>
      )}

      {/* Empty state */}
      {!searching && hasSearched && products.length === 0 && !searchError && (
        <div className="rounded-2xl border border-white/[0.06] bg-[#111] p-12 text-center">
          <PackageSearch className="h-10 w-10 text-zinc-600 mx-auto mb-3" aria-hidden />
          <h3 className="text-[18px] font-semibold text-white mb-1">No matches for "{query}"</h3>
          <p className="text-[15px] text-zinc-400">Try a broader term or one of the suggestions above.</p>
        </div>
      )}

      {/* Initial coaching */}
      {!hasSearched && (
        <div className="rounded-2xl border border-white/[0.06] bg-[#111] p-12 text-center">
          <Search className="h-10 w-10 text-zinc-600 mx-auto mb-3" aria-hidden />
          <h3 className="text-[18px] font-semibold text-white mb-1">Type a search to start</h3>
          <p className="text-[15px] text-zinc-400">
            Use the search box above, or tap one of the suggestion chips to explore.
          </p>
        </div>
      )}

      {/* Results grid */}
      {products.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => {
            const aeId = p.productId || (p.id || '').replace(/^ae_/, '')
            const state = addState[aeId] || 'idle'
            const isAdded = state === 'added'
            const isAdding = state === 'adding'
            const errorMsg = (state !== 'idle' && state !== 'adding' && state !== 'added') ? state : null
            return (
              <div
                key={p.id || aeId}
                className="rounded-xl overflow-hidden border border-white/[0.06] bg-[#111] flex flex-col"
              >
                <div className="aspect-square bg-[#0a0a0a] overflow-hidden">
                  {p.image ? (
                    <img src={p.image} alt={p.title} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <PackageSearch className="h-8 w-8 text-zinc-700" />
                    </div>
                  )}
                </div>
                <div className="p-3 flex flex-col flex-1">
                  <h3 className="text-[14px] text-white line-clamp-2 leading-tight mb-2">{p.title}</h3>
                  <button
                    type="button"
                    onClick={() => addToShop(p)}
                    disabled={isAdding || isAdded}
                    className={`mt-auto inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 min-h-[48px] text-[15px] font-semibold transition-colors ` +
                      (isAdded
                        ? 'bg-emerald-500/15 text-emerald-300 cursor-default'
                        : isAdding
                        ? 'bg-white/[0.06] text-zinc-300 cursor-wait'
                        : 'bg-[#FF6B35] hover:bg-[#FF8255] text-white')}
                  >
                    {isAdded ? <Check className="h-4 w-4" aria-hidden /> :
                     isAdding ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> :
                     <Plus className="h-4 w-4" aria-hidden />}
                    {isAdded ? 'Added' : isAdding ? 'Adding…' : 'Add to my shop'}
                  </button>
                  {errorMsg && (
                    <p className="mt-2 text-[12px] text-red-300">{errorMsg}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
