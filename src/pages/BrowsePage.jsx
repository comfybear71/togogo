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

const CATEGORY_COLORS = {
  electronics: 'bg-blue-500',
  fashion: 'bg-pink-500',
  home: 'bg-amber-500',
  groceries: 'bg-green-500',
  health: 'bg-red-400',
  sports: 'bg-indigo-500',
  travel: 'bg-cyan-500',
  automotive: 'bg-gray-500',
  baby: 'bg-purple-400',
  books: 'bg-yellow-600',
  pets: 'bg-orange-400',
  food: 'bg-rose-500',
};

function getSavingsPercent(original, best) {
  if (!original || original <= best) return 0;
  return Math.round(((original - best) / original) * 100);
}

function ProductCardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border-2 border-gray-100 bg-white p-4">
      <div className="mb-4 h-44 w-full rounded-xl bg-gray-200" />
      <div className="mb-2 h-6 w-3/4 rounded bg-gray-200" />
      <div className="mb-3 h-4 w-1/3 rounded bg-gray-200" />
      <div className="mb-2 h-8 w-1/2 rounded bg-gray-200" />
      <div className="h-4 w-2/3 rounded bg-gray-200" />
    </div>
  );
}

function ProductCard({ product }) {
  const savings = getSavingsPercent(product.original_price, product.best_price);
  const colorClass = CATEGORY_COLORS[product.category] || 'bg-gray-400';

  return (
    <Link
      to={`/product/${product.id}`}
      className="group block rounded-2xl border-2 border-gray-100 bg-white p-4 shadow-sm transition-all hover:border-emerald-300 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-emerald-200"
    >
      {/* Product Image / Placeholder */}
      <div className="relative mb-4">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="h-44 w-full rounded-xl object-cover"
          />
        ) : (
          <div className={`flex h-44 w-full items-center justify-center rounded-xl ${colorClass} bg-opacity-20`}>
            <span className="text-5xl">
              {CATEGORIES.find(c => c.id === product.category)?.emoji || '📦'}
            </span>
          </div>
        )}

        {/* Savings Badge */}
        {savings > 0 && (
          <span className="absolute right-2 top-2 rounded-full bg-red-500 px-3 py-1.5 text-base font-bold text-white shadow-md">
            -{savings}%
          </span>
        )}
      </div>

      {/* Product Info */}
      <h3 className="mb-1 text-lg font-bold leading-snug text-gray-900 group-hover:text-emerald-700 sm:text-xl">
        {product.name}
      </h3>

      <p className="mb-3 text-base text-gray-500">
        {product.brand}
      </p>

      {/* Price Section */}
      <div className="mb-2">
        <span className="text-2xl font-extrabold text-emerald-600 sm:text-3xl">
          ${product.best_price.toFixed(2)}
        </span>
        <span className="ml-2 text-base text-gray-400">
          from {product.retailer_name}
        </span>
      </div>

      {savings > 0 && (
        <p className="mb-3 text-base text-gray-400 line-through">
          Was ${product.original_price.toFixed(2)}
        </p>
      )}

      {/* Compare Link */}
      <div className="flex items-center gap-1 text-base font-semibold text-emerald-600 group-hover:text-emerald-700">
        Compare {product.price_count} prices
        <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
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

  // Build filters for the hook
  const filters = useMemo(() => ({
    query: query || undefined,
    category: category || undefined,
    sort,
  }), [query, category, sort]);

  const { data: apiResults, isLoading } = useProductSearch(filters);

  // Fall back to mock data if API returns nothing
  const products = useMemo(() => {
    if (apiResults && apiResults.length > 0) return apiResults;

    let results = [...MOCK_RESULTS];

    // Filter by search query
    if (query) {
      const q = query.toLowerCase();
      results = results.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q)
      );
    }

    // Filter by category
    if (category) {
      results = results.filter(p => p.category === category);
    }

    // Sort
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
      case 'newest':
      default:
        break;
    }

    return results;
  }, [apiResults, query, category, sort]);

  // Sync filters to URL
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
    <div className="min-h-screen bg-gray-50">
      {/* Search Header */}
      <div className="sticky top-0 z-30 border-b-2 border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
          <form onSubmit={handleSearchSubmit} className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Search for any product or brand..."
                className="w-full rounded-xl border-2 border-gray-200 bg-white py-4 pl-13 pr-4 text-lg text-gray-900 placeholder-gray-400 transition-colors focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100"
              />
            </div>
            <button
              type="submit"
              className="rounded-xl bg-emerald-600 px-8 text-lg font-bold text-white shadow-sm transition-colors hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-200"
            >
              Search
            </button>
          </form>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {/* Category Filter Pills */}
        <div className="mb-6 overflow-x-auto pb-2">
          <div className="flex gap-3">
            <button
              onClick={() => setCategory('')}
              className={`flex-shrink-0 rounded-full px-6 py-3 text-base font-bold transition-colors ${
                !category
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'border-2 border-gray-200 bg-white text-gray-600 hover:border-emerald-300 hover:text-emerald-700'
              }`}
            >
              All
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryToggle(cat.id)}
                className={`flex flex-shrink-0 items-center gap-2 rounded-full px-6 py-3 text-base font-bold transition-colors ${
                  category === cat.id
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'border-2 border-gray-200 bg-white text-gray-600 hover:border-emerald-300 hover:text-emerald-700'
                }`}
              >
                <span className="text-xl">{cat.emoji}</span>
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sort & Results Count Bar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <p className="text-lg font-medium text-gray-700">
            {isLoading
              ? 'Searching for deals...'
              : `${products.length} deal${products.length !== 1 ? 's' : ''} found`}
            {query && (
              <span className="text-gray-400"> for &ldquo;{query}&rdquo;</span>
            )}
          </p>

          <div className="relative">
            <label htmlFor="sort-select" className="mr-2 text-base font-medium text-gray-600">
              Sort by:
            </label>
            <select
              id="sort-select"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="appearance-none rounded-xl border-2 border-gray-200 bg-white py-3 pl-4 pr-12 text-base font-bold text-gray-700 transition-colors hover:border-emerald-300 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          </div>
        </div>

        {/* Results Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : products.length === 0 ? (
          /* Empty State */
          <div className="mx-auto max-w-md py-20 text-center">
            <PackageSearch className="mx-auto mb-6 h-20 w-20 text-gray-300" />
            <h2 className="mb-3 text-2xl font-bold text-gray-700">
              No deals found
            </h2>
            <p className="mb-8 text-lg text-gray-500">
              We couldn&apos;t find any deals matching your search. Try a different product name, brand, or category.
            </p>
            <button
              onClick={() => {
                setQuery('');
                setInputValue('');
                setCategory('');
                setSort('deal_score');
              }}
              className="rounded-xl bg-emerald-600 px-8 py-4 text-lg font-bold text-white shadow-sm transition-colors hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-200"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
