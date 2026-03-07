import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Star,
  MapPin,
  Shield,
  BadgeCheck,
  Settings,
  LogOut,
  Moon,
  Sun,
  Edit,
  Package,
  ShoppingBag,
  MessageSquare,
} from 'lucide-react';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import { useAuthStore } from '../stores/authStore';
import { useThemeStore } from '../stores/themeStore';
import { useSellerProducts } from '../hooks/useProducts';
import { useMyOrders } from '../hooks/useOrders';

const TABS = ['Listings', 'Reviews', 'Orders'];

export default function ProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const [activeTab, setActiveTab] = useState('Listings');

  const isOwnProfile = !id || id === user?.id;
  const profileUserId = isOwnProfile ? user?.id : id;

  const { data: products, isLoading: productsLoading } = useSellerProducts(profileUserId);
  const { data: orders, isLoading: ordersLoading } = useMyOrders();

  // Redirect if not logged in and viewing own profile
  useEffect(() => {
    if (!user && !id) {
      navigate('/auth');
    }
  }, [user, id, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const displayProfile = isOwnProfile ? profile : null;
  const displayName = displayProfile?.name || displayProfile?.full_name || user?.email?.split('@')[0] || 'User';
  const trustScore = displayProfile?.trust_score || 0;
  const bio = displayProfile?.bio || '';
  const userLocation = displayProfile?.location || '';
  const avatarUrl = displayProfile?.avatar_url || '';
  const isVerified = displayProfile?.is_verified;
  const isEmailVerified = displayProfile?.email_verified;
  const listingsCount = products?.length || 0;
  const salesCount = displayProfile?.sales_count || 0;
  const reviewsAvg = displayProfile?.reviews_avg || 0;

  if (!user && !id) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Profile Header */}
      <div className="bg-gradient-to-br from-[#FF6B35]/10 via-white to-[#06D6A0]/10 dark:from-[#FF6B35]/5 dark:via-gray-950 dark:to-[#06D6A0]/5">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left">
            <Avatar
              src={avatarUrl}
              name={displayName}
              size="xl"
              className="h-24 w-24 text-3xl ring-4 ring-white shadow-lg dark:ring-gray-900"
            />
            <div className="mt-4 flex-1 sm:ml-6 sm:mt-0">
              <div className="flex flex-col items-center gap-2 sm:flex-row">
                <h1 className="font-['Baloo_2'] text-2xl font-bold text-gray-900 dark:text-white md:text-3xl">
                  {displayName}
                </h1>
                <div className="flex items-center gap-1">
                  {isVerified && (
                    <Badge className="bg-[#06D6A0]/10 text-[#06D6A0] flex items-center gap-1">
                      <BadgeCheck className="h-3.5 w-3.5" />
                      Verified
                    </Badge>
                  )}
                  {isEmailVerified && (
                    <Badge className="bg-blue-50 text-blue-600 flex items-center gap-1 dark:bg-blue-900/20">
                      <Shield className="h-3.5 w-3.5" />
                      Email
                    </Badge>
                  )}
                </div>
              </div>

              {bio && (
                <p className="mt-2 font-['Nunito'] text-gray-600 dark:text-gray-400">
                  {bio}
                </p>
              )}

              <div className="mt-3 flex flex-wrap items-center justify-center gap-4 sm:justify-start">
                {/* Trust Score */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < Math.round(trustScore)
                          ? 'fill-[#FFD23F] text-[#FFD23F]'
                          : 'text-gray-300 dark:text-gray-600'
                      }`}
                    />
                  ))}
                  <span className="ml-1 font-['Nunito'] text-sm font-semibold text-gray-600 dark:text-gray-400">
                    {trustScore.toFixed(1)}
                  </span>
                </div>

                {userLocation && (
                  <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                    <MapPin className="h-4 w-4" />
                    {userLocation}
                  </div>
                )}
              </div>

              {/* Stats Row */}
              <div className="mt-4 flex items-center justify-center gap-6 sm:justify-start">
                <div className="text-center">
                  <p className="font-['Baloo_2'] text-xl font-bold text-gray-900 dark:text-white">
                    {listingsCount}
                  </p>
                  <p className="text-xs text-gray-500">Listings</p>
                </div>
                <div className="h-8 w-px bg-gray-200 dark:bg-gray-700" />
                <div className="text-center">
                  <p className="font-['Baloo_2'] text-xl font-bold text-gray-900 dark:text-white">
                    {salesCount}
                  </p>
                  <p className="text-xs text-gray-500">Sales</p>
                </div>
                <div className="h-8 w-px bg-gray-200 dark:bg-gray-700" />
                <div className="text-center">
                  <p className="font-['Baloo_2'] text-xl font-bold text-gray-900 dark:text-white">
                    {reviewsAvg ? reviewsAvg.toFixed(1) : '--'}
                  </p>
                  <p className="text-xs text-gray-500">Avg Review</p>
                </div>
              </div>
            </div>

            {isOwnProfile && (
              <Link to="/profile/edit">
                <Button className="mt-4 flex items-center gap-2 border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 sm:mt-0">
                  <Edit className="h-4 w-4" />
                  Edit Profile
                </Button>
              </Link>
            )}
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
                className={`relative px-4 py-3 font-['Nunito'] text-sm font-semibold transition-colors ${
                  activeTab === tab
                    ? 'text-[#FF6B35]'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
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
        {activeTab === 'Listings' && (
          <>
            {productsLoading ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-64 rounded-xl" />
                ))}
              </div>
            ) : !products?.length ? (
              <EmptyState
                icon="package"
                title="No listings yet"
                description={
                  isOwnProfile
                    ? "You haven't listed any products yet. Start selling!"
                    : 'This user has no active listings.'
                }
                action={
                  isOwnProfile && (
                    <Link to="/sell">
                      <Button className="bg-[#FF6B35] px-6 py-2 text-white hover:bg-[#e55a2b]">
                        List Your First Item
                      </Button>
                    </Link>
                  )
                }
              />
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {products.map((product) => (
                  <Card key={product.id} product={product} />
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'Reviews' && (
          <div className="space-y-4">
            {/* Placeholder reviews - would come from a useReviews hook */}
            <EmptyState
              icon="star"
              title="No reviews yet"
              description={
                isOwnProfile
                  ? "You haven't received any reviews yet."
                  : 'This user has no reviews.'
              }
            />
          </div>
        )}

        {activeTab === 'Orders' && isOwnProfile && (
          <>
            {ordersLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-xl" />
                ))}
              </div>
            ) : !orders?.length ? (
              <EmptyState
                icon="shopping-bag"
                title="No orders yet"
                description="Your purchase history will appear here."
                action={
                  <Link to="/browse">
                    <Button className="bg-[#FF6B35] px-6 py-2 text-white hover:bg-[#e55a2b]">
                      Start Shopping
                    </Button>
                  </Link>
                }
              />
            ) : (
              <div className="space-y-3">
                {orders.map((order) => (
                  <Link
                    key={order.id}
                    to={`/orders`}
                    className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800"
                  >
                    {order.product?.image && (
                      <img
                        src={order.product.image}
                        alt=""
                        className="h-14 w-14 rounded-lg object-cover"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-['Nunito'] font-bold text-gray-900 dark:text-white">
                        {order.product?.title || 'Order'}
                      </p>
                      <p className="text-sm text-gray-500">
                        ${order.total?.toFixed(2)} &middot; {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge
                      className={`capitalize ${
                        order.status === 'delivered'
                          ? 'bg-[#06D6A0]/10 text-[#06D6A0]'
                          : order.status === 'shipped'
                          ? 'bg-blue-50 text-blue-600'
                          : order.status === 'cancelled'
                          ? 'bg-red-50 text-red-600'
                          : 'bg-[#FFD23F]/10 text-[#FFD23F]'
                      }`}
                    >
                      {order.status}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Settings Section (own profile only) */}
      {isOwnProfile && (
        <div className="border-t border-gray-200 dark:border-gray-800">
          <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
            <h3 className="mb-4 font-['Baloo_2'] text-lg font-bold text-gray-900 dark:text-white">
              Settings
            </h3>
            <div className="space-y-2">
              {/* Dark Mode Toggle */}
              <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                <div className="flex items-center gap-3">
                  {theme === 'dark' ? (
                    <Moon className="h-5 w-5 text-[#FFD23F]" />
                  ) : (
                    <Sun className="h-5 w-5 text-[#FFD23F]" />
                  )}
                  <div>
                    <p className="font-['Nunito'] font-bold text-gray-900 dark:text-white">
                      Dark Mode
                    </p>
                    <p className="text-sm text-gray-500">
                      {theme === 'dark' ? 'Currently on' : 'Currently off'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={toggleTheme}
                  className={`relative h-6 w-11 rounded-full transition-colors ${
                    theme === 'dark' ? 'bg-[#FF6B35]' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                      theme === 'dark' ? 'translate-x-5' : ''
                    }`}
                  />
                </button>
              </div>

              {/* Sign Out */}
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-3 rounded-xl border border-red-200 bg-white p-4 text-left transition-colors hover:bg-red-50 dark:border-red-900/30 dark:bg-gray-900 dark:hover:bg-red-900/10"
              >
                <LogOut className="h-5 w-5 text-red-500" />
                <div>
                  <p className="font-['Nunito'] font-bold text-red-600">Sign Out</p>
                  <p className="text-sm text-gray-500">Log out of your account</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
