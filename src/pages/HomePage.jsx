import { Link, useNavigate } from 'react-router-dom';
import { TrendingUp, ArrowRight, Sparkles, ShoppingBag } from 'lucide-react';
import SearchBar from '../components/ui/SearchBar';
import CategoryGrid from '../components/ui/CategoryGrid';
import Card from '../components/ui/Card';
import Skeleton from '../components/ui/Skeleton';
import Button from '../components/ui/Button';
import { useTrendingProducts, useProducts } from '../hooks/useProducts';
import { useAuthStore } from '../stores/authStore';
import { useRef } from 'react';

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { data: trending, isLoading: trendingLoading } = useTrendingProducts();
  const { data: recent, isLoading: recentLoading } = useProducts({ limit: 12 });
  const scrollRef = useRef(null);

  const handleSearch = (query) => {
    navigate(`/browse?q=${encodeURIComponent(query)}`);
  };

  const scrollLeft = () => {
    if (scrollRef.current) scrollRef.current.scrollBy({ left: -300, behavior: 'smooth' });
  };

  const scrollRight = () => {
    if (scrollRef.current) scrollRef.current.scrollBy({ left: 300, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#FF6B35]/10 via-white to-[#06D6A0]/10 dark:from-[#FF6B35]/5 dark:via-gray-950 dark:to-[#06D6A0]/5">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-[#FFD23F]/20 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-[#06D6A0]/20 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="text-center">
            <h1 className="font-['Baloo_2'] text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl lg:text-6xl">
              Find <span className="text-[#FF6B35]">amazing</span> deals
            </h1>
            <p className="mx-auto mt-4 max-w-xl font-['Nunito'] text-lg text-gray-600 dark:text-gray-400">
              Buy, sell, and discover unique products from trusted sellers in your community.
            </p>
            <div className="mx-auto mt-8 max-w-2xl">
              <SearchBar onSearch={handleSearch} placeholder="Search for anything..." />
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm text-gray-500 dark:text-gray-400">
              <span>Popular:</span>
              {['Sneakers', 'Electronics', 'Vintage', 'Handmade'].map((tag) => (
                <Link
                  key={tag}
                  to={`/browse?q=${tag}`}
                  className="rounded-full border border-gray-200 px-3 py-1 transition-colors hover:border-[#FF6B35] hover:text-[#FF6B35] dark:border-gray-700 dark:hover:border-[#FF6B35]"
                >
                  {tag}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="font-['Baloo_2'] text-2xl font-bold text-gray-900 dark:text-white">
            Shop by Category
          </h2>
          <Link
            to="/browse"
            className="flex items-center gap-1 text-sm font-medium text-[#FF6B35] hover:underline"
          >
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <CategoryGrid />
      </section>

      {/* Trending Now */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-[#FF6B35]" />
            <h2 className="font-['Baloo_2'] text-2xl font-bold text-gray-900 dark:text-white">
              Trending Now
            </h2>
          </div>
          <div className="hidden gap-2 sm:flex">
            <button
              onClick={scrollLeft}
              className="rounded-full border border-gray-200 p-2 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              <ArrowRight className="h-4 w-4 rotate-180 text-gray-600 dark:text-gray-400" />
            </button>
            <button
              onClick={scrollRight}
              className="rounded-full border border-gray-200 p-2 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              <ArrowRight className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>
        <div
          ref={scrollRef}
          className="scrollbar-hide -mx-4 flex gap-4 overflow-x-auto px-4 pb-4 snap-x snap-mandatory"
        >
          {trendingLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="w-64 flex-shrink-0 snap-start">
                  <Skeleton className="h-72 w-full rounded-xl" />
                </div>
              ))
            : trending?.map((product) => (
                <div key={product.id} className="w-64 flex-shrink-0 snap-start">
                  <Card product={product} />
                </div>
              ))}
        </div>
      </section>

      {/* Recently Listed */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-[#06D6A0]" />
            <h2 className="font-['Baloo_2'] text-2xl font-bold text-gray-900 dark:text-white">
              Recently Listed
            </h2>
          </div>
          <Link
            to="/browse?sort=newest"
            className="flex items-center gap-1 text-sm font-medium text-[#FF6B35] hover:underline"
          >
            See more <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4">
          {recentLoading
            ? Array.from({ length: 12 }).map((_, i) => (
                <Skeleton key={i} className="h-72 w-full rounded-xl" />
              ))
            : recent?.map((product) => (
                <Card key={product.id} product={product} />
              ))}
        </div>
      </section>

      {/* CTA Banner (logged out only) */}
      {!user && (
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#FF6B35] to-[#FFD23F] p-8 sm:p-12">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            <div className="relative flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
              <div className="flex-1">
                <div className="mb-2 flex items-center justify-center gap-2 sm:justify-start">
                  <ShoppingBag className="h-8 w-8 text-white" />
                </div>
                <h2 className="font-['Baloo_2'] text-3xl font-bold text-white">
                  Start selling today
                </h2>
                <p className="mt-2 max-w-md font-['Nunito'] text-white/90">
                  Join thousands of sellers on ToGoGo. List your first item in minutes and reach buyers everywhere.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link to="/auth?tab=signup">
                  <Button className="bg-white px-8 py-3 font-semibold text-[#FF6B35] shadow-lg hover:bg-gray-50">
                    Sign Up Free
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button className="border-2 border-white bg-transparent px-8 py-3 font-semibold text-white hover:bg-white/10">
                    Sign In
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
