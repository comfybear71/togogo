import { NavLink } from 'react-router-dom'
import { House, Search, Heart, User, LayoutDashboard, Rocket } from 'lucide-react'
import { useWatchlistStore } from '../../stores/cartStore'
import { useAuthStore } from '../../stores/authStore'

const tabs = [
  { to: '/', icon: House },
  { to: '/browse', icon: Search },
  { to: '/watchlist', icon: Heart, badge: true },
  { to: '/profile', icon: User, authOnly: false },
]

export default function BottomNav() {
  const watchlistCount = useWatchlistStore((s) => s.items.length)
  const user = useAuthStore((s) => s.user)

  // Show dashboard tab if logged in, profile tab for the last icon
  const activeTabs = user
    ? [
        { to: '/', icon: House },
        { to: '/browse', icon: Search },
        { to: '/launch-store', icon: Rocket },
        { to: '/dashboard', icon: LayoutDashboard },
        { to: '/profile', icon: User },
      ]
    : tabs

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-xl border-t border-white/5 pb-[env(safe-area-inset-bottom)] xl:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {activeTabs.map((tab) => {
          const Icon = tab.icon
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === '/'}
              className={({ isActive }) =>
                `relative flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                  isActive ? 'text-[#FF6B35]' : 'text-zinc-500 hover:text-zinc-400'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="relative">
                    <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 1.5} />
                    {tab.badge && watchlistCount > 0 && (
                      <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#FF6B35] px-1 text-[10px] font-bold text-white">
                        {watchlistCount}
                      </span>
                    )}
                  </div>
                  {isActive && (
                    <div className="absolute bottom-2.5 h-[3px] w-[3px] rounded-full bg-[#FF6B35]" />
                  )}
                </>
              )}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
