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

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#050505]">
      {/* Profile Header */}
      <div className="bg-gradient-to-b from-[#111] to-[#050505]">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <Avatar
              src={avatarUrl}
              name={displayName}
              size="xl"
              className="h-24 w-24 text-3xl ring-2 ring-white/10"
            />
            <h1 className="mt-5 font-['Baloo_2'] text-2xl font-bold text-white">
              {displayName}
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              {user?.email}
            </p>
            <div className="mt-3">
              <Badge className="rounded-full bg-[#FF6B35]/10 px-3.5 py-1 text-xs font-bold text-[#FF6B35]">
                {subscriptionPlan} Plan
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-white/5">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative flex items-center gap-2 px-5 py-4 font-['Nunito'] text-sm font-bold transition-colors ${
                  activeTab === tab
                    ? 'text-[#FF6B35]'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {tab === 'My Watchlist' ? <Heart className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
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
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        {activeTab === 'My Watchlist' && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/5 bg-[#111] px-6 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FF6B35]/10">
              <Heart className="h-8 w-8 text-[#FF6B35]" />
            </div>
            <h3 className="mt-6 font-['Baloo_2'] text-xl font-bold text-white">
              No products watched yet
            </h3>
            <p className="mt-2 max-w-sm text-sm text-zinc-500">
              You're not watching any products yet. Search for something you want and tap the heart to watch for price drops.
            </p>
            <Link to="/browse">
              <Button className="mt-8 rounded-xl bg-[#FF6B35] px-8 py-3.5 text-sm font-bold text-white transition-colors hover:bg-[#e55a2b]">
                Search Products
              </Button>
            </Link>
          </div>
        )}

        {activeTab === 'Price Alerts' && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/5 bg-[#111] px-6 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#06D6A0]/10">
              <Bell className="h-8 w-8 text-[#06D6A0]" />
            </div>
            <h3 className="mt-6 font-['Baloo_2'] text-xl font-bold text-white">
              No alerts yet
            </h3>
            <p className="mt-2 max-w-sm text-sm text-zinc-500">
              No alerts yet. Add products to your watchlist and we'll notify you when prices drop.
            </p>
            <Link to="/watchlist">
              <Button className="mt-8 rounded-xl bg-[#06D6A0] px-8 py-3.5 text-sm font-bold text-white transition-colors hover:bg-[#05c494]">
                Go to Watchlist
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Settings Section */}
      <div className="border-t border-white/5">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
          <h3 className="mb-5 font-['Baloo_2'] text-lg font-bold text-white">
            Settings
          </h3>
          <div className="space-y-2">
            {/* Manage Subscription */}
            <Link
              to="/subscription"
              className="flex items-center justify-between rounded-xl border border-white/5 bg-[#111] p-4 transition-colors hover:border-white/10"
            >
              <div className="flex items-center gap-4">
                <CreditCard className="h-5 w-5 text-[#FF6B35]" />
                <div>
                  <p className="font-['Nunito'] text-sm font-bold text-white">
                    Manage Subscription
                  </p>
                  <p className="text-xs text-zinc-500">
                    Currently on {subscriptionPlan} plan
                  </p>
                </div>
              </div>
              <span className="text-xl text-zinc-600">&rsaquo;</span>
            </Link>

            {/* Dark Mode Toggle */}
            <div className="flex items-center justify-between rounded-xl border border-white/5 bg-[#111] p-4">
              <div className="flex items-center gap-4">
                {theme === 'dark' ? (
                  <Moon className="h-5 w-5 text-[#FFD23F]" />
                ) : (
                  <Sun className="h-5 w-5 text-[#FFD23F]" />
                )}
                <div>
                  <p className="font-['Nunito'] text-sm font-bold text-white">
                    Dark Mode
                  </p>
                  <p className="text-xs text-zinc-500">
                    {theme === 'dark' ? 'Currently on' : 'Currently off'}
                  </p>
                </div>
              </div>
              <button
                onClick={toggleTheme}
                className={`relative h-7 w-12 rounded-full transition-colors ${
                  theme === 'dark' ? 'bg-[#FF6B35]' : 'bg-zinc-700'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${
                    theme === 'dark' ? 'translate-x-5' : ''
                  }`}
                />
              </button>
            </div>

            {/* Sign Out */}
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-4 rounded-xl border border-red-500/20 bg-[#111] p-4 text-left transition-colors hover:bg-red-500/5"
            >
              <LogOut className="h-5 w-5 text-red-500" />
              <div>
                <p className="font-['Nunito'] text-sm font-bold text-red-400">Sign Out</p>
                <p className="text-xs text-zinc-500">Log out of your account</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
