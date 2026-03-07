import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import Button from '../components/ui/Button';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050505] px-4">
      <div className="max-w-md text-center">
        {/* Logo */}
        <div className="mb-10">
          <h2 className="font-['Baloo_2'] text-3xl font-bold tracking-tight">
            <span className="text-[#FF6B35]">To</span>
            <span className="text-[#FFD23F]">Go</span>
            <span className="text-[#06D6A0]">Go</span>
          </h2>
        </div>

        {/* 404 */}
        <h1 className="font-['Baloo_2'] text-[8rem] font-bold leading-none text-[#FF6B35]">
          404
        </h1>

        <h2 className="mt-4 font-['Baloo_2'] text-2xl font-bold text-white">
          Page not found
        </h2>

        <p className="mt-3 text-sm text-zinc-500">
          The page you're looking for doesn't exist or may have been moved.
        </p>

        <div className="mt-10">
          <Link to="/">
            <Button className="inline-flex items-center gap-2.5 rounded-xl bg-[#FF6B35] px-8 py-3.5 text-sm font-bold text-white transition-colors hover:bg-[#e55a2b]">
              <Home className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
