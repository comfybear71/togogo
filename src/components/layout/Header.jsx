import React from 'react'
import { Link } from 'react-router-dom'
import { Bell, ShoppingCart } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useCartStore } from '../../stores/cartStore'

export default function Header() {
  const { user, profile } = useAuthStore()
  const itemCount = useCartStore((s) => s.getItemCount())

  return (
    <header className="hidden lg:flex fixed top-0 right-0 left-64 z-30 h-16 items-center justify-between bg-white border-b border-gray-200 px-6">
      {/* Search bar centered */}
      <div className="flex-1 flex justify-center max-w-2xl mx-auto">
        <div className="relative w-full">
          <input
            type="text"
            placeholder="Search items, categories, sellers..."
            className="w-full h-10 pl-4 pr-4 rounded-full bg-gray-100 border border-gray-200 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] transition-colors"
          />
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-3 ml-4">
        {/* Notifications */}
        <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
        </button>

        {/* Cart */}
        <Link
          to="/cart"
          className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ShoppingCart className="w-5 h-5" />
          {itemCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-[#FF6B35] rounded-full">
              {itemCount > 99 ? '99+' : itemCount}
            </span>
          )}
        </Link>

        {/* User avatar or Login */}
        {user ? (
          <Link
            to="/profile"
            className="flex items-center gap-2 ml-2"
          >
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name || 'User'}
                className="w-8 h-8 rounded-full object-cover border-2 border-gray-200"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#FF6B35] flex items-center justify-center text-white text-sm font-semibold">
                {(profile?.display_name || user.email || '?')[0].toUpperCase()}
              </div>
            )}
          </Link>
        ) : (
          <Link
            to="/login"
            className="ml-2 px-4 py-2 text-sm font-medium text-white bg-[#FF6B35] rounded-full hover:bg-[#e55a2b] transition-colors"
          >
            Login
          </Link>
        )}
      </div>
    </header>
  )
}
