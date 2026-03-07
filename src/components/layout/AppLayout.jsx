import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'
import Header from './Header'

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#0f0f0f]">
      <Header />
      <main className="pt-20 pb-24 lg:pb-8 px-4 max-w-6xl mx-auto">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
