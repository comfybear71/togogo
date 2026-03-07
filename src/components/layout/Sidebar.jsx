import React from 'react'
import { NavLink } from 'react-router-dom'
import { House, Search, Plus, MessageCircle, User, ShieldCheck } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import Logo from './Logo'

const navItems = [
  { to: '/', label: 'Home', icon: House },
  { to: '/browse', label: 'Search', icon: Search },
  { to: '/sell', label: 'Sell', icon: Plus },
  { to: '/inbox', label: 'Inbox', icon: MessageCircle },
  { to: '/profile', label: 'Profile', icon: User },
]

export default function Sidebar() {
  const profile = useAuthStore((s) => s.profile)
  const isAdmin = profile?.role === 'admin'

  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-64 flex-col bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="flex items-center justify-center h-16 border-b border-gray-100">
        <NavLink to="/">
          <Logo size="sm" />
        </NavLink>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-1 p-4">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#FF6B35]/10 text-[#FF6B35]'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          )
        })}

        {isAdmin && (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[#FF6B35]/10 text-[#FF6B35]'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            <ShieldCheck className="w-5 h-5" />
            <span>Admin</span>
          </NavLink>
        )}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100">
        <p className="text-xs text-gray-400 text-center">
          &copy; {new Date().getFullYear()} ToGoGo
        </p>
      </div>
    </aside>
  )
}
