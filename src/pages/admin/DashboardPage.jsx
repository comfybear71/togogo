import { useState, useEffect, lazy, Suspense } from 'react'
import {
  Users, ShoppingBag, Package, DollarSign, AlertTriangle,
  TrendingUp, Trophy, Clock, Star, Loader2, Database, RefreshCw,
} from 'lucide-react'

const AdminRevenueLineChart = lazy(() => import('../../components/charts/AdminRevenueLineChart'))
const AdminSignupsBarChart = lazy(() => import('../../components/charts/AdminSignupsBarChart'))

const ChartFallback = ({ height = 280 }) => (
  <div className="flex items-center justify-center text-sm text-zinc-600" style={{ height }}>
    <Loader2 className="h-5 w-5 animate-spin" />
  </div>
)

const API_BASE = import.meta.env.VITE_API_URL || ''

const statusColors = {
  processing: 'bg-blue-100 text-blue-700',
  shipped: 'bg-[#FF6B35]/10 text-[#FF6B35]',
  delivered: 'bg-[#06D6A0]/10 text-[#06D6A0]',
  pending: 'bg-[#FFD23F]/10 text-[#FFD23F]',
  completed: 'bg-[#06D6A0]/10 text-[#06D6A0]',
}

function getAuthHeaders() {
  const token = localStorage.getItem('togogo-token')
  if (token) return { Authorization: `Bearer ${token}` }
  const secret = sessionStorage.getItem('togogo-setup-secret')
  if (secret) return { 'x-setup-secret': secret }
  return {}
}

export default function DashboardPage() {
  const [backingUp, setBackingUp] = useState(false)
  const [backupResult, setBackupResult] = useState(null)

  async function handleBackup() {
    if (backingUp) return
    setBackingUp(true)
    setBackupResult(null)
    try {
      const token = localStorage.getItem('togogo-token')
      const res = await fetch(`${API_BASE}/api/cron/backup-db?secret=${token}`)
      const data = await res.json()
      setBackupResult(data)
      setTimeout(() => setBackupResult(null), 10000)
    } catch (err) {
      setBackupResult({ error: err.message })
    } finally {
      setBackingUp(false)
    }
  }

  const [stats, setStats] = useState({
    totalUsers: 0,
    activeListings: 0,
    ordersToday: 0,
    revenueToday: 0,
    subscriptionRevenue: 0,
    activeStores: 0,
    openDisputes: 0,
  })
  const [dashData, setDashData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const headers = getAuthHeaders()

    Promise.all([
      fetch(`${API_BASE}/api/admin/stats`, { headers }).then((r) => r.ok ? r.json() : null),
      fetch(`${API_BASE}/api/admin/dashboard`, { headers }).then((r) => r.ok ? r.json() : null),
    ]).then(([statsData, dashboard]) => {
      if (statsData) setStats(statsData)
      if (dashboard) setDashData(dashboard)
    }).finally(() => setLoading(false))
  }, [])

  const statCards = [
    { label: 'Total Users', value: stats.totalUsers.toLocaleString(), icon: Users, color: '#FF6B35' },
    { label: 'Active Stores', value: stats.activeStores.toLocaleString(), icon: ShoppingBag, color: '#06D6A0' },
    { label: 'Active Listings', value: stats.activeListings.toLocaleString(), icon: Package, color: '#FFD23F' },
    { label: 'MRR', value: `$${(stats.subscriptionRevenue || 0).toLocaleString()}`, icon: DollarSign, color: '#06D6A0' },
    { label: 'Revenue Today', value: `$${stats.revenueToday.toLocaleString()}`, icon: DollarSign, color: '#FF6B35' },
  ]

  const revenueByDay = dashData?.revenueByDay || []
  const signupsByDay = dashData?.signupsByDay || []
  const topProducts = dashData?.topProducts || []
  const recentOrders = dashData?.recentOrders || []
  const topSellers = dashData?.topSellers || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-zinc-500">Here's what's happening today.</p>
        </div>
        <button
          onClick={handleBackup}
          disabled={backingUp}
          className="flex items-center gap-2 rounded-xl border border-white/[0.08] px-3 py-2.5 text-sm text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
        >
          {backingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
          {backingUp ? 'Backing up...' : 'Backup Database'}
        </button>
      </div>

      {backupResult && (
        <div className={`rounded-xl p-3 text-sm ${backupResult.success ? 'bg-[#06D6A0]/10 text-[#06D6A0]' : 'bg-red-500/10 text-red-400'}`}>
          {backupResult.success
            ? `Backup complete (${backupResult.sizeMB}MB) — ${backupResult.counts?.products || 0} products, ${backupResult.counts?.orders || 0} orders, ${backupResult.counts?.users || 0} users. ${backupResult.backupsAvailable} backups stored.`
            : `Backup failed: ${backupResult.error || 'Unknown error'}`}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {statCards.map((card) => (
          <div key={card.label} className="rounded-[16px] bg-[#111] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-500">{card.label}</p>
                <p className="mt-1 text-2xl font-bold text-white">{card.value}</p>
              </div>
              <div className="rounded-xl p-3" style={{ backgroundColor: `${card.color}15` }}>
                <card.icon className="h-6 w-6" style={{ color: card.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 text-[#FF6B35] animate-spin" />
        </div>
      )}

      {!loading && (
        <>
          {/* Charts Row */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-[16px] bg-[#111] p-6">
              <div className="mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[#06D6A0]" />
                <h2 className="text-lg font-semibold text-white">Revenue (Last 30 Days)</h2>
              </div>
              {revenueByDay.length > 0 ? (
                <Suspense fallback={<ChartFallback />}>
                  <AdminRevenueLineChart data={revenueByDay} />
                </Suspense>
              ) : (
                <div className="flex items-center justify-center h-[280px] text-sm text-zinc-600">
                  No revenue data yet — orders will show here
                </div>
              )}
            </div>

            <div className="rounded-[16px] bg-[#111] p-6">
              <div className="mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-[#FF6B35]" />
                <h2 className="text-lg font-semibold text-white">New Signups (Last 30 Days)</h2>
              </div>
              {signupsByDay.some((d) => d.signups > 0) ? (
                <Suspense fallback={<ChartFallback />}>
                  <AdminSignupsBarChart data={signupsByDay} />
                </Suspense>
              ) : (
                <div className="flex items-center justify-center h-[280px] text-sm text-zinc-600">
                  No signups yet — new users will show here
                </div>
              )}
            </div>
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Top Selling Products */}
            <div className="rounded-[16px] bg-[#111] p-6 lg:col-span-2">
              <div className="mb-4 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-[#FFD23F]" />
                <h2 className="text-lg font-semibold text-white">Top Selling Products</h2>
              </div>
              {topProducts.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.06] text-xs uppercase text-zinc-500">
                        <th className="pb-3 pr-4">Rank</th>
                        <th className="pb-3 pr-4">Product</th>
                        <th className="pb-3 pr-4 text-right">Units Sold</th>
                        <th className="pb-3 text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topProducts.map((p) => (
                        <tr key={p.rank} className="border-b border-white/[0.04]">
                          <td className="py-3 pr-4 font-semibold text-[#FF6B35]">#{p.rank}</td>
                          <td className="py-3 pr-4 font-medium text-white">{p.name}</td>
                          <td className="py-3 pr-4 text-right text-zinc-400">{p.unitsSold.toLocaleString()}</td>
                          <td className="py-3 text-right font-medium text-white">${p.revenue.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-zinc-600">No product sales yet</p>
              )}
            </div>

            {/* Top Sellers */}
            <div className="rounded-[16px] bg-[#111] p-6">
              <div className="mb-4 flex items-center gap-2">
                <Star className="h-5 w-5 text-[#FFD23F]" />
                <h2 className="text-lg font-semibold text-white">Top Sellers</h2>
              </div>
              {topSellers.length > 0 ? (
                <div className="space-y-3">
                  {topSellers.map((seller, i) => (
                    <div key={seller.name} className="flex items-center justify-between rounded-xl border border-white/[0.06] p-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FF6B35]/10 text-sm font-bold text-[#FF6B35]">
                          {i + 1}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-white">{seller.name}</p>
                          <p className="text-xs text-zinc-500">{seller.sales} sales</p>
                        </div>
                      </div>
                      <p className="text-sm font-medium text-zinc-400">${seller.revenue.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-zinc-600">No sellers yet</p>
              )}
            </div>
          </div>

          {/* Recent Orders */}
          <div className="rounded-[16px] bg-[#111] p-6">
            <div className="mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-[#06D6A0]" />
              <h2 className="text-lg font-semibold text-white">Recent Orders</h2>
            </div>
            {recentOrders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-xs uppercase text-zinc-500">
                      <th className="pb-3 pr-4">Order ID</th>
                      <th className="pb-3 pr-4">Buyer</th>
                      <th className="pb-3 pr-4">Product</th>
                      <th className="pb-3 pr-4 text-right">Total</th>
                      <th className="pb-3 pr-4">Status</th>
                      <th className="pb-3 text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((o) => (
                      <tr key={o.id} className="border-b border-white/[0.04]">
                        <td className="py-3 pr-4 font-mono text-sm font-medium text-[#FF6B35]">{o.id}</td>
                        <td className="py-3 pr-4 text-white">{o.buyer}</td>
                        <td className="py-3 pr-4 text-zinc-400">{o.product}</td>
                        <td className="py-3 pr-4 text-right font-medium text-white">${o.total.toFixed(2)}</td>
                        <td className="py-3 pr-4">
                          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusColors[o.status] || statusColors.pending}`}>
                            {o.status}
                          </span>
                        </td>
                        <td className="py-3 text-right text-zinc-500">{o.time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-zinc-600">No orders yet — they'll appear here in real time</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
