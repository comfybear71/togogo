import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import Button from '../components/ui/Button';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#FF6B35]/5 via-white to-[#06D6A0]/5 px-4 dark:from-[#FF6B35]/5 dark:via-gray-950 dark:to-[#06D6A0]/5">
      <div className="max-w-lg text-center">
        {/* Logo */}
        <div className="mb-8">
          <h2 className="font-['Baloo_2'] text-3xl font-bold">
            <span className="text-[#FF6B35]">To</span>
            <span className="text-[#06D6A0]">Go</span>
            <span className="text-[#FFD23F]">Go</span>
          </h2>
        </div>

        {/* 404 */}
        <h1 className="font-['Baloo_2'] text-8xl font-bold text-[#FF6B35]">404</h1>

        <h2 className="mt-4 font-['Baloo_2'] text-3xl font-bold text-gray-900 dark:text-white">
          Oops! We couldn't find that deal.
        </h2>

        <p className="mt-4 text-xl text-gray-500 dark:text-gray-400">
          The page you're looking for doesn't exist or may have been moved.
          Let's get you back on track!
        </p>

        <div className="mt-10">
          <Link to="/">
            <Button className="inline-flex items-center gap-3 rounded-xl bg-[#FF6B35] px-10 py-5 text-xl font-bold text-white hover:bg-[#e55a2b]">
              <Home className="h-6 w-6" />
              Back to Deals
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
