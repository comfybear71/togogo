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
          <Route path="/product/:id" element={<ProductDetailPage />} />
          <Route path="/watchlist" element={<WatchlistPage />} />
          <Route path="/subscription" element={<SubscriptionPage />} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
