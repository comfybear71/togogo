import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Heart,
  Search,
  TrendingDown,
  TrendingUp,
  Minus,
  X,
} from 'lucide-react';
import Button from '../components/ui/Button';

const MOCK_WATCHLIST = [
  { id: '1', product: { id: 'p1', name: 'Apple AirPods Pro 2', brand: 'Apple', category: 'electronics' }, best_price: 189.99, previous_price: 199.99, target_price: 170.00 },
  { id: '2', product: { id: 'p2', name: 'Pampers Size 4 (150pk)', brand: 'Pampers', category: 'baby' }, best_price: 32.99, previous_price: 32.99, target_price: 25.00 },
  { id: '3', product: { id: 'p3', name: 'Samsung 65" 4K TV', brand: 'Samsung', category: 'electronics' }, best_price: 597.00, previous_price: 649.00, target_price: 500.00 },
];

export default function WatchlistPage() {
  const [watchlist, setWatchlist] = useState(MOCK_WATCHLIST);

  const handleRemove = (id) => {
    setWatchlist((prev) => prev.filter((item) => item.id !== id));
  };

  const getPriceTrend = (current, previous) => {
    if (current < previous) return 'down';
    if (current > previous) return 'up';
    return 'same';
  };

  const isEmpty = watchlist.length === 0;

  return (
    <div className="min-h-screen bg-[#050505]">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Heading */}
        <div className="mb-10">
          <h1 className="font-['Baloo_2'] text-2xl font-bold text-white">
            My Watchlist
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Track prices on the products you love
          </p>
        </div>

        {isEmpty ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/5 bg-[#111] px-6 py-20 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#FF6B35]/10">
              <Heart className="h-10 w-10 text-[#FF6B35]" />
            </div>
            <h2 className="mt-8 font-['Baloo_2'] text-xl font-bold text-white">
              Start watching products for price drops
            </h2>
            <p className="mt-2 max-w-md text-sm text-zinc-500">
              Search for products you want and add them to your watchlist. We'll keep an eye on prices for you.
            </p>
            <Link to="/browse">
              <Button className="mt-8 rounded-xl bg-[#FF6B35] px-8 py-3.5 text-sm font-bold text-white transition-colors hover:bg-[#e55a2b]">
                <Search className="mr-2 inline h-4 w-4" />
                Search Products
              </Button>
            </Link>
          </div>
        ) : (
          /* Watchlist Cards */
          <div className="space-y-3">
            {watchlist.map((item) => {
              const trend = getPriceTrend(item.best_price, item.previous_price);
              const priceDiff = item.previous_price - item.best_price;

              return (
                <div
                  key={item.id}
                  className="relative rounded-2xl border border-white/5 bg-[#111] p-6 transition-colors hover:border-white/10"
                >
                  {/* Remove Button */}
                  <button
                    onClick={() => handleRemove(item.id)}
                    className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-zinc-600 transition-colors hover:bg-red-500/10 hover:text-red-400"
                    aria-label={`Remove ${item.product.name} from watchlist`}
                  >
                    <X className="h-4 w-4" />
                  </button>

                  {/* Product Info */}
                  <div className="pr-14">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#FF6B35]">
                      {item.product.brand}
                    </p>
                    <h3 className="mt-1 font-['Baloo_2'] text-lg font-bold text-white">
                      {item.product.name}
                    </h3>
                  </div>

                  {/* Price Info */}
                  <div className="mt-5 flex flex-wrap items-end gap-6">
                    {/* Best Price */}
                    <div>
                      <p className="text-xs font-medium text-zinc-500">
                        Best Price
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <p className="font-['Baloo_2'] text-2xl font-bold text-white">
                          ${item.best_price.toFixed(2)}
                        </p>
                        {/* Price Trend */}
                        {trend === 'down' && (
                          <span className="flex items-center gap-1 rounded-full bg-[#06D6A0]/10 px-2.5 py-0.5 text-xs font-bold text-[#06D6A0]">
                            <TrendingDown className="h-3.5 w-3.5" />
                            -${priceDiff.toFixed(2)}
                          </span>
                        )}
                        {trend === 'up' && (
                          <span className="flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-bold text-red-400">
                            <TrendingUp className="h-3.5 w-3.5" />
                            +${Math.abs(priceDiff).toFixed(2)}
                          </span>
                        )}
                        {trend === 'same' && (
                          <span className="flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-0.5 text-xs font-bold text-zinc-500">
                            <Minus className="h-3.5 w-3.5" />
                            No change
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Target Price */}
                    <div>
                      <p className="text-xs font-medium text-zinc-500">
                        Your Target
                      </p>
                      <p className="mt-1 font-['Baloo_2'] text-xl font-bold text-[#06D6A0]">
                        ${item.target_price.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* View Deals Button */}
                  <div className="mt-5">
                    <Link to={`/product/${item.product.id}`}>
                      <Button className="rounded-xl bg-[#FF6B35]/10 px-5 py-2.5 text-xs font-bold text-[#FF6B35] transition-colors hover:bg-[#FF6B35]/20">
                        View Deals &rarr;
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
