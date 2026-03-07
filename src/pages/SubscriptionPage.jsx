import { Link } from 'react-router-dom';
import { Check, Star, ArrowLeft } from 'lucide-react';
import Button from '../components/ui/Button';
import { SUBSCRIPTION_PLANS } from '../lib/constants';
import { useAuthStore } from '../stores/authStore';

export default function SubscriptionPage() {
  const { profile } = useAuthStore();
  const currentPlan = profile?.subscription_plan?.toLowerCase() || 'free';

  const handleChoosePlan = (planId) => {
    // Coming soon - no Stripe integration yet
    alert('Coming soon! Payment integration is on the way.');
  };

  return (
    <div className="min-h-screen bg-[#050505]">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Back Link */}
        <Link
          to="/profile"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-zinc-500 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Profile
        </Link>

        {/* Heading */}
        <div className="mb-12 text-center">
          <h1 className="font-['Baloo_2'] text-3xl font-bold text-white">
            Choose Your Plan
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Unlock more features to save more money
          </p>
        </div>

        {/* Plan Cards */}
        <div className="grid gap-5 md:grid-cols-3">
          {SUBSCRIPTION_PLANS.map((plan) => {
            const isCurrentPlan = plan.id === currentPlan;
            const isPremium = plan.id === 'premium';

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-2xl border bg-[#111] p-7 transition-colors ${
                  isCurrentPlan
                    ? 'border-[#FF6B35]/50'
                    : isPremium
                    ? 'border-[#FFD23F]/30'
                    : 'border-white/5'
                }`}
              >
                {/* Best Value Badge */}
                {isPremium && !isCurrentPlan && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#FFD23F] px-4 py-1 text-xs font-bold text-black">
                      <Star className="h-3.5 w-3.5 fill-current" />
                      BEST VALUE
                    </span>
                  </div>
                )}

                {/* Current Plan Badge */}
                {isCurrentPlan && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center rounded-full bg-[#FF6B35] px-4 py-1 text-xs font-bold text-white">
                      Current Plan
                    </span>
                  </div>
                )}

                {/* Plan Name */}
                <h2 className="mt-2 text-center font-['Baloo_2'] text-xl font-bold text-white">
                  {plan.label}
                </h2>

                {/* Price */}
                <div className="mt-4 text-center">
                  <span className="font-['Baloo_2'] text-4xl font-bold text-white">
                    ${plan.price.toFixed(2)}
                  </span>
                  <span className="text-sm text-zinc-500">/mo</span>
                </div>

                {/* Features */}
                <ul className="mt-8 flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#06D6A0]" />
                      <span className="text-sm text-zinc-400">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* Button */}
                <div className="mt-8">
                  {isCurrentPlan ? (
                    <div className="w-full rounded-xl bg-white/5 py-3.5 text-center text-sm font-bold text-zinc-500">
                      Your Current Plan
                    </div>
                  ) : (
                    <Button
                      onClick={() => handleChoosePlan(plan.id)}
                      className={`w-full rounded-xl py-3.5 text-sm font-bold transition-colors ${
                        isPremium
                          ? 'bg-[#FFD23F] text-black hover:bg-[#f0c530]'
                          : 'bg-[#FF6B35] text-white hover:bg-[#e55a2b]'
                      }`}
                    >
                      Choose {plan.label}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Note */}
        <p className="mt-12 text-center text-xs text-zinc-600">
          All plans can be cancelled anytime. No long-term commitment required.
        </p>
      </div>
    </div>
  );
}
