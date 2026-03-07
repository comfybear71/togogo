import { NavLink } from 'react-router-dom'
import { House, Search, Heart, User } from 'lucide-react'
import { useWatchlistStore } from '../../stores/cartStore'

const tabs = [
  { to: '/', label: 'Home', icon: House },
  { to: '/browse', label: 'Search', icon: Search },
  { to: '/watchlist', label: 'Watchlist', icon: Heart },
  { to: '/profile', label: 'Account', icon: User },
]

export default function BottomNav() {
  const watchCount = useWatchlistStore((s) => s.getItemCount())

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom)] lg:hidden">
      <div className="flex items-center justify-around h-20 px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center flex-1 h-full gap-1 ${
                  isActive ? 'text-[#FF6B35]' : 'text-gray-400'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="relative">
                    <Icon className="w-7 h-7" strokeWidth={isActive ? 2.5 : 2} />
                    {tab.label === 'Watchlist' && watchCount > 0 && (
                      <span className="absolute -top-1 -right-2 min-w-[20px] h-[20px] flex items-center justify-center text-[11px] font-bold text-white bg-[#FF6B35] rounded-full">
                        {watchCount}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-medium">{tab.label}</span>
                </>
              )}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
