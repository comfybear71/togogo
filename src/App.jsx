import { useEffect, lazy, Suspense, useMemo } from 'react'
import { Routes, Route } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import { useThemeStore } from './stores/themeStore'
import AppLayout from './components/layout/AppLayout'
import ProtectedRoute from './components/auth/ProtectedRoute'
import AdminRoute from './components/admin/AdminRoute'
import AdminLayout from './components/admin/AdminLayout'
import StorefrontPage from './pages/StorefrontPage'

// Core pages loaded eagerly for instant navigation
import HomePage from './pages/HomePage'
import SetupPage from './pages/SetupPage'
import SetupPaymentsPage from './pages/SetupPaymentsPage'
import MyShopPage from './pages/MyShopPage'
import SuppliersPage from './pages/SuppliersPage'
import PromotionsPage from './pages/PromotionsPage'
import PlatformsPage from './pages/PlatformsPage'
import SubscriptionPage from './pages/SubscriptionPage'
import AuthPage from './pages/AuthPage'

// Less-visited pages stay lazy
const BrowsePage = lazy(() => import('./pages/BrowsePage'))
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'))
const WatchlistPage = lazy(() => import('./pages/WatchlistPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const AssistantPage = lazy(() => import('./pages/AssistantPage'))
const PlatformGuidePage = lazy(() => import('./pages/PlatformGuidePage'))
const AdminDashboard = lazy(() => import('./pages/admin/DashboardPage'))
const AdminUsers = lazy(() => import('./pages/admin/UsersPage'))
const AdminProducts = lazy(() => import('./pages/admin/ProductsPage'))
const AdminOrders = lazy(() => import('./pages/admin/OrdersPage'))
const AdminMarketing = lazy(() => import('./pages/admin/MarketingPage'))
const AdminStores = lazy(() => import('./pages/admin/StoresPage'))
const AdminSettings = lazy(() => import('./pages/admin/SettingsPage'))
const AuthCallbackPage = lazy(() => import('./pages/AuthCallbackPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const LaunchStorePage = lazy(() => import('./pages/LaunchStorePage'))
const OneClickStorePage = lazy(() => import('./pages/OneClickStorePage'))
const CartPage = lazy(() => import('./pages/CartPage'))
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'))
const OrdersPage = lazy(() => import('./pages/OrdersPage'))
const InboxPage = lazy(() => import('./pages/InboxPage'))
const SellPage = lazy(() => import('./pages/SellPage'))
const MarketingPage = lazy(() => import('./pages/MarketingPage'))
const ShippingPage = lazy(() => import('./pages/ShippingPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))
const TermsPage = lazy(() => import('./pages/TermsPage'))
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] bg-[#050505]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-[#FF6B35] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-zinc-500 font-medium">Loading...</p>
      </div>
    </div>
  )
}

// Detect if we're on a customer store subdomain (e.g. mystore.togogo.me)
function getStoreSubdomain() {
  // Check for ?store=mystore query param first (works on any host)
  const params = new URLSearchParams(window.location.search)
  if (params.get('store')) return params.get('store')

  const host = window.location.hostname
  // Main domains — NOT a storefront
  const mainHosts = ['togogo.me', 'www.togogo.me', 'localhost', '127.0.0.1']
  if (mainHosts.includes(host)) return null
  // Vercel preview/production URLs are the main app, not a storefront
  if (host.endsWith('.vercel.app')) return null
  // Check for subdomain of togogo.me (e.g. mystore.togogo.me)
  if (host.endsWith('.togogo.me')) {
    const sub = host.replace('.togogo.me', '')
    if (sub && sub !== 'www' && sub !== 'api' && sub !== 'admin') return sub
  }
  return null
}

export default function App() {
  const initialize = useAuthStore((s) => s.initialize)
  const initTheme = useThemeStore((s) => s.initTheme)
  const storeSubdomain = useMemo(() => getStoreSubdomain(), [])

  useEffect(() => {
    if (!storeSubdomain) {
      initialize()
      initTheme()
    }
  }, [initialize, initTheme, storeSubdomain])

  // If on a customer subdomain, render their storefront (no main app chrome)
  if (storeSubdomain) {
    return <StorefrontPage subdomain={storeSubdomain} />
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />

        <Route path="/assistant" element={<AssistantPage />} />

        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/browse" element={<BrowsePage />} />
          <Route path="/suppliers" element={<SuppliersPage />} />
          <Route path="/platforms" element={<PlatformsPage />} />
          <Route path="/setup" element={<SetupPage />} />
          <Route path="/setup-payments" element={<ProtectedRoute><SetupPaymentsPage /></ProtectedRoute>} />
          <Route path="/guide/:platform" element={<PlatformGuidePage />} />
          <Route path="/launch-store" element={<ProtectedRoute><LaunchStorePage /></ProtectedRoute>} />
          <Route path="/create-store" element={<ProtectedRoute><OneClickStorePage /></ProtectedRoute>} />
          <Route path="/my-shop" element={<ProtectedRoute><MyShopPage /></ProtectedRoute>} />
          <Route path="/promotions" element={<PromotionsPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/product/:id" element={<ProductDetailPage />} />
          <Route path="/watchlist" element={<WatchlistPage />} />
          <Route path="/subscription" element={<SubscriptionPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
          <Route path="/inbox" element={<ProtectedRoute><InboxPage /></ProtectedRoute>} />
          <Route path="/sell" element={<SellPage />} />
          <Route path="/marketing" element={<ProtectedRoute><MarketingPage /></ProtectedRoute>} />
          <Route path="/shipping" element={<ShippingPage />} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        </Route>

        {/* Admin routes — protected by JWT / setup secret, wrapped in dark AdminLayout */}
        <Route path="/admin" element={<AdminRoute><AdminLayout><AdminDashboard /></AdminLayout></AdminRoute>} />
        <Route path="/admin/users" element={<AdminRoute><AdminLayout><AdminUsers /></AdminLayout></AdminRoute>} />
        <Route path="/admin/products" element={<AdminRoute><AdminLayout><AdminProducts /></AdminLayout></AdminRoute>} />
        <Route path="/admin/orders" element={<AdminRoute><AdminLayout><AdminOrders /></AdminLayout></AdminRoute>} />
        <Route path="/admin/stores" element={<AdminRoute><AdminLayout><AdminStores /></AdminLayout></AdminRoute>} />
        <Route path="/admin/marketing" element={<AdminRoute><AdminLayout><AdminMarketing /></AdminLayout></AdminRoute>} />
        <Route path="/admin/settings" element={<AdminRoute><AdminLayout><AdminSettings /></AdminLayout></AdminRoute>} />

        <Route element={<AppLayout />}>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
