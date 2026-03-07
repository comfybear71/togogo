import React from 'react'
import { NavLink } from 'react-router-dom'
import { House, Search, Plus, MessageCircle, User } from 'lucide-react'

const tabs = [
  { to: '/', label: 'Home', icon: House },
  { to: '/browse', label: 'Search', icon: Search },
  { to: '/sell', label: 'Sell', icon: Plus, isSell: true },
  { to: '/inbox', label: 'Inbox', icon: MessageCircle, hasBadge: true },
  { to: '/profile', label: 'Profile', icon: User },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom)] lg:hidden">
      <div className="flex items-end justify-around h-16 px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon

          if (tab.isSell) {
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                className="flex flex-col items-center justify-center -mt-5"
              >
                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-[#FF6B35] shadow-lg shadow-[#FF6B35]/30">
                  <Icon className="w-7 h-7 text-white" strokeWidth={2.5} />
                </div>
                <span className="text-[10px] mt-0.5 text-gray-500">{tab.label}</span>
              </NavLink>
            )
          }

          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center flex-1 h-full ${
                  isActive ? 'text-[#FF6B35]' : 'text-gray-400'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="relative">
                    <Icon
                      className="w-6 h-6"
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                    {tab.hasBadge && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
                    )}
                  </div>
                  <span className="text-[10px] mt-0.5">{tab.label}</span>
                </>
              )}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
