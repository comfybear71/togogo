import { Link } from 'react-router-dom';
import { Home, MapPin, Search } from 'lucide-react';
import Button from '../components/ui/Button';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#FF6B35]/5 via-white to-[#06D6A0]/5 px-4 dark:from-[#FF6B35]/5 dark:via-gray-950 dark:to-[#06D6A0]/5">
      <div className="max-w-md text-center">
        {/* Illustration placeholder */}
        <div className="relative mx-auto mb-8">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-40 w-40 rounded-full bg-[#FFD23F]/20 blur-2xl" />
          </div>
          <div className="relative mx-auto flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-[#FF6B35]/20 to-[#FFD23F]/20">
            <MapPin className="h-16 w-16 text-[#FF6B35]" />
          </div>
          {/* Decorative dots */}
          <div className="absolute -right-4 top-4 h-4 w-4 rounded-full bg-[#06D6A0]/40" />
          <div className="absolute -left-2 bottom-6 h-3 w-3 rounded-full bg-[#FFD23F]/60" />
          <div className="absolute right-8 -bottom-2 h-2 w-2 rounded-full bg-[#FF6B35]/40" />
        </div>

        <h1 className="font-['Baloo_2'] text-7xl font-bold text-[#FF6B35]">404</h1>
        <h2 className="mt-2 font-['Baloo_2'] text-2xl font-bold text-gray-900 dark:text-white">
          Oops! This page went on a GoGo adventure
        </h2>
        <p className="mt-3 font-['Nunito'] text-gray-500 dark:text-gray-400">
          We looked everywhere but couldn't find what you're looking for.
          It might have been moved, deleted, or perhaps it never existed.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/">
            <Button className="flex items-center gap-2 bg-[#FF6B35] px-6 py-3 font-semibold text-white hover:bg-[#e55a2b]">
              <Home className="h-5 w-5" />
              Back to Home
            </Button>
          </Link>
          <Link to="/browse">
            <Button className="flex items-center gap-2 border border-gray-200 bg-white px-6 py-3 font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
              <Search className="h-5 w-5" />
              Browse Products
            </Button>
          </Link>
        </div>

        <div className="mt-10 opacity-50">
          <p className="font-['Baloo_2'] text-lg font-bold">
            <span className="text-[#FF6B35]">To</span>
            <span className="text-[#06D6A0]">Go</span>
            <span className="text-[#FFD23F]">Go</span>
          </p>
        </div>
      </div>
    </div>
  );
}
