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

// Curated products — used as fallback when DB is empty, and for the value/new tabs
const FEATURED = [
  { id: 'f1', name: 'Apple AirPods Pro 2', brand: 'Apple', category: 'electronics', image_url: 'https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?w=400&h=400&fit=crop', best_price: 189.99, original_price: 249.99, deal_score: 96, retailer_name: 'Amazon', price_count: 8, tag: 'trending' },
  { id: 'f2', name: 'Dyson V15 Detect Vacuum', brand: 'Dyson', category: 'home', image_url: 'https://images.unsplash.com/photo-1558317374-067fb5f30001?w=400&h=400&fit=crop', best_price: 449.00, original_price: 749.99, deal_score: 93, retailer_name: 'eBay', price_count: 5, tag: 'deal' },
  { id: 'f3', name: 'Samsung 65" Crystal UHD TV', brand: 'Samsung', category: 'electronics', image_url: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400&h=400&fit=crop', best_price: 597.00, original_price: 999.99, deal_score: 91, retailer_name: 'Best Buy', price_count: 12, tag: 'deal' },
  { id: 'f4', name: 'Nike Air Max 90', brand: 'Nike', category: 'fashion', image_url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop', best_price: 89.97, original_price: 130.00, deal_score: 85, retailer_name: 'Nike', price_count: 6, tag: 'trending' },
  { id: 'f5', name: 'Instant Pot Duo 7-in-1', brand: 'Instant Pot', category: 'home', image_url: 'https://images.unsplash.com/photo-1585515320310-259814833e62?w=400&h=400&fit=crop', best_price: 59.99, original_price: 89.99, deal_score: 87, retailer_name: 'Amazon', price_count: 7, tag: 'value' },
  { id: 'f6', name: 'Bose QuietComfort 45', brand: 'Bose', category: 'electronics', image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop', best_price: 229.00, original_price: 329.99, deal_score: 86, retailer_name: 'Target', price_count: 10, tag: 'deal' },
  { id: 'f7', name: 'KitchenAid Stand Mixer', brand: 'KitchenAid', category: 'home', image_url: 'https://images.unsplash.com/photo-1594385208974-2f8bb07dcc56?w=400&h=400&fit=crop', best_price: 279.99, original_price: 449.99, deal_score: 89, retailer_name: 'Amazon', price_count: 8, tag: 'trending' },
  { id: 'f8', name: 'Pampers Baby Dry Size 4', brand: 'Pampers', category: 'baby', image_url: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=400&h=400&fit=crop', best_price: 32.99, original_price: 54.99, deal_score: 92, retailer_name: 'Walmart', price_count: 9, tag: 'value' },
  { id: 'f9', name: 'Stanley Quencher H2.0 40oz', brand: 'Stanley', category: 'home', image_url: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&h=400&fit=crop', best_price: 35.00, original_price: 45.00, deal_score: 88, retailer_name: 'Amazon', price_count: 4, tag: 'trending' },
  { id: 'f10', name: 'CeraVe Moisturizing Cream 16oz', brand: 'CeraVe', category: 'health', image_url: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400&h=400&fit=crop', best_price: 14.99, original_price: 21.99, deal_score: 84, retailer_name: 'Walmart', price_count: 6, tag: 'value' },
  { id: 'f11', name: 'Meta Quest 3 128GB', brand: 'Meta', category: 'electronics', image_url: 'https://images.unsplash.com/photo-1622979135225-d2ba269cf1ac?w=400&h=400&fit=crop', best_price: 399.99, original_price: 499.99, deal_score: 90, retailer_name: 'Amazon', price_count: 5, tag: 'new' },
  { id: 'f12', name: 'Lululemon Align Leggings', brand: 'Lululemon', category: 'fashion', image_url: 'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=400&h=400&fit=crop', best_price: 68.00, original_price: 98.00, deal_score: 82, retailer_name: 'Lululemon', price_count: 3, tag: 'trending' },
  { id: 'f13', name: 'Crocs Classic Clog', brand: 'Crocs', category: 'fashion', image_url: 'https://images.unsplash.com/photo-1603808033192-082d6919d3e1?w=400&h=400&fit=crop', best_price: 34.99, original_price: 54.99, deal_score: 83, retailer_name: 'Amazon', price_count: 7, tag: 'value' },
  { id: 'f14', name: 'Sony WH-1000XM5', brand: 'Sony', category: 'electronics', image_url: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=400&h=400&fit=crop', best_price: 279.99, original_price: 399.99, deal_score: 94, retailer_name: 'Best Buy', price_count: 9, tag: 'deal' },
  { id: 'f15', name: 'Ninja Air Fryer AF101', brand: 'Ninja', category: 'home', image_url: 'https://images.unsplash.com/photo-1648411898498-1f7dd9e78e24?w=400&h=400&fit=crop', best_price: 69.99, original_price: 119.99, deal_score: 88, retailer_name: 'Target', price_count: 6, tag: 'deal' },
  { id: 'f16', name: 'Sydney to Melbourne Flight', brand: 'Jetstar', category: 'travel', image_url: 'https://images.unsplash.com/photo-1436491865332-7a61a109db05?w=400&h=400&fit=crop', best_price: 59.00, original_price: 129.00, deal_score: 93, retailer_name: 'Skyscanner', price_count: 6, tag: 'deal' },
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
          <img src={product.image_url} alt={product.name} className="h-36 w-full object-cover" />
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

  // Merge real data with curated fallbacks
  const trending = useMemo(() => {
    const real = normalizeDeals(trendingRaw)
    if (real) return real
    return FEATURED.filter((p) => p.tag === 'trending' || p.deal_score >= 85)
      .sort((a, b) => b.deal_score - a.deal_score)
  }, [trendingRaw])

  const hotDeals = useMemo(() => {
    const real = normalizeDeals(dealsRaw)
    if (real) return real
    return FEATURED.filter((p) => p.tag === 'deal' || getSavings(p.original_price, p.best_price) >= 25)
      .sort((a, b) => getSavings(b.original_price, b.best_price) - getSavings(a.original_price, a.best_price))
  }, [dealsRaw])

  const bestValue = useMemo(() => {
    return [...FEATURED]
      .filter((p) => p.tag === 'value' || p.best_price < 100)
      .sort((a, b) => a.best_price - b.best_price)
  }, [])

  const justAdded = useMemo(() => {
    return [...FEATURED]
      .filter((p) => p.tag === 'new' || p.tag === 'trending')
      .sort((a, b) => b.deal_score - a.deal_score)
  }, [])

  // Active products based on tab or search
  const activeProducts = useMemo(() => {
    if (query) {
      if (searchResults && searchResults.length > 0) return searchResults
      // Fallback: search curated products
      const q = query.toLowerCase()
      return FEATURED.filter(
        (p) => p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q)
      )
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
