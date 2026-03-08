import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header'

export default function AppLayout() {
  const { pathname } = useLocation()
  const isHome = pathname === '/'

  return (
    <div className="min-h-screen bg-[#050505]">
      {!isHome && <Header />}
      <main className={isHome ? '' : 'pt-16 pb-8 px-6 max-w-6xl mx-auto'}>
        <Outlet />
      </main>
    </div>
  )
}
