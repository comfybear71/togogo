import { useEffect, lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import { useThemeStore } from './stores/themeStore'
import AppLayout from './components/layout/AppLayout'
import ProtectedRoute from './components/auth/ProtectedRoute'

// Core pages loaded eagerly for instant navigation
import HomePage from './pages/HomePage'
import SetupPage from './pages/SetupPage'
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
const AdminSettings = lazy(() => import('./pages/admin/SettingsPage'))
const AuthCallbackPage = lazy(() => import('./pages/AuthCallbackPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const LaunchStorePage = lazy(() => import('./pages/LaunchStorePage'))
const OneClickStorePage = lazy(() => import('./pages/OneClickStorePage'))
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

export default function App() {
  const initialize = useAuthStore((s) => s.initialize)
  const initTheme = useThemeStore((s) => s.initTheme)

  useEffect(() => {
    initialize()
    initTheme()
  }, [initialize, initTheme])

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
          <Route path="/guide/:platform" element={<PlatformGuidePage />} />
          <Route path="/launch-store" element={<LaunchStorePage />} />
          <Route path="/create-store" element={<OneClickStorePage />} />
          <Route path="/my-shop" element={<MyShopPage />} />
          <Route path="/promotions" element={<PromotionsPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/product/:id" element={<ProductDetailPage />} />
          <Route path="/watchlist" element={<WatchlistPage />} />
          <Route path="/subscription" element={<SubscriptionPage />} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        </Route>

        {/* Admin routes — no AppLayout (admin has its own) */}
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/products" element={<AdminProducts />} />
        <Route path="/admin/orders" element={<AdminOrders />} />
        <Route path="/admin/marketing" element={<AdminMarketing />} />
        <Route path="/admin/settings" element={<AdminSettings />} />

        <Route element={<AppLayout />}>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
