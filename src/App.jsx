import { useEffect, lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import { useThemeStore } from './stores/themeStore'
import AppLayout from './components/layout/AppLayout'
import ProtectedRoute from './components/auth/ProtectedRoute'

const HomePage = lazy(() => import('./pages/HomePage'))
const BrowsePage = lazy(() => import('./pages/BrowsePage'))
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'))
const WatchlistPage = lazy(() => import('./pages/WatchlistPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const SubscriptionPage = lazy(() => import('./pages/SubscriptionPage'))
const AuthPage = lazy(() => import('./pages/AuthPage'))
const AssistantPage = lazy(() => import('./pages/AssistantPage'))
const SuppliersPage = lazy(() => import('./pages/SuppliersPage'))
const PlatformsPage = lazy(() => import('./pages/PlatformsPage'))
const SetupPage = lazy(() => import('./pages/SetupPage'))
const PlatformGuidePage = lazy(() => import('./pages/PlatformGuidePage'))
const PromotionsPage = lazy(() => import('./pages/PromotionsPage'))
const AdminDashboard = lazy(() => import('./pages/admin/DashboardPage'))
const AdminUsers = lazy(() => import('./pages/admin/UsersPage'))
const AdminProducts = lazy(() => import('./pages/admin/ProductsPage'))
const AdminOrders = lazy(() => import('./pages/admin/OrdersPage'))
const AdminMarketing = lazy(() => import('./pages/admin/MarketingPage'))
const AdminSettings = lazy(() => import('./pages/admin/SettingsPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

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

        <Route path="/assistant" element={<AssistantPage />} />

        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/browse" element={<BrowsePage />} />
          <Route path="/suppliers" element={<SuppliersPage />} />
          <Route path="/platforms" element={<PlatformsPage />} />
          <Route path="/setup" element={<SetupPage />} />
          <Route path="/guide/:platform" element={<PlatformGuidePage />} />
          <Route path="/promotions" element={<PromotionsPage />} />
          <Route path="/product/:id" element={<ProductDetailPage />} />
          <Route path="/watchlist" element={<WatchlistPage />} />
          <Route path="/subscription" element={<SubscriptionPage />} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
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
