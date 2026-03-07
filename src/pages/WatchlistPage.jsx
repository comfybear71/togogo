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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Heading */}
        <div className="mb-8">
          <h1 className="font-['Baloo_2'] text-3xl font-bold text-gray-900 dark:text-white">
            My Watchlist
          </h1>
          <p className="mt-2 text-lg text-gray-500 dark:text-gray-400">
            Track prices on the products you love
          </p>
        </div>

        {isEmpty ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white px-6 py-20 text-center dark:border-gray-700 dark:bg-gray-900">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#FF6B35]/10">
              <Heart className="h-12 w-12 text-[#FF6B35]" />
            </div>
            <h2 className="mt-8 font-['Baloo_2'] text-2xl font-bold text-gray-900 dark:text-white">
              Start watching products for price drops!
            </h2>
            <p className="mt-3 max-w-md text-lg text-gray-500 dark:text-gray-400">
              Search for products you want and add them to your watchlist. We'll keep an eye on prices for you.
            </p>
            <Link to="/browse">
              <Button className="mt-8 rounded-xl bg-[#FF6B35] px-10 py-4 text-lg font-bold text-white hover:bg-[#e55a2b]">
                <Search className="mr-2 inline h-5 w-5" />
                Search Products
              </Button>
            </Link>
          </div>
        ) : (
          /* Watchlist Cards */
          <div className="space-y-4">
            {watchlist.map((item) => {
              const trend = getPriceTrend(item.best_price, item.previous_price);
              const priceDiff = item.previous_price - item.best_price;

              return (
                <div
                  key={item.id}
                  className="relative rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
                >
                  {/* Remove Button */}
                  <button
                    onClick={() => handleRemove(item.id)}
                    className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-400 transition-colors hover:bg-red-100 hover:text-red-500 dark:bg-gray-800 dark:hover:bg-red-900/20"
                    aria-label={`Remove ${item.product.name} from watchlist`}
                  >
                    <X className="h-5 w-5" />
                  </button>

                  {/* Product Info */}
                  <div className="pr-14">
                    <p className="text-base font-semibold text-[#FF6B35]">
                      {item.product.brand}
                    </p>
                    <h3 className="mt-1 font-['Baloo_2'] text-xl font-bold text-gray-900 dark:text-white">
                      {item.product.name}
                    </h3>
                  </div>

                  {/* Price Info */}
                  <div className="mt-5 flex flex-wrap items-end gap-6">
                    {/* Best Price */}
                    <div>
                      <p className="text-base font-semibold text-gray-500 dark:text-gray-400">
                        Best Price
                      </p>
                      <div className="flex items-center gap-2">
                        <p className="font-['Baloo_2'] text-3xl font-bold text-gray-900 dark:text-white">
                          ${item.best_price.toFixed(2)}
                        </p>
                        {/* Price Trend */}
                        {trend === 'down' && (
                          <span className="flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-base font-bold text-green-700 dark:bg-green-900/20 dark:text-green-400">
                            <TrendingDown className="h-5 w-5" />
                            -${priceDiff.toFixed(2)}
                          </span>
                        )}
                        {trend === 'up' && (
                          <span className="flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-base font-bold text-red-700 dark:bg-red-900/20 dark:text-red-400">
                            <TrendingUp className="h-5 w-5" />
                            +${Math.abs(priceDiff).toFixed(2)}
                          </span>
                        )}
                        {trend === 'same' && (
                          <span className="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-base font-bold text-gray-500 dark:bg-gray-800">
                            <Minus className="h-5 w-5" />
                            No change
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Target Price */}
                    <div>
                      <p className="text-base font-semibold text-gray-500 dark:text-gray-400">
                        Your Target
                      </p>
                      <p className="font-['Baloo_2'] text-2xl font-bold text-[#06D6A0]">
                        ${item.target_price.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* View Deals Button */}
                  <div className="mt-5">
                    <Link to={`/product/${item.product.id}`}>
                      <Button className="rounded-xl bg-[#FF6B35]/10 px-6 py-3 text-base font-bold text-[#FF6B35] transition-colors hover:bg-[#FF6B35]/20">
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
