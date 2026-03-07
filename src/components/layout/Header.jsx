import { Link } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import Logo from './Logo'

export default function Header() {
  const { user, profile } = useAuthStore()

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-6xl mx-auto flex items-center justify-between h-16 px-6">
        {/* Logo */}
        <Link to="/" className="shrink-0">
          <Logo size="sm" />
        </Link>

        {/* Right actions */}
        <div className="flex items-center">
          {user ? (
            <Link
              to="/profile"
              className="flex items-center justify-center w-9 h-9 rounded-full overflow-hidden transition-opacity hover:opacity-80"
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#FFD23F] flex items-center justify-center text-white text-sm font-bold">
                  {(profile?.name || user.email || '?')[0].toUpperCase()}
                </div>
              )}
            </Link>
          ) : (
            <Link
              to="/auth"
              className="flex items-center h-9 px-5 text-sm font-medium text-white bg-white/[0.06] border border-white/[0.08] rounded-full hover:bg-white/[0.1] transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
