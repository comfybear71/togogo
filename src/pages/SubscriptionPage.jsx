import { Link } from 'react-router-dom';
import { Check, ArrowLeft } from 'lucide-react';
import Button from '../components/ui/Button';
import { useAuthStore } from '../stores/authStore';

const FEATURES = [
  'Your own website & custom URL',
  'Hosting fully included',
  'Automated marketing across all social channels',
  'Auto-list products on eBay, Etsy, Amazon & more',
  'Dashboard with earnings, trends & stats',
  'All 5 suppliers (CJ, AliExpress, Printful, Printify, Gooten)',
  'Print-on-demand included',
  'Unlimited product listings',
];

export default function SubscriptionPage() {
  const { profile } = useAuthStore();
  const isSubscribed = profile?.subscription_plan?.toLowerCase() === 'togogo';

  const handleSubscribe = () => {
    alert('Coming soon! Payment integration is on the way.');
  };

  return (
    <div className="min-h-screen bg-[#050505]">
      <div className="mx-auto max-w-md px-4 py-10 sm:px-6">
        {/* Back Link */}
        <Link
          to="/profile"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-zinc-500 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Profile
        </Link>

        {/* Single Plan Card */}
        <div className={`relative rounded-2xl border bg-[#111] p-8 ${isSubscribed ? 'border-[#06D6A0]/50' : 'border-[#FF6B35]/30'}`}>
          {isSubscribed && (
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <span className="inline-flex items-center rounded-full bg-[#06D6A0] px-4 py-1 text-xs font-bold text-black">
                Active
              </span>
            </div>
          )}

          <h1 className="text-center font-['Baloo_2'] text-2xl font-bold text-white mt-2">
            ToGoGo
          </h1>
          <p className="text-center text-sm text-zinc-500 mt-1">One plan. Everything included.</p>

          {/* Price */}
          <div className="mt-6 text-center">
            <span className="font-['Baloo_2'] text-5xl font-bold text-white">$19.99</span>
            <span className="text-sm text-zinc-500">/mo</span>
          </div>

          {/* Features */}
          <ul className="mt-8 space-y-3">
            {FEATURES.map((feature) => (
              <li key={feature} className="flex items-center gap-3">
                <Check className="h-4 w-4 flex-shrink-0 text-[#06D6A0]" />
                <span className="text-sm text-zinc-300">{feature}</span>
              </li>
            ))}
          </ul>

          {/* Button */}
          <div className="mt-8">
            {isSubscribed ? (
              <div className="w-full rounded-xl bg-[#06D6A0]/10 py-3.5 text-center text-sm font-bold text-[#06D6A0]">
                You're Subscribed
              </div>
            ) : (
              <Button
                onClick={handleSubscribe}
                className="w-full rounded-xl bg-[#FF6B35] py-3.5 text-sm font-bold text-white transition-colors hover:bg-[#e55a2b]"
              >
                Get Started
              </Button>
            )}
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-zinc-600">
          Cancel anytime. No long-term commitment.
        </p>
      </div>
    </div>
  );
}
