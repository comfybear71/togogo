import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Share2,
  ChevronLeft,
  Heart,
  Check,
  ExternalLink,
  Package,
  XCircle,
  TrendingDown,
  Copy,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import Skeleton from '../components/ui/Skeleton';
import { useProduct, usePriceHistory } from '../hooks/useProducts';

const MOCK_PRODUCT = {
  id: '1',
  name: 'Apple AirPods Pro 2',
  brand: 'Apple',
  category: 'electronics',
  description:
    'Active Noise Cancellation, Adaptive Audio, Personalized Spatial Audio, USB-C charging case',
  image_url: '',
  images: [],
  deals: [
    {
      id: 'd1',
      price: 189.99,
      original_price: 249.99,
      shipping_cost: 0,
      in_stock: true,
      url: '#',
      deal_score: 95,
      retailer: { name: 'Amazon', domain: 'amazon.com' },
    },
    {
      id: 'd2',
      price: 199.0,
      original_price: 249.99,
      shipping_cost: 0,
      in_stock: true,
      url: '#',
      deal_score: 88,
      retailer: { name: 'Best Buy', domain: 'bestbuy.com' },
    },
    {
      id: 'd3',
      price: 209.99,
      original_price: 249.99,
      shipping_cost: 5.99,
      in_stock: true,
      url: '#',
      deal_score: 82,
      retailer: { name: 'Target', domain: 'target.com' },
    },
    {
      id: 'd4',
      price: 195.0,
      original_price: 249.99,
      shipping_cost: 9.95,
      in_stock: true,
      url: '#',
      deal_score: 85,
      retailer: { name: 'eBay', domain: 'ebay.com' },
    },
    {
      id: 'd5',
      price: 179.0,
      original_price: 249.99,
      shipping_cost: 15.0,
      in_stock: false,
      url: '#',
      deal_score: 70,
      retailer: { name: 'AliExpress', domain: 'aliexpress.com' },
    },
  ],
};

const MOCK_PRICE_HISTORY = Array.from({ length: 30 }, (_, i) => ({
  checked_at: new Date(Date.now() - (29 - i) * 86400000).toISOString(),
  price: 189.99 + Math.random() * 40 - 15,
}));

export default function ProductDetailPage() {
  const { id } = useParams();
  const { data: fetchedProduct, isLoading } = useProduct(id);
  const product = fetchedProduct || MOCK_PRODUCT;

  const bestDealId = product?.deals?.[0]?.id;
  const { data: fetchedHistory } = usePriceHistory(bestDealId);
  const priceHistory = fetchedHistory?.length ? fetchedHistory : MOCK_PRICE_HISTORY;

  const [watchlisted, setWatchlisted] = useState(false);
  const [copied, setCopied] = useState(false);

  // Sort deals by total price (price + shipping), in-stock first
  const sortedDeals = useMemo(() => {
    if (!product?.deals) return [];
    return [...product.deals].sort((a, b) => {
      // In-stock items first
      if (a.in_stock && !b.in_stock) return -1;
      if (!a.in_stock && b.in_stock) return 1;
      const totalA = (a.price || 0) + (a.shipping_cost || 0);
      const totalB = (b.price || 0) + (b.shipping_cost || 0);
      return totalA - totalB;
    });
  }, [product?.deals]);

  const bestDeal = sortedDeals.find((d) => d.in_stock);

  // Format chart data
  const chartData = useMemo(() => {
    return priceHistory.map((p) => ({
      date: new Date(p.checked_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      price: Math.round(p.price * 100) / 100,
    }));
  }, [priceHistory]);

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <Skeleton className="h-8 w-40 rounded-xl mb-6" />
          <div className="flex flex-col md:flex-row gap-8">
            <Skeleton className="w-full md:w-80 h-80 rounded-2xl flex-shrink-0" />
            <div className="flex-1 space-y-4">
              <Skeleton className="h-12 w-3/4 rounded-xl" />
              <Skeleton className="h-8 w-1/3 rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          </div>
          <Skeleton className="h-64 w-full rounded-2xl mt-8" />
        </div>
      </div>
    );
  }

  const productImage =
    product.image_url || product.images?.[0] || '';
  const categoryLabel = product.category
    ? product.category.charAt(0).toUpperCase() + product.category.slice(1)
    : '';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-4 md:py-8">
        {/* Back link */}
        <Link
          to="/browse"
          className="inline-flex items-center gap-1 text-gray-500 hover:text-teal-600 font-semibold mb-6 text-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Back to browsing
        </Link>

        {/* ===== PRODUCT HEADER ===== */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8 mb-6">
          <div className="flex flex-col md:flex-row gap-6 md:gap-8">
            {/* Product Image */}
            <div className="flex-shrink-0 w-full md:w-72 lg:w-80">
              <div className="aspect-square rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center">
                {productImage ? (
                  <img
                    src={productImage}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-8">
                    <Package className="w-20 h-20 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-400 text-lg font-medium">No image</p>
                  </div>
                )}
              </div>
            </div>

            {/* Product Info */}
            <div className="flex-1 min-w-0">
              {/* Category badge */}
              {categoryLabel && (
                <span className="inline-block bg-teal-50 text-teal-700 text-sm font-bold px-3 py-1 rounded-full mb-3">
                  {categoryLabel}
                </span>
              )}
              {/* Product name */}
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2 leading-tight">
                {product.name}
              </h1>
              {/* Brand */}
              {product.brand && (
                <p className="text-xl text-gray-500 font-medium mb-4">
                  by {product.brand}
                </p>
              )}
              {/* Description */}
              {product.description && (
                <p className="text-lg text-gray-600 leading-relaxed">
                  {product.description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ===== BEST PRICE BANNER ===== */}
        {bestDeal && (
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-6 md:p-8 mb-6 text-white shadow-lg">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-green-100 text-lg font-medium mb-1">Best Price Available</p>
                <p className="text-4xl md:text-5xl font-bold mb-1">
                  ${bestDeal.price.toFixed(2)}
                </p>
                <p className="text-green-100 text-xl">
                  from <span className="font-bold text-white">{bestDeal.retailer?.name}</span>
                  {bestDeal.shipping_cost === 0 && ' — Free Shipping!'}
                </p>
                {bestDeal.original_price && bestDeal.original_price > bestDeal.price && (
                  <p className="text-green-200 text-lg mt-1">
                    <span className="line-through">${bestDeal.original_price.toFixed(2)}</span>
                    {' '}
                    <span className="bg-white/20 rounded-full px-2 py-0.5 text-sm font-bold">
                      Save ${(bestDeal.original_price - bestDeal.price).toFixed(2)}
                    </span>
                  </p>
                )}
              </div>
              <a
                href={bestDeal.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 bg-white text-green-700 hover:bg-green-50 font-bold text-xl md:text-2xl px-8 py-4 md:py-5 rounded-2xl transition-colors shadow-md flex-shrink-0"
              >
                Go to Store
                <ExternalLink className="w-6 h-6 md:w-7 md:h-7" />
              </a>
            </div>
          </div>
        )}

        {/* ===== PRICE COMPARISON TABLE (HERO) ===== */}
        <div className="bg-white rounded-2xl border-2 border-teal-200 shadow-sm mb-6">
          <div className="p-6 md:p-8 border-b border-gray-100">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
              Compare Prices Across Stores
            </h2>
            <p className="text-lg text-gray-500 mt-1">
              {sortedDeals.length} retailer{sortedDeals.length !== 1 && 's'} compared — sorted by
              lowest total price
            </p>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-8 py-4 text-base font-bold text-gray-600">Retailer</th>
                  <th className="px-6 py-4 text-base font-bold text-gray-600">Price</th>
                  <th className="px-6 py-4 text-base font-bold text-gray-600">Shipping</th>
                  <th className="px-6 py-4 text-base font-bold text-gray-600">Total</th>
                  <th className="px-6 py-4 text-base font-bold text-gray-600">Stock</th>
                  <th className="px-8 py-4 text-base font-bold text-gray-600"></th>
                </tr>
              </thead>
              <tbody>
                {sortedDeals.map((deal, index) => {
                  const total = (deal.price || 0) + (deal.shipping_cost || 0);
                  const isBest = deal.id === bestDeal?.id;
                  return (
                    <tr
                      key={deal.id}
                      className={`border-t border-gray-100 transition-colors ${
                        isBest
                          ? 'bg-green-50/60'
                          : 'hover:bg-gray-50'
                      } ${!deal.in_stock ? 'opacity-60' : ''}`}
                    >
                      {/* Retailer */}
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-sm font-bold text-gray-500 flex-shrink-0">
                            {deal.retailer?.name?.charAt(0) || '?'}
                          </div>
                          <div>
                            <p className="text-xl font-bold text-gray-900">
                              {deal.retailer?.name}
                            </p>
                            <p className="text-sm text-gray-400">{deal.retailer?.domain}</p>
                          </div>
                          {isBest && (
                            <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full ml-1">
                              BEST
                            </span>
                          )}
                        </div>
                      </td>
                      {/* Price */}
                      <td className="px-6 py-5">
                        <span className="text-2xl font-bold text-gray-900">
                          ${deal.price.toFixed(2)}
                        </span>
                        {deal.original_price && deal.original_price > deal.price && (
                          <span className="block text-sm text-gray-400 line-through">
                            ${deal.original_price.toFixed(2)}
                          </span>
                        )}
                      </td>
                      {/* Shipping */}
                      <td className="px-6 py-5">
                        <span className="text-lg font-medium text-gray-700">
                          {deal.shipping_cost === 0 ? (
                            <span className="text-green-600 font-bold">FREE</span>
                          ) : (
                            `$${deal.shipping_cost.toFixed(2)}`
                          )}
                        </span>
                      </td>
                      {/* Total */}
                      <td className="px-6 py-5">
                        <span
                          className={`text-2xl font-bold ${
                            isBest ? 'text-green-600' : 'text-gray-900'
                          }`}
                        >
                          ${total.toFixed(2)}
                        </span>
                      </td>
                      {/* Stock */}
                      <td className="px-6 py-5">
                        {deal.in_stock ? (
                          <span className="inline-flex items-center gap-1.5 text-green-600 font-bold text-base">
                            <Check className="w-5 h-5" />
                            In Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-red-500 font-bold text-base">
                            <XCircle className="w-5 h-5" />
                            Out of Stock
                          </span>
                        )}
                      </td>
                      {/* Buy Button */}
                      <td className="px-8 py-5">
                        <a
                          href={deal.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-flex items-center gap-2 font-bold text-lg px-6 py-3 rounded-xl transition-colors ${
                            deal.in_stock
                              ? 'bg-teal-600 hover:bg-teal-700 text-white'
                              : 'bg-gray-200 text-gray-400 cursor-not-allowed pointer-events-none'
                          }`}
                        >
                          Buy
                          <ExternalLink className="w-5 h-5" />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-gray-100">
            {sortedDeals.map((deal) => {
              const total = (deal.price || 0) + (deal.shipping_cost || 0);
              const isBest = deal.id === bestDeal?.id;
              return (
                <div
                  key={deal.id}
                  className={`p-5 ${isBest ? 'bg-green-50/60' : ''} ${
                    !deal.in_stock ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-sm font-bold text-gray-500">
                        {deal.retailer?.name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="text-xl font-bold text-gray-900">{deal.retailer?.name}</p>
                      </div>
                      {isBest && (
                        <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full">
                          BEST
                        </span>
                      )}
                    </div>
                    {deal.in_stock ? (
                      <span className="text-green-600 font-bold text-sm flex items-center gap-1">
                        <Check className="w-4 h-4" /> In Stock
                      </span>
                    ) : (
                      <span className="text-red-500 font-bold text-sm flex items-center gap-1">
                        <XCircle className="w-4 h-4" /> Out of Stock
                      </span>
                    )}
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="flex items-baseline gap-3">
                        <span className="text-2xl font-bold text-gray-900">
                          ${deal.price.toFixed(2)}
                        </span>
                        {deal.original_price && deal.original_price > deal.price && (
                          <span className="text-sm text-gray-400 line-through">
                            ${deal.original_price.toFixed(2)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">
                        Shipping:{' '}
                        {deal.shipping_cost === 0 ? (
                          <span className="text-green-600 font-bold">FREE</span>
                        ) : (
                          `$${deal.shipping_cost.toFixed(2)}`
                        )}
                        {' | '}
                        Total:{' '}
                        <span className={`font-bold ${isBest ? 'text-green-600' : ''}`}>
                          ${total.toFixed(2)}
                        </span>
                      </p>
                    </div>
                    <a
                      href={deal.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-2 font-bold text-base px-5 py-3 rounded-xl transition-colors ${
                        deal.in_stock
                          ? 'bg-teal-600 hover:bg-teal-700 text-white'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed pointer-events-none'
                      }`}
                    >
                      Buy <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ===== PRICE HISTORY CHART ===== */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <TrendingDown className="w-7 h-7 text-teal-600" />
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
              Price History (Last 30 Days)
            </h2>
          </div>
          <div className="w-full h-72 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F97316" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#14B8A6" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 14, fill: '#6B7280' }}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 14, fill: '#6B7280' }}
                  tickLine={false}
                  tickFormatter={(v) => `$${v}`}
                  domain={['dataMin - 5', 'dataMax + 5']}
                  width={70}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: '16px',
                    borderRadius: '12px',
                    border: '1px solid #E5E7EB',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  }}
                  formatter={(value) => [`$${value.toFixed(2)}`, 'Price']}
                />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke="#F97316"
                  strokeWidth={3}
                  fill="url(#priceGradient)"
                  dot={false}
                  activeDot={{ r: 6, fill: '#14B8A6', stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ===== WATCHLIST & SHARE ACTIONS ===== */}
        <div className="flex flex-col sm:flex-row gap-4 mb-12">
          {/* Add to Watchlist */}
          <button
            onClick={() => setWatchlisted(!watchlisted)}
            className={`flex-1 inline-flex items-center justify-center gap-3 text-xl font-bold px-8 py-5 rounded-2xl transition-colors ${
              watchlisted
                ? 'bg-red-50 border-2 border-red-300 text-red-600'
                : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-red-300 hover:text-red-500'
            }`}
          >
            <Heart
              className={`w-7 h-7 ${watchlisted ? 'fill-red-500 text-red-500' : ''}`}
            />
            {watchlisted ? 'Watching for Price Drops' : 'Watch for Price Drops'}
          </button>

          {/* Share / Copy Link */}
          <button
            onClick={handleShare}
            className="inline-flex items-center justify-center gap-3 text-xl font-bold px-8 py-5 rounded-2xl bg-white border-2 border-gray-200 text-gray-700 hover:border-teal-300 hover:text-teal-600 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-7 h-7 text-green-500" />
                Link Copied!
              </>
            ) : (
              <>
                <Copy className="w-7 h-7" />
                Share
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
