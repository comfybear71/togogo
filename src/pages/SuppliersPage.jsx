import { useState } from 'react'
import { Search, Filter, TrendingUp, Package, Palette, ChevronDown, Loader2, ArrowDownUp } from 'lucide-react'
import { useSupplierSearch, useTrendingProducts, useSupplierCategories } from '../hooks/useSuppliers'

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Most Relevant' },
  { value: 'price_low', label: 'Lowest Cost' },
  { value: 'price_high', label: 'Highest Margin' },
  { value: 'fastest', label: 'Fastest Shipping' },
]

const ALL_SUPPLIERS = ['CJ Dropshipping', 'AliExpress', 'Printful', 'Printify', 'Gooten']

const SUPPLIER_FILTERS = [
  { value: 'CJ Dropshipping', label: '📦 CJ' },
  { value: 'AliExpress', label: '🛒 AliExpress' },
  { value: 'Printful', label: '🎨 Printful' },
  { value: 'Printify', label: '🖨️ Printify' },
  { value: 'Gooten', label: '🏭 Gooten' },
]

export default function SuppliersPage() {
  const [searchInput, setSearchInput] = useState('')
  const [query, setQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedSuppliers, setSelectedSuppliers] = useState(new Set(ALL_SUPPLIERS))
  const [sort, setSort] = useState('relevance')
  const [showFilters, setShowFilters] = useState(false)

  const allSelected = selectedSuppliers.size === ALL_SUPPLIERS.length

  const toggleSupplier = (supplier) => {
    setSelectedSuppliers(prev => {
      const next = new Set(prev)
      if (next.has(supplier)) {
        // Don't allow deselecting the last one
        if (next.size <= 1) return prev
        next.delete(supplier)
      } else {
        next.add(supplier)
      }
      return next
    })
  }

  const toggleAll = () => {
    setSelectedSuppliers(allSelected ? new Set([ALL_SUPPLIERS[0]]) : new Set(ALL_SUPPLIERS))
  }

  // Build comma-separated supplier string for API (only when not all selected)
  const suppliersParam = allSelected ? undefined : [...selectedSuppliers].join(',')

  const { data: searchData, isLoading: searching } = useSupplierSearch({
    query: query || undefined,
    category: selectedCategory || undefined,
    suppliers: suppliersParam,
    sort,
  })

  const { data: trendingData, isLoading: loadingTrending } = useTrendingProducts(selectedCategory, suppliersParam)
  const { data: catData } = useSupplierCategories()

  const categories = catData?.categories || []
  const products = query || selectedCategory ? (searchData?.products || []) : (trendingData?.products || [])
  const isLoading = searching || loadingTrending
  const isLive = searchData?.live || trendingData?.live

  const handleSearch = (e) => {
    e.preventDefault()
    const trimmed = searchInput.trim()
    if (trimmed) {
      setQuery(trimmed)
      setSelectedCategory('')
    } else {
      // Refresh — clear query to go back to trending view
      setQuery('')
      setSelectedCategory('')
    }
  }

  const handleCategoryClick = (catId) => {
    setSelectedCategory(catId)
    setQuery('')
    setSearchInput('')
  }

  return (
    <div className="py-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-white mb-1">Find Products to Sell</h1>
        <p className="text-xs text-zinc-500">
          Browse thousands of products from {SUPPLIER_FILTERS.length} suppliers — we handle setup for you
        </p>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search products (e.g. phone cases, t-shirts, LED lights...)"
          className="w-full rounded-xl bg-[#111] border border-white/[0.06] pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF6B35]/40 transition-colors"
        />
        <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-xs font-semibold bg-[#FF6B35] text-white rounded-lg hover:bg-[#FF6B35]/90 transition-colors">
          {searchInput ? 'Search' : 'Refresh'}
        </button>
      </form>

      {/* Filter bar */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${showFilters ? 'bg-[#FF6B35]/15 border-[#FF6B35]/30 text-[#FF6B35]' : 'bg-[#111] border-white/[0.06] text-zinc-400 hover:text-zinc-200'}`}
        >
          <Filter className="h-3 w-3" />
          Filters
          <ChevronDown className={`h-3 w-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>

        {!allSelected && (
          <div className="flex items-center gap-1 flex-wrap">
            {[...selectedSuppliers].map(s => {
              const filter = SUPPLIER_FILTERS.find(f => f.value === s)
              return (
                <button
                  key={s}
                  onClick={() => toggleSupplier(s)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-[#06D6A0]/15 border border-[#06D6A0]/30 text-[#06D6A0]"
                >
                  {filter?.label || s} &times;
                </button>
              )
            })}
            <button
              onClick={toggleAll}
              className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-white/5 border border-white/[0.06] text-zinc-400 hover:text-zinc-200"
            >
              Show all
            </button>
          </div>
        )}

        {query && (
          <span className="text-[10px] text-zinc-500">
            {searchData?.total || 0} results for &ldquo;{query}&rdquo;
          </span>
        )}

        {!isLive && (searchData || trendingData) && (
          <span className="ml-auto text-[10px] text-zinc-600 bg-zinc-800/50 px-2 py-0.5 rounded-full">
            Sample data
          </span>
        )}
      </div>

      {/* Expandable filters */}
      {showFilters && (
        <div className="mb-4 p-3 rounded-xl bg-[#111] border border-white/[0.06] space-y-3">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-1.5 block">Supplier</label>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={toggleAll}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${allSelected ? 'bg-white/10 border-white/20 text-white' : 'bg-transparent border-white/[0.06] text-zinc-500 hover:text-zinc-300'}`}
              >
                All Suppliers
              </button>
              {SUPPLIER_FILTERS.map((s) => (
                <button
                  key={s.value}
                  onClick={() => toggleSupplier(s.value)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${selectedSuppliers.has(s.value) ? 'bg-white/10 border-white/20 text-white' : 'bg-transparent border-white/[0.06] text-zinc-500 hover:text-zinc-300'}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-1.5 block">Sort by</label>
            <div className="flex flex-wrap gap-1.5">
              {SORT_OPTIONS.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setSort(s.value)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${sort === s.value ? 'bg-white/10 border-white/20 text-white' : 'bg-transparent border-white/[0.06] text-zinc-500 hover:text-zinc-300'}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Categories */}
      {!query && (
        <div className="mb-6">
          <h2 className="text-xs font-semibold text-zinc-400 mb-3 uppercase tracking-wider">Categories</h2>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory('')}
              className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${!selectedCategory ? 'bg-[#FF6B35]/15 border-[#FF6B35]/30 text-[#FF6B35]' : 'bg-[#111] border-white/[0.06] text-zinc-400 hover:text-zinc-200'}`}
            >
              <TrendingUp className="h-3 w-3 inline mr-1" />
              Trending
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat.id)}
                className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${selectedCategory === cat.id ? 'bg-[#FF6B35]/15 border-[#FF6B35]/30 text-[#FF6B35]' : 'bg-[#111] border-white/[0.06] text-zinc-400 hover:text-zinc-200'}`}
              >
                <span className="mr-1">{cat.emoji}</span>
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="h-6 w-6 text-[#FF6B35] animate-spin" />
          <p className="text-xs text-zinc-500">Searching {selectedSuppliers.size} supplier{selectedSuppliers.size !== 1 ? 's' : ''}...</p>
        </div>
      )}

      {/* Product grid */}
      {!isLoading && products.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && products.length === 0 && (query || selectedCategory) && (
        <div className="text-center py-16">
          <Package className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
          <p className="text-sm text-zinc-400 mb-1">No products found</p>
          <p className="text-xs text-zinc-600">Try a different search or browse categories</p>
        </div>
      )}

      {/* Initial state — no search yet */}
      {!isLoading && !query && !selectedCategory && products.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🔍</div>
          <p className="text-sm text-zinc-400 mb-1">Search for anything to sell</p>
          <p className="text-xs text-zinc-600">We'll find it across all our suppliers instantly</p>
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {['Phone cases', 'T-shirts', 'LED lights', 'Jewellery', 'Mugs'].map((idea) => (
              <button
                key={idea}
                onClick={() => { setSearchInput(idea); setQuery(idea) }}
                className="px-3 py-1.5 rounded-full text-xs font-medium bg-[#111] border border-white/[0.06] text-zinc-400 hover:text-white hover:border-white/[0.12] transition-colors"
              >
                {idea}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Product card with price comparison support
function ProductCard({ product }) {
  const [showAlts, setShowAlts] = useState(false)
  const hasImage = product.image && product.image.length > 0
  const hasAlternatives = product._alternatives && product._alternatives.length > 0

  return (
    <div className="group rounded-2xl bg-[#111] border border-white/[0.06] overflow-hidden hover:border-white/[0.12] transition-all duration-300">
      {/* Image */}
      <div className="aspect-square bg-[#0a0a0a] relative overflow-hidden">
        {hasImage ? (
          <img
            src={product.image}
            alt={product.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-4xl">{product.supplierLogo}</span>
          </div>
        )}

        {/* Supplier badge */}
        <div className="absolute top-2 left-2">
          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-black/70 text-zinc-300 backdrop-blur-sm">
            {product.supplierLogo} {product.supplier}
          </span>
        </div>

        {/* Best deal badge */}
        {product._bestDeal && hasAlternatives && (
          <div className="absolute bottom-2 left-2">
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-[#06D6A0]/90 text-black backdrop-blur-sm">
              Best Price
            </span>
          </div>
        )}

        {/* Customisable badge */}
        {product.customisable && (
          <div className="absolute top-2 right-2">
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-[#a78bfa]/20 text-[#a78bfa] backdrop-blur-sm flex items-center gap-0.5">
              <Palette className="h-2.5 w-2.5" />
              Custom
            </span>
          </div>
        )}

        {/* Multi-supplier indicator */}
        {hasAlternatives && !product.customisable && (
          <div className="absolute top-2 right-2">
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-[#FFD23F]/20 text-[#FFD23F] backdrop-blur-sm">
              {product._supplierCount} suppliers
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="text-xs font-semibold text-white leading-tight mb-2 line-clamp-2">
          {product.title}
        </h3>

        {/* Pricing row */}
        <div className="flex items-end justify-between mb-2">
          <div>
            <span className="text-[10px] text-zinc-600 block">Your cost</span>
            <span className="text-sm font-bold text-white">${product.totalCost.toFixed(2)}</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-zinc-600 block">Sell for</span>
            <span className="text-sm font-bold text-[#06D6A0]">${product.suggestedPrice.toFixed(2)}</span>
          </div>
        </div>

        {/* Margin bar */}
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 h-1.5 rounded-full bg-[#1a1a1a] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#06D6A0] to-[#FFD23F]"
              style={{ width: `${Math.min((product.suggestedMargin / product.suggestedPrice) * 100, 100)}%` }}
            />
          </div>
          <span className="text-[10px] font-semibold text-[#06D6A0]">
            ${product.suggestedMargin.toFixed(2)} profit
          </span>
        </div>

        {/* Delivery */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-zinc-500">
            {product.deliveryDays <= 7 ? '🚀' : '📦'} {product.deliveryDays} day delivery
          </span>
        </div>

        {/* Price comparison toggle */}
        {hasAlternatives && (
          <button
            onClick={() => setShowAlts(!showAlts)}
            className="w-full mt-2 flex items-center justify-center gap-1 py-1 text-[10px] font-medium text-[#FFD23F] hover:text-[#FFD23F]/80 transition-colors"
          >
            <ArrowDownUp className="h-3 w-3" />
            Compare {product._supplierCount} suppliers
          </button>
        )}

        {/* Alternative suppliers comparison */}
        {showAlts && product._alternatives && (
          <div className="mt-2 space-y-1.5 border-t border-white/[0.06] pt-2">
            {/* Current supplier */}
            <div className="flex items-center justify-between text-[10px] bg-[#06D6A0]/10 rounded-lg px-2 py-1.5">
              <span className="font-semibold text-[#06D6A0]">{product.supplierLogo} {product.supplier}</span>
              <span className="font-bold text-[#06D6A0]">${product.totalCost.toFixed(2)}</span>
            </div>
            {/* Alternatives */}
            {product._alternatives.map((alt) => (
              <div key={alt.id} className="flex items-center justify-between text-[10px] bg-white/[0.03] rounded-lg px-2 py-1.5">
                <div>
                  <span className="text-zinc-300">{alt.supplierLogo} {alt.supplier}</span>
                  <span className="text-zinc-600 ml-1">({alt.deliveryDays}d)</span>
                </div>
                <span className="font-semibold text-zinc-300">${alt.totalCost.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Sell button */}
        <button className="w-full mt-3 py-2 rounded-xl text-xs font-semibold bg-[#FF6B35] text-white hover:bg-[#FF6B35]/90 active:scale-[0.97] transition-all">
          Sell This Product
        </button>
      </div>
    </div>
  )
}
