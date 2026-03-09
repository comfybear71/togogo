import { useState, useMemo } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  Search, ChevronDown, PackageSearch, ArrowRight,
  Flame, Zap, DollarSign, Clock, Star
} from 'lucide-react'
import { useProductSearch, useTrendingProducts, useDailyDeals } from '../hooks/useProducts'
import { CATEGORIES } from '../lib/constants'

const SORT_OPTIONS = [
  { value: 'deal_score', label: 'Best Deal' },
  { value: 'price_low', label: 'Price: Low' },
  { value: 'price_high', label: 'Price: High' },
  { value: 'newest', label: 'Newest' },
]

const TABS = [
  { id: 'trending', label: 'Trending', icon: Flame, color: '#FF6B35' },
  { id: 'deals', label: 'Hot Deals', icon: Zap, color: '#FFD23F' },
  { id: 'value', label: 'Best Value', icon: DollarSign, color: '#06D6A0' },
  { id: 'new', label: 'Just Added', icon: Clock, color: '#a78bfa' },
]

function getSavings(original, best) {
  if (!original || original <= best) return 0
  return Math.round(((original - best) / original) * 100)
}

function normalizeDeals(data) {
  if (!data || data.length === 0) return null
  return data.map((d) => ({
    id: d.product?.id || d.id,
    name: d.product?.name || d.name,
    brand: d.product?.brand || '',
    image_url: d.product?.image_url || '',
    best_price: d.price || d.product?.best_price || 0,
    original_price: d.original_price || d.product?.original_price || 0,
    deal_score: d.deal_score || 0,
    retailer_name: d.retailer?.name || '',
    price_count: d.product?.price_count || 1,
    category: d.product?.category || '',
  }))
}

function ProductCard({ product, rank }) {
  const savings = getSavings(product.original_price, product.best_price)

  return (
    <Link
      to={`/product/${product.id}`}
      className="group block rounded-2xl border border-white/5 bg-[#111] overflow-hidden transition-all duration-200 hover:border-white/10"
    >
      {/* Image */}
      <div className="relative">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="h-36 w-full object-cover"
            onError={(e) => {
              e.target.style.display = 'none'
              const fallback = document.createElement('div')
              fallback.className = 'flex flex-col h-36 w-full items-center justify-center bg-[#0a0a0a]'
              fallback.innerHTML = '<span class="text-2xl font-bold text-zinc-600">' + (product.brand?.charAt(0) || '?') + '</span>'
              e.target.parentElement.insertBefore(fallback, e.target)
            }}
          />
        ) : (
          <div className="flex flex-col h-36 w-full items-center justify-center bg-[#0a0a0a]">
            <PackageSearch className="h-8 w-8 text-zinc-700" />
          </div>
        )}
        {savings > 0 && (
          <span className="absolute right-2 top-2 rounded-full bg-[#FF6B35] px-2 py-0.5 text-[10px] font-bold text-white">
            -{savings}%
          </span>
        )}
        {rank && (
          <span className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-[10px] font-bold text-white backdrop-blur-sm">
            {rank}
          </span>
        )}
        {product.deal_score >= 90 && (
          <span className="absolute left-2 bottom-2 flex items-center gap-1 rounded-full bg-[#FFD23F]/90 px-2 py-0.5 text-[9px] font-bold text-black">
            <Star className="h-2.5 w-2.5" /> TOP DEAL
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-[10px] font-medium text-zinc-500 mb-0.5">{product.brand}</p>
        <h3 className="text-xs font-semibold text-white leading-snug line-clamp-2 mb-2">
          {product.name}
        </h3>
        <div className="flex items-baseline gap-2 mb-1.5">
          <span className="text-base font-bold text-[#06D6A0]">
            ${product.best_price.toFixed(2)}
          </span>
          {savings > 0 && (
            <span className="text-[10px] text-zinc-600 line-through">
              ${product.original_price.toFixed(2)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-white/5">
          <span className="text-[10px] text-zinc-600">{product.retailer_name}</span>
          <span className="flex items-center gap-1 text-[10px] font-medium text-zinc-400 group-hover:text-[#FF6B35] transition-colors">
            {product.price_count} prices <ArrowRight className="h-2.5 w-2.5" />
          </span>
        </div>
      </div>
    </Link>
  )
}

function ProductCardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-white/5 bg-[#111] overflow-hidden">
      <div className="h-36 w-full bg-[#0a0a0a]" />
      <div className="p-3">
        <div className="mb-1 h-2.5 w-1/4 rounded bg-[#0a0a0a]" />
        <div className="mb-2 h-3 w-3/4 rounded bg-[#0a0a0a]" />
        <div className="mb-1 h-5 w-1/3 rounded bg-[#0a0a0a]" />
        <div className="mt-2 pt-2 border-t border-white/5 h-3 w-1/3 rounded bg-[#0a0a0a]" />
      </div>
    </div>
  )
}

export default function BrowsePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState('trending')
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [inputValue, setInputValue] = useState(searchParams.get('q') || '')
  const [category, setCategory] = useState(searchParams.get('category') || '')
  const [sort, setSort] = useState('deal_score')

  // Real data from Supabase
  const { data: trendingRaw, isLoading: trendingLoading } = useTrendingProducts()
  const { data: dealsRaw, isLoading: dealsLoading } = useDailyDeals()
  const { data: searchResults, isLoading: searchLoading } = useProductSearch(
    query ? { query, category: category || undefined, sort } : {}
  )

  // Real data only — no fallback dummy data
  const trending = useMemo(() => {
    return normalizeDeals(trendingRaw) || []
  }, [trendingRaw])

  const hotDeals = useMemo(() => {
    return normalizeDeals(dealsRaw) || []
  }, [dealsRaw])

  const bestValue = useMemo(() => [], [])
  const justAdded = useMemo(() => [], [])

  // Active products based on tab or search
  const activeProducts = useMemo(() => {
    if (query) {
      return (searchResults && searchResults.length > 0) ? searchResults : []
    }
    switch (activeTab) {
      case 'trending': return trending
      case 'deals': return hotDeals
      case 'value': return bestValue
      case 'new': return justAdded
      default: return trending
    }
  }, [activeTab, trending, hotDeals, bestValue, justAdded, query, searchResults])

  // Filter by category
  const filteredProducts = useMemo(() => {
    let results = !category ? activeProducts : activeProducts.filter((p) => p.category === category)

    // Sort
    if (sort === 'price_low') results = [...results].sort((a, b) => a.best_price - b.best_price)
    if (sort === 'price_high') results = [...results].sort((a, b) => b.best_price - a.best_price)
    if (sort === 'deal_score') results = [...results].sort((a, b) => (b.deal_score || 0) - (a.deal_score || 0))

    return results
  }, [activeProducts, category, sort])

  const isLoading = query ? searchLoading : (activeTab === 'trending' ? trendingLoading : dealsLoading)

  const handleSearch = (e) => {
    e.preventDefault()
    const trimmed = inputValue.trim()
    setQuery(trimmed)
    setSearchParams(trimmed ? { q: trimmed } : {}, { replace: true })
  }

  const activeTabData = TABS.find((t) => t.id === activeTab)

  return (
    <div className="min-h-screen bg-[#050505]">
      {/* Sticky search */}
      <div className="sticky top-16 z-30 bg-[#0a0a0a]/90 backdrop-blur-xl border-b border-white/5">
        <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Search any product or brand..."
                className="w-full rounded-xl border border-white/10 bg-[#111] py-3 pl-10 pr-4 text-sm text-white placeholder-zinc-500 transition-all focus:border-[#FF6B35]/40 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="rounded-xl bg-[#FF6B35] px-5 text-sm font-semibold text-white transition-all hover:brightness-110"
            >
              Search
            </button>
          </form>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
        {/* Discovery tabs — hide when searching */}
        {!query && (
          <div className="flex gap-2 mb-5 overflow-x-auto scrollbar-hide pb-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'text-white'
                    : 'bg-[#111] text-zinc-400 border border-white/[0.06] hover:border-white/[0.12]'
                }`}
                style={activeTab === tab.id ? { backgroundColor: tab.color } : {}}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Category pills */}
        <div className="mb-5 overflow-x-auto scrollbar-hide pb-1">
          <div className="flex gap-2">
            <button
              onClick={() => setCategory('')}
              className={`flex-shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition-all ${
                !category
                  ? 'bg-[#FF6B35]/10 border border-[#FF6B35]/30 text-[#FF6B35]'
                  : 'border border-white/5 bg-[#111] text-zinc-400 hover:border-white/10'
              }`}
            >
              All
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(category === cat.id ? '' : cat.id)}
                className={`flex flex-shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition-all ${
                  category === cat.id
                    ? 'bg-[#FF6B35]/10 border border-[#FF6B35]/30 text-[#FF6B35]'
                    : 'border border-white/5 bg-[#111] text-zinc-400 hover:border-white/10'
                }`}
              >
                <span className="text-xs">{cat.emoji}</span>
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Section heading + sort */}
        <div className="flex items-center justify-between mb-5">
          <div>
            {query ? (
              <p className="text-sm text-zinc-400">
                {filteredProducts.length} result{filteredProducts.length !== 1 ? 's' : ''}
                <span className="text-zinc-600"> for "{query}"</span>
              </p>
            ) : (
              <div className="flex items-center gap-2">
                {activeTabData && (
                  <activeTabData.icon className="h-4 w-4" style={{ color: activeTabData.color }} />
                )}
                <p className="text-sm font-semibold text-white">
                  {activeTab === 'trending' && 'Trending Now'}
                  {activeTab === 'deals' && 'Hottest Deals'}
                  {activeTab === 'value' && 'Best Value for Money'}
                  {activeTab === 'new' && 'Just Added'}
                </p>
                <span className="text-xs text-zinc-600 ml-1">
                  {filteredProducts.length} items
                </span>
              </div>
            )}
          </div>
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="appearance-none rounded-xl border border-white/10 bg-[#111] py-2 pl-3 pr-8 text-[11px] font-medium text-zinc-300 hover:border-white/20 focus:outline-none cursor-pointer"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-[#111]">
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-zinc-500" />
          </div>
        </div>

        {/* Product grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="mx-auto max-w-sm py-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#111] border border-white/5">
              <PackageSearch className="h-8 w-8 text-zinc-700" />
            </div>
            <h2 className="mb-2 text-lg font-bold text-zinc-300">No results found</h2>
            <p className="mb-6 text-xs text-zinc-500">
              Try a different search or browse the categories above.
            </p>
            <button
              onClick={() => { setQuery(''); setInputValue(''); setCategory('') }}
              className="rounded-xl bg-[#111] border border-white/5 px-5 py-2.5 text-xs font-semibold text-zinc-300 hover:border-white/10 transition-all"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {filteredProducts.map((product, i) => (
              <ProductCard
                key={product.id}
                product={product}
                rank={!query && activeTab === 'trending' ? i + 1 : null}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
