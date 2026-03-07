import { Link, useNavigate } from 'react-router-dom'
import { Search, User, Heart } from 'lucide-react'
import { useState } from 'react'
import { useAuthStore } from '../../stores/authStore'
import { useWatchlistStore } from '../../stores/cartStore'
import Logo from './Logo'

export default function Header() {
  const { user, profile } = useAuthStore()
  const watchCount = useWatchlistStore((s) => s.getItemCount())
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  const handleSearch = (e) => {
    e.preventDefault()
    if (query.trim()) {
      navigate(`/browse?q=${encodeURIComponent(query.trim())}`)
      setQuery('')
    }
  }

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
      <div className="max-w-6xl mx-auto flex items-center gap-4 h-20 px-4">
        {/* Logo */}
        <Link to="/" className="shrink-0">
          <Logo size="sm" />
        </Link>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1 max-w-xl">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="What are you looking for?"
              className="w-full h-14 pl-12 pr-4 rounded-2xl bg-gray-50 border-2 border-gray-200 text-lg placeholder-gray-400 focus:outline-none focus:border-[#FF6B35] transition-colors"
            />
          </div>
        </form>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {/* Watchlist */}
          <Link
            to="/watchlist"
            className="relative flex items-center justify-center w-12 h-12 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <Heart className="w-6 h-6" />
            {watchCount > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[22px] h-[22px] px-1 text-xs font-bold text-white bg-[#FF6B35] rounded-full">
                {watchCount}
              </span>
            )}
          </Link>

          {/* Profile or Sign In */}
          {user ? (
            <Link
              to="/profile"
              className="flex items-center justify-center w-12 h-12 rounded-xl overflow-hidden hover:bg-gray-100 transition-colors"
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-10 h-10 rounded-xl object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-[#FF6B35] flex items-center justify-center text-white text-lg font-bold">
                  {(profile?.name || user.email || '?')[0].toUpperCase()}
                </div>
              )}
            </Link>
          ) : (
            <Link
              to="/auth"
              className="flex items-center gap-2 h-12 px-6 text-base font-semibold text-white bg-[#FF6B35] rounded-xl hover:bg-[#e55a2b] transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
