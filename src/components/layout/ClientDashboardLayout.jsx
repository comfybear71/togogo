import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import {
  Home, Store, Package, DollarSign, Settings, LogOut, ChevronDown, Shield,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'

// Client-facing dashboard layout for store owners (/my-shop and sub-routes).
//
// Deliberate accessibility choices for our elderly user base:
//   - Sidebar nav is ALWAYS visible on desktop (≥ 768px), never behind a
//     hamburger — our users want to see where they can go.
//   - Every nav item is icon + text label (no icon-only).
//   - Base text is 16px, nav labels 17px, touch targets 52px tall (> WCAG
//     AAA minimum of 44×44).
//   - Active route highlighted with a 4px left accent bar (not just
//     subtle colour change), so users can see at a glance "you are here".
//   - Mobile (< 768px): sidebar becomes a bottom tab bar — thumb-reachable.
const NAV_ITEMS = [
  { to: '/my-shop',          label: 'Home',     icon: Home,    end: true  },
  { to: '/my-shop/store',    label: 'My Store', icon: Store },
  { to: '/my-shop/orders',   label: 'Orders',   icon: Package },
  { to: '/my-shop/earnings', label: 'Earnings', icon: DollarSign },
  { to: '/my-shop/account',  label: 'Account',  icon: Settings },
]

// Shown only when the signed-in user has role === 'admin'. Sits at the
// bottom of the sidebar so store owners' primary items aren't crowded.
const ADMIN_ITEM = { to: '/admin/orders', label: 'Admin Panel', icon: Shield }

function SidebarNav({ items, onNavigate }) {
  return (
    <nav aria-label="Main" className="flex flex-col gap-1 px-3 py-4">
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            `group relative flex items-center gap-3 rounded-lg px-4 text-[17px] font-medium transition-colors ` +
            `min-h-[52px] ` +
            (isActive
              ? 'bg-[#FF6B35]/15 text-white'
              : 'text-zinc-300 hover:bg-white/[0.06] hover:text-white')
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <span
                  aria-hidden
                  className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-[#FF6B35]"
                />
              )}
              <Icon className="h-6 w-6 flex-shrink-0" aria-hidden />
              <span>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

function AccountDropdown({ user, onSignOut }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const displayName = user?.name || user?.email?.split('@')[0] || 'You'
  const initial = displayName.charAt(0).toUpperCase()

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-[15px] font-medium text-white hover:bg-white/[0.06] min-h-[44px]"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FF6B35] text-white font-semibold">
          {initial}
        </span>
        <span className="hidden sm:block">{displayName}</span>
        <ChevronDown className="h-4 w-4 text-zinc-400" aria-hidden />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 rounded-xl border border-white/[0.08] bg-[#0f0f0f] p-1 shadow-xl z-50"
        >
          <div className="px-3 py-2 text-[13px] text-zinc-400 border-b border-white/[0.04]">
            Signed in as<br/>
            <span className="text-zinc-200 text-[14px]">{user?.email || displayName}</span>
          </div>
          <button
            onClick={() => { setOpen(false); onSignOut() }}
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[15px] text-red-300 hover:bg-red-500/10 min-h-[44px]"
          >
            <LogOut className="h-5 w-5" aria-hidden />
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}

export default function ClientDashboardLayout() {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const signOut = useAuthStore(s => s.signOut)

  async function handleSignOut() {
    // Small confirmation — elderly users are the primary audience and a
    // misclick on sign-out is annoying.
    if (!window.confirm('Sign out of ToGoGo?')) return
    await signOut?.()
    navigate('/')
  }

  const isAdmin = user?.role === 'admin'

  return (
    <div className="flex min-h-screen bg-[#0a0a0a] text-zinc-100">
      {/* Sidebar — always visible on desktop */}
      <aside className="hidden md:flex w-64 flex-col border-r border-white/[0.06] bg-[#0f0f0f]">
        <div className="flex items-center px-5 py-5 border-b border-white/[0.06]">
          <span className="text-[22px] font-bold text-white">
            To<span className="text-[#FF6B35]">GoGo</span>
          </span>
        </div>
        <SidebarNav items={NAV_ITEMS} />
        {/* Admin shortcut — only rendered for admin users. Separated from
            the main nav by a divider so regular store owners don't see
            an orphan item and admins can still find it at a glance. */}
        {isAdmin && (
          <div className="mt-auto border-t border-white/[0.06] pt-2 pb-3">
            <div className="px-5 pb-1 text-[11px] uppercase tracking-wider text-zinc-500">Admin</div>
            <SidebarNav items={[ADMIN_ITEM]} />
          </div>
        )}
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="flex items-center justify-between border-b border-white/[0.06] bg-[#0f0f0f] px-4 py-3 md:px-6">
          <span className="md:hidden text-[20px] font-bold text-white">
            To<span className="text-[#FF6B35]">GoGo</span>
          </span>
          <div className="flex-1" />
          <AccountDropdown user={user} onSignOut={handleSignOut} />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto pb-20 md:pb-0">
          <Outlet />
        </main>

        {/* Mobile bottom nav — thumb reachable. Admin users see a 6th
            item here instead of a separate section since there's no
            room for dividers in the bottom bar. */}
        <nav
          aria-label="Main"
          className="md:hidden fixed bottom-0 inset-x-0 border-t border-white/[0.08] bg-[#0f0f0f] flex justify-around z-40"
        >
          {(isAdmin ? [...NAV_ITEMS, ADMIN_ITEM] : NAV_ITEMS).map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 px-2 py-2 text-[11px] font-medium min-w-[56px] min-h-[56px] ` +
                (isActive ? 'text-[#FF6B35]' : 'text-zinc-400')
              }
            >
              <Icon className="h-5 w-5" aria-hidden />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
