import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, ChevronDown, PackageSearch, ArrowRight } from 'lucide-react';
import { useProductSearch } from '../hooks/useProducts';
import { CATEGORIES } from '../lib/constants';

const SORT_OPTIONS = [
  { value: 'deal_score', label: 'Best Deal' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
  { value: 'newest', label: 'Newest' },
];

const MOCK_RESULTS = [
  { id: '1', name: 'Apple AirPods Pro 2', brand: 'Apple', category: 'electronics', image_url: '', best_price: 189.99, original_price: 249.99, deal_score: 95, retailer_name: 'Amazon', price_count: 8 },
  { id: '2', name: 'Dyson V15 Detect Vacuum', brand: 'Dyson', category: 'home', image_url: '', best_price: 449.00, original_price: 749.99, deal_score: 90, retailer_name: 'eBay', price_count: 5 },
  { id: '3', name: 'Samsung 65" Crystal UHD TV', brand: 'Samsung', category: 'electronics', image_url: '', best_price: 597.00, original_price: 999.99, deal_score: 88, retailer_name: 'Best Buy', price_count: 12 },
  { id: '4', name: 'Nike Air Max 90 Sneakers', brand: 'Nike', category: 'fashion', image_url: '', best_price: 89.97, original_price: 130.00, deal_score: 85, retailer_name: 'Nike', price_count: 6 },
  { id: '5', name: 'Pampers Baby Dry Size 4', brand: 'Pampers', category: 'baby', image_url: '', best_price: 32.99, original_price: 54.99, deal_score: 92, retailer_name: 'Walmart', price_count: 9 },
  { id: '6', name: 'Organic Whole Milk 2L', brand: 'Various', category: 'groceries', image_url: '', best_price: 3.49, original_price: 5.99, deal_score: 82, retailer_name: 'Woolworths', price_count: 4 },
  { id: '7', name: 'Instant Pot Duo 7-in-1', brand: 'Instant Pot', category: 'home', image_url: '', best_price: 59.99, original_price: 89.99, deal_score: 87, retailer_name: 'Amazon', price_count: 7 },
  { id: '8', name: 'Bose QuietComfort 45', brand: 'Bose', category: 'electronics', image_url: '', best_price: 229.00, original_price: 329.99, deal_score: 86, retailer_name: 'Target', price_count: 10 },
  { id: '9', name: 'Huggies Nappies Size 3', brand: 'Huggies', category: 'baby', image_url: '', best_price: 28.50, original_price: 42.00, deal_score: 84, retailer_name: 'Coles', price_count: 5 },
  { id: '10', name: 'KitchenAid Stand Mixer', brand: 'KitchenAid', category: 'home', image_url: '', best_price: 279.99, original_price: 449.99, deal_score: 89, retailer_name: 'Amazon', price_count: 8 },
  { id: '11', name: 'Sydney to Melbourne Flight', brand: 'Jetstar', category: 'travel', image_url: '', best_price: 59.00, original_price: 129.00, deal_score: 93, retailer_name: 'Skyscanner', price_count: 6 },
  { id: '12', name: 'Garden Hose 30m Expandable', brand: 'Gardena', category: 'home', image_url: '', best_price: 34.95, original_price: 69.99, deal_score: 80, retailer_name: 'Bunnings', price_count: 3 },
];

function getSavingsPercent(original, best) {
  if (!original || original <= best) return 0;
  return Math.round(((original - best) / original) * 100);
}

function ProductCardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-white/5 bg-[#111] p-5">
      <div className="mb-4 h-40 w-full rounded-xl bg-[#0a0a0a]" />
      <div className="mb-2 h-3 w-1/4 rounded bg-[#0a0a0a]" />
      <div className="mb-3 h-4 w-3/4 rounded bg-[#0a0a0a]" />
      <div className="mb-1 h-6 w-1/3 rounded bg-[#0a0a0a]" />
      <div className="h-3 w-1/4 rounded bg-[#0a0a0a]" />
      <div className="mt-4 pt-3 border-t border-white/5">
        <div className="h-3 w-1/3 rounded bg-[#0a0a0a]" />
      </div>
    </div>
  );
}

function ProductCard({ product }) {
  const savings = getSavingsPercent(product.original_price, product.best_price);

  return (
    <Link
      to={`/product/${product.id}`}
      className="group block rounded-2xl border border-white/5 bg-[#111] p-5 transition-all duration-200 hover:border-white/10"
    >
      {/* Product Image / Placeholder */}
      <div className="relative mb-4">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="h-40 w-full rounded-xl object-cover"
          />
        ) : (
          <div className="flex h-40 w-full items-center justify-center rounded-xl bg-[#0a0a0a]">
            <PackageSearch className="h-10 w-10 text-zinc-800" />
          </div>
        )}
        {savings > 0 && (
          <span className="absolute right-2 top-2 rounded-full bg-[#FF6B35]/10 px-2.5 py-1 text-xs font-bold text-[#FF6B35]">
            -{savings}%
          </span>
        )}
      </div>

      {/* Product Info */}
      <p className="text-xs font-medium text-zinc-500 mb-1">{product.brand}</p>
      <h3 className="text-sm font-semibold text-white leading-snug mb-3 line-clamp-2">
        {product.name}
      </h3>

      {/* Price */}
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-lg font-bold text-[#06D6A0]">
          ${product.best_price.toFixed(2)}
        </span>
        {savings > 0 && (
          <span className="text-xs text-zinc-600 line-through">
            ${product.original_price.toFixed(2)}
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
        <span className="text-xs text-zinc-600">{product.retailer_name}</span>
        <span className="flex items-center gap-1 text-xs font-medium text-zinc-400 group-hover:text-[#FF6B35] transition-colors">
          Compare {product.price_count} prices
          <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </Link>
  );
}

export default function BrowsePage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [inputValue, setInputValue] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [sort, setSort] = useState(searchParams.get('sort') || 'deal_score');

  const filters = useMemo(() => ({
    query: query || undefined,
    category: category || undefined,
    sort,
  }), [query, category, sort]);

  const { data: apiResults, isLoading } = useProductSearch(filters);

  const products = useMemo(() => {
    if (apiResults && apiResults.length > 0) return apiResults;

    let results = [...MOCK_RESULTS];

    if (query) {
      const q = query.toLowerCase();
      results = results.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q)
      );
    }

    if (category) {
      results = results.filter(p => p.category === category);
    }

    switch (sort) {
      case 'price_low':
        results.sort((a, b) => a.best_price - b.best_price);
        break;
      case 'price_high':
        results.sort((a, b) => b.best_price - a.best_price);
        break;
      case 'deal_score':
        results.sort((a, b) => b.deal_score - a.deal_score);
        break;
      default:
        break;
    }

    return results;
  }, [apiResults, query, category, sort]);

  useEffect(() => {
    const params = {};
    if (query) params.q = query;
    if (category) params.category = category;
    if (sort && sort !== 'deal_score') params.sort = sort;
    setSearchParams(params, { replace: true });
  }, [query, category, sort, setSearchParams]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setQuery(inputValue.trim());
  };

  const handleCategoryToggle = (catId) => {
    setCategory(category === catId ? '' : catId);
  };

  return (
    <div className="min-h-screen bg-[#050505]">
      {/* Sticky Search Header */}
      <div className="sticky top-16 z-30 bg-[#0a0a0a]/90 backdrop-blur-xl border-b border-white/5">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
          <form onSubmit={handleSearchSubmit} className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Search for any product or brand..."
                className="w-full rounded-xl border border-white/10 bg-[#111] py-3 pl-11 pr-4 text-sm text-white placeholder-zinc-500 transition-all focus:border-[#FF6B35]/40 focus:outline-none focus:ring-0"
              />
            </div>
            <button
              type="submit"
              className="rounded-xl bg-[#FF6B35] px-6 text-sm font-semibold text-white transition-all hover:brightness-110"
            >
              Search
            </button>
          </form>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Category Filter Pills */}
        <div className="mb-8 overflow-x-auto hide-scrollbar pb-1">
          <div className="flex gap-2">
            <button
              onClick={() => setCategory('')}
              className={`flex-shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                !category
                  ? 'bg-[#FF6B35]/10 border border-[#FF6B35]/30 text-[#FF6B35]'
                  : 'border border-white/5 bg-[#111] text-zinc-400 hover:border-white/10 hover:text-zinc-200'
              }`}
            >
              All
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryToggle(cat.id)}
                className={`flex flex-shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                  category === cat.id
                    ? 'bg-[#FF6B35]/10 border border-[#FF6B35]/30 text-[#FF6B35]'
                    : 'border border-white/5 bg-[#111] text-zinc-400 hover:border-white/10 hover:text-zinc-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sort & Results Count */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-zinc-500">
            {isLoading
              ? 'Searching...'
              : `${products.length} result${products.length !== 1 ? 's' : ''}`}
            {query && (
              <span className="text-zinc-600"> for &ldquo;{query}&rdquo;</span>
            )}
          </p>

          <div className="relative">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="appearance-none rounded-xl border border-white/10 bg-[#111] py-2 pl-3 pr-8 text-xs font-medium text-zinc-300 transition-colors hover:border-white/20 focus:border-[#FF6B35]/40 focus:outline-none cursor-pointer"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-[#111] text-zinc-300">
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
          </div>
        </div>

        {/* Results Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="mx-auto max-w-sm py-24 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-[#111] border border-white/5">
              <PackageSearch className="h-10 w-10 text-zinc-700" />
            </div>
            <h2 className="mb-2 text-xl font-bold text-zinc-300">No results found</h2>
            <p className="mb-8 text-sm text-zinc-500 leading-relaxed">
              Try a different search term or browse categories above.
            </p>
            <button
              onClick={() => {
                setQuery('');
                setInputValue('');
                setCategory('');
                setSort('deal_score');
              }}
              className="rounded-xl bg-[#111] border border-white/5 px-6 py-2.5 text-sm font-semibold text-zinc-300 transition-all hover:border-white/10"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
