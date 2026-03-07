import { useEffect, lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import { useThemeStore } from './stores/themeStore'
import AppLayout from './components/layout/AppLayout'
import ProtectedRoute from './components/auth/ProtectedRoute'

// Lazy load pages for better performance
const HomePage = lazy(() => import('./pages/HomePage'))
const BrowsePage = lazy(() => import('./pages/BrowsePage'))
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'))
const SellPage = lazy(() => import('./pages/SellPage'))
const InboxPage = lazy(() => import('./pages/InboxPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const StorefrontPage = lazy(() => import('./pages/StorefrontPage'))
const CartPage = lazy(() => import('./pages/CartPage'))
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'))
const AuthPage = lazy(() => import('./pages/AuthPage'))
const OrdersPage = lazy(() => import('./pages/OrdersPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

// Admin pages
const AdminDashboard = lazy(() => import('./pages/admin/DashboardPage'))
const AdminUsers = lazy(() => import('./pages/admin/UsersPage'))
const AdminProducts = lazy(() => import('./pages/admin/ProductsPage'))
const AdminOrders = lazy(() => import('./pages/admin/OrdersPage'))
const AdminMarketing = lazy(() => import('./pages/admin/MarketingPage'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-[#FF6B35] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-[#6B7280] font-medium">Loading...</p>
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
        {/* Auth - no layout */}
        <Route path="/auth" element={<AuthPage />} />

        {/* Main app with layout */}
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/browse" element={<BrowsePage />} />
          <Route path="/product/:id" element={<ProductDetailPage />} />
          <Route path="/store/:username" element={<StorefrontPage />} />
          <Route path="/cart" element={<CartPage />} />

          {/* Protected routes */}
          <Route path="/sell" element={<ProtectedRoute><SellPage /></ProtectedRoute>} />
          <Route path="/inbox" element={<ProtectedRoute><InboxPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/profile/:id" element={<ProfilePage />} />
          <Route path="/orders" element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
          <Route path="/checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />

          {/* Admin routes */}
          <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute requiredRole="admin"><AdminUsers /></ProtectedRoute>} />
          <Route path="/admin/products" element={<ProtectedRoute requiredRole="admin"><AdminProducts /></ProtectedRoute>} />
          <Route path="/admin/orders" element={<ProtectedRoute requiredRole="admin"><AdminOrders /></ProtectedRoute>} />
          <Route path="/admin/marketing" element={<ProtectedRoute requiredRole="admin"><AdminMarketing /></ProtectedRoute>} />

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
