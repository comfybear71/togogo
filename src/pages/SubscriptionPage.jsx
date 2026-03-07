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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back Link */}
        <Link
          to="/profile"
          className="mb-6 inline-flex items-center gap-2 text-lg font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Profile
        </Link>

        {/* Heading */}
        <div className="mb-10 text-center">
          <h1 className="font-['Baloo_2'] text-4xl font-bold text-gray-900 dark:text-white">
            Choose Your Plan
          </h1>
          <p className="mt-3 text-lg text-gray-500 dark:text-gray-400">
            Unlock more features to save more money
          </p>
        </div>

        {/* Plan Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          {SUBSCRIPTION_PLANS.map((plan) => {
            const isCurrentPlan = plan.id === currentPlan;
            const isPremium = plan.id === 'premium';

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-2xl border-2 bg-white p-8 shadow-sm transition-shadow hover:shadow-md dark:bg-gray-900 ${
                  isCurrentPlan
                    ? 'border-[#FF6B35] ring-2 ring-[#FF6B35]/20'
                    : isPremium
                    ? 'border-[#FFD23F]'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                {/* Best Value Badge */}
                {isPremium && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#FFD23F] px-5 py-1.5 text-base font-bold text-gray-900">
                      <Star className="h-4 w-4 fill-current" />
                      BEST VALUE
                    </span>
                  </div>
                )}

                {/* Current Plan Badge */}
                {isCurrentPlan && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center rounded-full bg-[#FF6B35] px-5 py-1.5 text-base font-bold text-white">
                      Current Plan
                    </span>
                  </div>
                )}

                {/* Plan Name */}
                <h2 className="mt-2 text-center font-['Baloo_2'] text-2xl font-bold text-gray-900 dark:text-white">
                  {plan.label}
                </h2>

                {/* Price */}
                <div className="mt-4 text-center">
                  <span className="font-['Baloo_2'] text-5xl font-bold text-gray-900 dark:text-white">
                    ${plan.price.toFixed(2)}
                  </span>
                  <span className="text-lg text-gray-500 dark:text-gray-400">/mo</span>
                </div>

                {/* Features */}
                <ul className="mt-8 flex-1 space-y-4">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="mt-0.5 h-6 w-6 flex-shrink-0 text-[#06D6A0]" />
                      <span className="text-lg text-gray-700 dark:text-gray-300">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* Button */}
                <div className="mt-8">
                  {isCurrentPlan ? (
                    <div className="w-full rounded-xl bg-gray-100 py-4 text-center text-lg font-bold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                      Your Current Plan
                    </div>
                  ) : (
                    <Button
                      onClick={() => handleChoosePlan(plan.id)}
                      className={`w-full rounded-xl py-4 text-lg font-bold ${
                        isPremium
                          ? 'bg-[#FFD23F] text-gray-900 hover:bg-[#f0c530]'
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
        <p className="mt-10 text-center text-base text-gray-400 dark:text-gray-500">
          All plans can be cancelled anytime. No long-term commitment required.
        </p>
      </div>
    </div>
  );
}
