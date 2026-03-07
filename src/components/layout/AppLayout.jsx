import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'
import Header from './Header'

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-[#050505]">
      <Header />
      <main className="pt-16 pb-20 lg:pb-8 px-4 max-w-6xl mx-auto">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
