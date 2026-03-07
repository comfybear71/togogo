import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, ChevronDown, X, Grid3X3, LayoutGrid } from 'lucide-react';
import SearchBar from '../components/ui/SearchBar';
import Card from '../components/ui/Card';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';
import { useProducts } from '../hooks/useProducts';
import { CATEGORIES, CONDITIONS } from '../lib/constants';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
  { value: 'most_viewed', label: 'Most Viewed' },
];

export default function BrowsePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [condition, setCondition] = useState(searchParams.get('condition') || '');
  const [minPrice, setMinPrice] = useState(searchParams.get('min') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('max') || '');
  const [sort, setSort] = useState(searchParams.get('sort') || 'newest');

  const filters = useMemo(() => ({
    query: query || undefined,
    category: category || undefined,
    condition: condition || undefined,
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    sort,
  }), [query, category, condition, minPrice, maxPrice, sort]);

  const { data: products, isLoading } = useProducts(filters);

  useEffect(() => {
    const params = {};
    if (query) params.q = query;
    if (category) params.category = category;
    if (condition) params.condition = condition;
    if (minPrice) params.min = minPrice;
    if (maxPrice) params.max = maxPrice;
    if (sort && sort !== 'newest') params.sort = sort;
    setSearchParams(params, { replace: true });
  }, [query, category, condition, minPrice, maxPrice, sort, setSearchParams]);

  const handleSearch = (q) => setQuery(q);

  const clearFilters = () => {
    setCategory('');
    setCondition('');
    setMinPrice('');
    setMaxPrice('');
    setSort('newest');
  };

  const hasActiveFilters = category || condition || minPrice || maxPrice;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Search Header */}
      <div className="sticky top-0 z-30 border-b border-gray-200 bg-white/80 backdrop-blur-lg dark:border-gray-800 dark:bg-gray-950/80">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <SearchBar onSearch={handleSearch} defaultValue={query} placeholder="Search products..." />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Filter Bar */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#FF6B35] text-xs text-white">
                {[category, condition, minPrice, maxPrice].filter(Boolean).length}
              </span>
            )}
          </button>

          {/* Quick category pills */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {CATEGORIES?.slice(0, 6).map((cat) => (
              <button
                key={cat.value || cat}
                onClick={() => setCategory(category === (cat.value || cat) ? '' : (cat.value || cat))}
                className={`flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  category === (cat.value || cat)
                    ? 'bg-[#FF6B35] text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800'
                }`}
              >
                {cat.label || cat}
              </button>
            ))}
          </div>

          {/* Sort dropdown */}
          <div className="relative ml-auto">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="appearance-none rounded-lg border border-gray-200 bg-white py-2 pl-4 pr-10 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:border-[#FF6B35] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>
        </div>

        {/* Expanded Filters Panel */}
        {showFilters && (
          <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-['Baloo_2'] text-lg font-bold text-gray-900 dark:text-white">
                Filters
              </h3>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 text-sm text-[#FF6B35] hover:underline"
                >
                  <X className="h-3 w-3" /> Clear all
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Category */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-[#FF6B35] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                >
                  <option value="">All Categories</option>
                  {CATEGORIES?.map((cat) => (
                    <option key={cat.value || cat} value={cat.value || cat}>
                      {cat.label || cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Condition */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Condition
                </label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-[#FF6B35] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                >
                  <option value="">Any Condition</option>
                  {CONDITIONS?.map((cond) => (
                    <option key={cond.value || cond} value={cond.value || cond}>
                      {cond.label || cond}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price Range */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Min Price
                </label>
                <input
                  type="number"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  placeholder="$0"
                  min="0"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-[#FF6B35] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Max Price
                </label>
                <input
                  type="number"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder="No limit"
                  min="0"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-[#FF6B35] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                />
              </div>
            </div>
          </div>
        )}

        {/* Results Info */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isLoading ? 'Searching...' : `${products?.length || 0} results`}
            {query && ` for "${query}"`}
          </p>
        </div>

        {/* Product Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-72 w-full rounded-xl" />
            ))}
          </div>
        ) : products?.length === 0 ? (
          <EmptyState
            icon="search"
            title="No products found"
            description="Try adjusting your filters or search with different keywords."
            action={
              <Button onClick={clearFilters} className="bg-[#FF6B35] text-white hover:bg-[#e55a2b]">
                Clear Filters
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products?.map((product) => (
              <Card key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
