import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Moon,
  Sun,
  LogOut,
  Heart,
  Bell,
  TrendingDown,
  Package,
  CreditCard,
  Eye,
} from 'lucide-react';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { useAuthStore } from '../stores/authStore';
import { useThemeStore } from '../stores/themeStore';

const TABS = ['My Watchlist', 'Price Alerts'];

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const [activeTab, setActiveTab] = useState('My Watchlist');

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const displayName = profile?.name || profile?.full_name || user?.email?.split('@')[0] || 'User';
  const avatarUrl = profile?.avatar_url || '';
  const subscriptionPlan = profile?.subscription_plan || 'Free';

  const planColors = {
    Free: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    Basic: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    Premium: 'bg-[#FF6B35]/10 text-[#FF6B35]',
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Profile Header */}
      <div className="bg-gradient-to-br from-[#FF6B35]/10 via-white to-[#06D6A0]/10 dark:from-[#FF6B35]/5 dark:via-gray-950 dark:to-[#06D6A0]/5">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <Avatar
              src={avatarUrl}
              name={displayName}
              size="xl"
              className="h-28 w-28 text-4xl ring-4 ring-white shadow-lg dark:ring-gray-900"
            />
            <h1 className="mt-5 font-['Baloo_2'] text-3xl font-bold text-gray-900 dark:text-white">
              {displayName}
            </h1>
            <p className="mt-1 text-lg text-gray-500 dark:text-gray-400">
              {user?.email}
            </p>
            <div className="mt-3">
              <Badge className={`px-4 py-1.5 text-base font-bold ${planColors[subscriptionPlan] || planColors.Free}`}>
                {subscriptionPlan} Plan
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-800">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative flex items-center gap-2 px-5 py-4 font-['Nunito'] text-base font-bold transition-colors ${
                  activeTab === tab
                    ? 'text-[#FF6B35]'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                {tab === 'My Watchlist' ? <Heart className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
                {tab}
                {activeTab === tab && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF6B35]" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {activeTab === 'My Watchlist' && (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white px-6 py-16 text-center dark:border-gray-700 dark:bg-gray-900">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#FF6B35]/10">
              <Heart className="h-10 w-10 text-[#FF6B35]" />
            </div>
            <h3 className="mt-6 font-['Baloo_2'] text-2xl font-bold text-gray-900 dark:text-white">
              No products watched yet
            </h3>
            <p className="mt-3 max-w-sm text-lg text-gray-500 dark:text-gray-400">
              You're not watching any products yet. Search for something you want and tap the heart to watch for price drops!
            </p>
            <Link to="/browse">
              <Button className="mt-8 rounded-xl bg-[#FF6B35] px-8 py-4 text-lg font-bold text-white hover:bg-[#e55a2b]">
                Search Products
              </Button>
            </Link>
          </div>
        )}

        {activeTab === 'Price Alerts' && (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white px-6 py-16 text-center dark:border-gray-700 dark:bg-gray-900">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#06D6A0]/10">
              <Bell className="h-10 w-10 text-[#06D6A0]" />
            </div>
            <h3 className="mt-6 font-['Baloo_2'] text-2xl font-bold text-gray-900 dark:text-white">
              No alerts yet
            </h3>
            <p className="mt-3 max-w-sm text-lg text-gray-500 dark:text-gray-400">
              No alerts yet. Add products to your watchlist and we'll notify you when prices drop!
            </p>
            <Link to="/watchlist">
              <Button className="mt-8 rounded-xl bg-[#06D6A0] px-8 py-4 text-lg font-bold text-white hover:bg-[#05c494]">
                Go to Watchlist
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Settings Section */}
      <div className="border-t border-gray-200 dark:border-gray-800">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <h3 className="mb-6 font-['Baloo_2'] text-2xl font-bold text-gray-900 dark:text-white">
            Settings
          </h3>
          <div className="space-y-3">
            {/* Manage Subscription */}
            <Link
              to="/subscription"
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-5 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800"
            >
              <div className="flex items-center gap-4">
                <CreditCard className="h-6 w-6 text-[#FF6B35]" />
                <div>
                  <p className="font-['Nunito'] text-lg font-bold text-gray-900 dark:text-white">
                    Manage Subscription
                  </p>
                  <p className="text-base text-gray-500">
                    Currently on {subscriptionPlan} plan
                  </p>
                </div>
              </div>
              <span className="text-2xl text-gray-400">&rsaquo;</span>
            </Link>

            {/* Dark Mode Toggle */}
            <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center gap-4">
                {theme === 'dark' ? (
                  <Moon className="h-6 w-6 text-[#FFD23F]" />
                ) : (
                  <Sun className="h-6 w-6 text-[#FFD23F]" />
                )}
                <div>
                  <p className="font-['Nunito'] text-lg font-bold text-gray-900 dark:text-white">
                    Dark Mode
                  </p>
                  <p className="text-base text-gray-500">
                    {theme === 'dark' ? 'Currently on' : 'Currently off'}
                  </p>
                </div>
              </div>
              <button
                onClick={toggleTheme}
                className={`relative h-8 w-14 rounded-full transition-colors ${
                  theme === 'dark' ? 'bg-[#FF6B35]' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-1 left-1 h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${
                    theme === 'dark' ? 'translate-x-6' : ''
                  }`}
                />
              </button>
            </div>

            {/* Sign Out */}
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-4 rounded-xl border border-red-200 bg-white p-5 text-left transition-colors hover:bg-red-50 dark:border-red-900/30 dark:bg-gray-900 dark:hover:bg-red-900/10"
            >
              <LogOut className="h-6 w-6 text-red-500" />
              <div>
                <p className="font-['Nunito'] text-lg font-bold text-red-600">Sign Out</p>
                <p className="text-base text-gray-500">Log out of your account</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
