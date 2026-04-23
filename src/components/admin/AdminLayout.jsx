import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, Package, ShoppingCart, Store,
  Megaphone, Settings, ArrowLeft, Search, Terminal,
} from 'lucide-react'

const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/search', label: 'Search AE', icon: Search },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { to: '/admin/stores', label: 'Stores', icon: Store },
  { to: '/admin/marketing', label: 'Marketing', icon: Megaphone },
  { to: '/admin/api-tester', label: 'API Tester', icon: Terminal },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
]

export default function AdminLayout({ children }) {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-[#050505]">
      {/* Top bar */}
      <div className="border-b border-white/[0.06] bg-[#0a0a0a]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex items-center justify-between py-3">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-[#FF6B35] transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Site
            </Link>
            <span className="text-xs font-medium text-zinc-600">Admin Panel</span>
          </div>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="border-b border-white/[0.06] bg-[#0a0a0a] sticky top-0 z-30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex gap-1 overflow-x-auto py-2 scrollbar-hide">
            {NAV_ITEMS.map((item) => {
              const isActive = location.pathname === item.to
              const Icon = item.icon
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex-shrink-0 flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-[#FF6B35] text-white'
                      : 'text-zinc-500 hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {/* Page content */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {children}
      </div>
    </div>
  )
}
