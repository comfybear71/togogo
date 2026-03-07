import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'
import Sidebar from './Sidebar'
import Header from './Header'

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#0f0f0f]">
      <Sidebar />
      <Header />
      <main className="lg:pl-64 lg:pt-16 pb-20 lg:pb-0">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
