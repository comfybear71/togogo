import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
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
      <div className="min-h-screen bg-[#050505]">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <Skeleton className="h-6 w-36 rounded-lg mb-6 bg-[#111]" />
          <div className="rounded-2xl border border-white/5 bg-[#111] p-6 md:p-8 mb-6">
            <div className="flex flex-col md:flex-row gap-8">
              <Skeleton className="w-full md:w-80 h-80 rounded-2xl flex-shrink-0 bg-[#0a0a0a]" />
              <div className="flex-1 space-y-4">
                <Skeleton className="h-5 w-24 rounded-full bg-[#0a0a0a]" />
                <Skeleton className="h-10 w-3/4 rounded-xl bg-[#0a0a0a]" />
                <Skeleton className="h-6 w-1/3 rounded-xl bg-[#0a0a0a]" />
                <Skeleton className="h-20 w-full rounded-xl bg-[#0a0a0a]" />
              </div>
            </div>
          </div>
          <Skeleton className="h-32 w-full rounded-2xl mb-6 bg-[#111]" />
          <Skeleton className="h-64 w-full rounded-2xl bg-[#111]" />
        </div>
      </div>
    );
  }

  const productImage = product.image_url || product.images?.[0] || '';
  const categoryLabel = product.category
    ? product.category.charAt(0).toUpperCase() + product.category.slice(1)
    : '';

  return (
    <div className="min-h-screen bg-[#050505]">
      <div className="mx-auto max-w-5xl px-4 py-4 md:py-8">
        {/* Back link */}
        <Link
          to="/browse"
          className="inline-flex items-center gap-1 text-zinc-500 hover:text-white font-medium mb-6 text-sm transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to browsing
        </Link>

        {/* ===== PRODUCT HEADER ===== */}
        <div className="rounded-2xl border border-white/5 bg-[#111] p-6 md:p-8 mb-6">
          <div className="flex flex-col md:flex-row gap-6 md:gap-8">
            {/* Product Image */}
            <div className="flex-shrink-0 w-full md:w-72 lg:w-80">
              <div className="aspect-square rounded-2xl overflow-hidden bg-[#0a0a0a] border border-white/5 flex items-center justify-center">
                {productImage ? (
                  <img
                    src={productImage}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-8">
                    <Package className="w-16 h-16 text-zinc-800 mx-auto mb-3" />
                    <p className="text-zinc-600 text-sm font-medium">No image</p>
                  </div>
                )}
              </div>
            </div>

            {/* Product Info */}
            <div className="flex-1 min-w-0">
              {/* Category badge */}
              {categoryLabel && (
                <span className="inline-block bg-[#FF6B35]/10 text-[#FF6B35] text-xs font-bold px-3 py-1 rounded-full mb-3">
                  {categoryLabel}
                </span>
              )}
              {/* Product name */}
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 leading-tight">
                {product.name}
              </h1>
              {/* Brand */}
              {product.brand && (
                <p className="text-lg text-zinc-400 font-medium mb-4">
                  by {product.brand}
                </p>
              )}
              {/* Description */}
              {product.description && (
                <p className="text-base text-zinc-400 leading-relaxed">
                  {product.description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ===== BEST PRICE BANNER ===== */}
        {bestDeal && (
          <div className="rounded-2xl bg-gradient-to-r from-[#06D6A0]/10 to-[#06D6A0]/5 border border-[#06D6A0]/20 p-6 md:p-8 mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-zinc-400 text-sm font-medium mb-1">Best Price Available</p>
                <p className="text-4xl md:text-5xl font-bold text-[#06D6A0] mb-1">
                  ${bestDeal.price.toFixed(2)}
                </p>
                <p className="text-zinc-400 text-base">
                  from <span className="font-semibold text-white">{bestDeal.retailer?.name}</span>
                  {bestDeal.shipping_cost === 0 && (
                    <span className="text-[#06D6A0] ml-1">-- Free Shipping</span>
                  )}
                </p>
                {bestDeal.original_price && bestDeal.original_price > bestDeal.price && (
                  <p className="text-zinc-500 text-sm mt-1">
                    <span className="line-through">${bestDeal.original_price.toFixed(2)}</span>
                    {' '}
                    <span className="bg-[#FF6B35]/10 text-[#FF6B35] rounded-full px-2 py-0.5 text-xs font-bold">
                      Save ${(bestDeal.original_price - bestDeal.price).toFixed(2)}
                    </span>
                  </p>
                )}
              </div>
              <a
                href={bestDeal.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 bg-[#06D6A0] text-black hover:brightness-110 font-bold text-lg px-8 py-4 rounded-xl transition-all flex-shrink-0"
              >
                Go to Store
                <ExternalLink className="w-5 h-5" />
              </a>
            </div>
          </div>
        )}

        {/* ===== PRICE COMPARISON TABLE ===== */}
        <div className="rounded-2xl border border-white/5 bg-[#111] mb-6">
          <div className="p-6 md:p-8 border-b border-white/5">
            <h2 className="text-xl md:text-2xl font-bold text-white">
              Compare Prices Across Stores
            </h2>
            <p className="text-sm text-zinc-500 mt-1">
              {sortedDeals.length} retailer{sortedDeals.length !== 1 && 's'} compared -- sorted by
              lowest total price
            </p>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#0a0a0a] text-left">
                  <th className="px-8 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Retailer</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Shipping</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Stock</th>
                  <th className="px-8 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody>
                {sortedDeals.map((deal) => {
                  const total = (deal.price || 0) + (deal.shipping_cost || 0);
                  const isBest = deal.id === bestDeal?.id;
                  return (
                    <tr
                      key={deal.id}
                      className={`border-t border-white/5 transition-colors ${
                        isBest
                          ? 'bg-[#06D6A0]/5'
                          : 'hover:bg-white/[0.02]'
                      } ${!deal.in_stock ? 'opacity-40' : ''}`}
                    >
                      {/* Retailer */}
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#0a0a0a] border border-white/5 flex items-center justify-center text-xs font-bold text-zinc-500 flex-shrink-0">
                            {deal.retailer?.name?.charAt(0) || '?'}
                          </div>
                          <div>
                            <p className="text-base font-semibold text-white">
                              {deal.retailer?.name}
                            </p>
                            <p className="text-xs text-zinc-600">{deal.retailer?.domain}</p>
                          </div>
                          {isBest && (
                            <span className="bg-[#06D6A0]/10 text-[#06D6A0] text-[10px] font-bold px-2 py-0.5 rounded-full ml-1 uppercase tracking-wider">
                              Best
                            </span>
                          )}
                        </div>
                      </td>
                      {/* Price */}
                      <td className="px-6 py-5">
                        <span className="text-lg font-bold text-white">
                          ${deal.price.toFixed(2)}
                        </span>
                        {deal.original_price && deal.original_price > deal.price && (
                          <span className="block text-xs text-zinc-600 line-through">
                            ${deal.original_price.toFixed(2)}
                          </span>
                        )}
                      </td>
                      {/* Shipping */}
                      <td className="px-6 py-5">
                        <span className="text-sm font-medium text-zinc-400">
                          {deal.shipping_cost === 0 ? (
                            <span className="text-[#06D6A0] font-semibold">FREE</span>
                          ) : (
                            `$${deal.shipping_cost.toFixed(2)}`
                          )}
                        </span>
                      </td>
                      {/* Total */}
                      <td className="px-6 py-5">
                        <span
                          className={`text-lg font-bold ${
                            isBest ? 'text-[#06D6A0]' : 'text-white'
                          }`}
                        >
                          ${total.toFixed(2)}
                        </span>
                      </td>
                      {/* Stock */}
                      <td className="px-6 py-5">
                        {deal.in_stock ? (
                          <span className="inline-flex items-center gap-1 text-[#06D6A0] font-medium text-xs">
                            <Check className="w-3.5 h-3.5" />
                            In Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-zinc-500 font-medium text-xs">
                            <XCircle className="w-3.5 h-3.5" />
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
                          className={`inline-flex items-center gap-2 font-bold text-sm px-5 py-2.5 rounded-xl transition-all ${
                            deal.in_stock
                              ? 'bg-[#FF6B35] hover:brightness-110 text-white'
                              : 'bg-white/5 text-zinc-600 cursor-not-allowed pointer-events-none'
                          }`}
                        >
                          Buy
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-white/5">
            {sortedDeals.map((deal) => {
              const total = (deal.price || 0) + (deal.shipping_cost || 0);
              const isBest = deal.id === bestDeal?.id;
              return (
                <div
                  key={deal.id}
                  className={`p-5 ${isBest ? 'bg-[#06D6A0]/5' : ''} ${
                    !deal.in_stock ? 'opacity-40' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#0a0a0a] border border-white/5 flex items-center justify-center text-xs font-bold text-zinc-500">
                        {deal.retailer?.name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="text-base font-semibold text-white">{deal.retailer?.name}</p>
                      </div>
                      {isBest && (
                        <span className="bg-[#06D6A0]/10 text-[#06D6A0] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Best
                        </span>
                      )}
                    </div>
                    {deal.in_stock ? (
                      <span className="text-[#06D6A0] font-medium text-xs flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> In Stock
                      </span>
                    ) : (
                      <span className="text-zinc-500 font-medium text-xs flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> Out of Stock
                      </span>
                    )}
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="flex items-baseline gap-3">
                        <span className="text-xl font-bold text-white">
                          ${deal.price.toFixed(2)}
                        </span>
                        {deal.original_price && deal.original_price > deal.price && (
                          <span className="text-xs text-zinc-600 line-through">
                            ${deal.original_price.toFixed(2)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Shipping:{' '}
                        {deal.shipping_cost === 0 ? (
                          <span className="text-[#06D6A0] font-semibold">FREE</span>
                        ) : (
                          `$${deal.shipping_cost.toFixed(2)}`
                        )}
                        {' | '}
                        Total:{' '}
                        <span className={`font-bold ${isBest ? 'text-[#06D6A0]' : 'text-zinc-300'}`}>
                          ${total.toFixed(2)}
                        </span>
                      </p>
                    </div>
                    <a
                      href={deal.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-2 font-bold text-sm px-5 py-2.5 rounded-xl transition-all ${
                        deal.in_stock
                          ? 'bg-[#FF6B35] hover:brightness-110 text-white'
                          : 'bg-white/5 text-zinc-600 cursor-not-allowed pointer-events-none'
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
        <div className="rounded-2xl border border-white/5 bg-[#111] p-6 md:p-8 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <TrendingDown className="w-5 h-5 text-[#FF6B35]" />
            <h2 className="text-lg md:text-xl font-bold text-white">
              Price History (Last 30 Days)
            </h2>
          </div>
          <div className="w-full h-64 md:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF6B35" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#FF6B35" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#71717a' }}
                  tickLine={false}
                  axisLine={{ stroke: '#1e1e1e' }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#71717a' }}
                  tickLine={false}
                  axisLine={{ stroke: '#1e1e1e' }}
                  tickFormatter={(v) => `$${v}`}
                  domain={['dataMin - 5', 'dataMax + 5']}
                  width={60}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: '13px',
                    borderRadius: '10px',
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #2a2a2a',
                    color: '#fff',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  }}
                  itemStyle={{ color: '#FF6B35' }}
                  labelStyle={{ color: '#71717a', fontSize: '11px' }}
                  formatter={(value) => [`$${value.toFixed(2)}`, 'Price']}
                />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke="#FF6B35"
                  strokeWidth={2}
                  fill="url(#priceGradient)"
                  dot={false}
                  activeDot={{ r: 5, fill: '#FF6B35', stroke: '#050505', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ===== WATCHLIST & SHARE ACTIONS ===== */}
        <div className="flex flex-col sm:flex-row gap-3 mb-12">
          {/* Add to Watchlist */}
          <button
            onClick={() => setWatchlisted(!watchlisted)}
            className={`flex-1 inline-flex items-center justify-center gap-2.5 text-sm font-bold px-6 py-4 rounded-xl transition-all ${
              watchlisted
                ? 'bg-[#FF6B35]/10 border border-[#FF6B35]/30 text-[#FF6B35]'
                : 'bg-[#111] border border-white/5 text-zinc-300 hover:border-white/10'
            }`}
          >
            <Heart
              className={`w-5 h-5 ${watchlisted ? 'fill-[#FF6B35] text-[#FF6B35]' : ''}`}
            />
            {watchlisted ? 'Watching for Price Drops' : 'Watch for Price Drops'}
          </button>

          {/* Share / Copy Link */}
          <button
            onClick={handleShare}
            className="inline-flex items-center justify-center gap-2.5 text-sm font-bold px-6 py-4 rounded-xl bg-[#111] border border-white/5 text-zinc-300 hover:border-white/10 transition-all"
          >
            {copied ? (
              <>
                <Check className="w-5 h-5 text-[#06D6A0]" />
                Link Copied
              </>
            ) : (
              <>
                <Copy className="w-5 h-5" />
                Share
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
