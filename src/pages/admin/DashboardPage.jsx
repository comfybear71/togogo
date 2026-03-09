import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Users, ShoppingBag, Package, DollarSign, AlertTriangle,
  TrendingUp, Trophy, Clock, ArrowLeft, Star, Loader2,
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from 'recharts'

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
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeListings: 0,
    ordersToday: 0,
    revenueToday: 0,
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
    { label: 'Active Listings', value: stats.activeListings.toLocaleString(), icon: ShoppingBag, color: '#06D6A0' },
    { label: 'Orders Today', value: stats.ordersToday.toLocaleString(), icon: Package, color: '#FFD23F' },
    { label: 'Revenue Today', value: `$${stats.revenueToday.toLocaleString()}`, icon: DollarSign, color: '#06D6A0' },
    { label: 'Open Disputes', value: stats.openDisputes.toLocaleString(), icon: AlertTriangle, color: '#FF6B35' },
  ]

  const revenueByDay = dashData?.revenueByDay || []
  const signupsByDay = dashData?.signupsByDay || []
  const topProducts = dashData?.topProducts || []
  const recentOrders = dashData?.recentOrders || []
  const topSellers = dashData?.topSellers || []

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link to="/" className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#FF6B35]">
              <ArrowLeft className="h-4 w-4" /> Back to Site
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-500">Here's what's happening today.</p>
          </div>
        </div>

        {/* Admin navigation */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            { to: '/admin', label: 'Dashboard', active: true },
            { to: '/admin/users', label: 'Users' },
            { to: '/admin/products', label: 'Products' },
            { to: '/admin/orders', label: 'Orders' },
            { to: '/admin/stores', label: 'Stores' },
            { to: '/admin/marketing', label: 'Marketing' },
            { to: '/admin/settings', label: 'Settings' },
          ].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex-shrink-0 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                item.active
                  ? 'bg-[#FF6B35] text-white'
                  : 'bg-white text-gray-500 hover:text-gray-900 shadow'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {statCards.map((card) => (
            <div key={card.label} className="rounded-[16px] bg-white p-5 shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{card.label}</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">{card.value}</p>
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
              <div className="rounded-[16px] bg-white p-6 shadow">
                <div className="mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-[#06D6A0]" />
                  <h2 className="text-lg font-semibold text-gray-900">Revenue (Last 30 Days)</h2>
                </div>
                {revenueByDay.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={revenueByDay}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                      <Tooltip formatter={(v) => [`$${v.toLocaleString()}`, 'Revenue']} />
                      <Line type="monotone" dataKey="revenue" stroke="#FF6B35" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[280px] text-sm text-gray-400">
                    No revenue data yet — orders will show here
                  </div>
                )}
              </div>

              <div className="rounded-[16px] bg-white p-6 shadow">
                <div className="mb-4 flex items-center gap-2">
                  <Users className="h-5 w-5 text-[#FF6B35]" />
                  <h2 className="text-lg font-semibold text-gray-900">New Signups (Last 30 Days)</h2>
                </div>
                {signupsByDay.some((d) => d.signups > 0) ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={signupsByDay}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="signups" fill="#06D6A0" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[280px] text-sm text-gray-400">
                    No signups yet — new users will show here
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Top Selling Products */}
              <div className="rounded-[16px] bg-white p-6 shadow lg:col-span-2">
                <div className="mb-4 flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-[#FFD23F]" />
                  <h2 className="text-lg font-semibold text-gray-900">Top Selling Products</h2>
                </div>
                {topProducts.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 text-xs uppercase text-gray-500">
                          <th className="pb-3 pr-4">Rank</th>
                          <th className="pb-3 pr-4">Product</th>
                          <th className="pb-3 pr-4 text-right">Units Sold</th>
                          <th className="pb-3 text-right">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topProducts.map((p) => (
                          <tr key={p.rank} className="border-b border-gray-50">
                            <td className="py-3 pr-4 font-semibold text-[#FF6B35]">#{p.rank}</td>
                            <td className="py-3 pr-4 font-medium text-gray-900">{p.name}</td>
                            <td className="py-3 pr-4 text-right text-gray-600">{p.unitsSold.toLocaleString()}</td>
                            <td className="py-3 text-right font-medium text-gray-900">${p.revenue.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="py-8 text-center text-sm text-gray-400">No product sales yet</p>
                )}
              </div>

              {/* Top Sellers */}
              <div className="rounded-[16px] bg-white p-6 shadow">
                <div className="mb-4 flex items-center gap-2">
                  <Star className="h-5 w-5 text-[#FFD23F]" />
                  <h2 className="text-lg font-semibold text-gray-900">Top Sellers</h2>
                </div>
                {topSellers.length > 0 ? (
                  <div className="space-y-3">
                    {topSellers.map((seller, i) => (
                      <div key={seller.name} className="flex items-center justify-between rounded-xl border border-gray-100 p-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FF6B35]/10 text-sm font-bold text-[#FF6B35]">
                            {i + 1}
                          </span>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{seller.name}</p>
                            <p className="text-xs text-gray-500">{seller.sales} sales</p>
                          </div>
                        </div>
                        <p className="text-sm font-medium text-gray-700">${seller.revenue.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-8 text-center text-sm text-gray-400">No sellers yet</p>
                )}
              </div>
            </div>

            {/* Recent Orders */}
            <div className="rounded-[16px] bg-white p-6 shadow">
              <div className="mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-[#06D6A0]" />
                <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
              </div>
              {recentOrders.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-xs uppercase text-gray-500">
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
                        <tr key={o.id} className="border-b border-gray-50">
                          <td className="py-3 pr-4 font-mono text-sm font-medium text-[#FF6B35]">{o.id}</td>
                          <td className="py-3 pr-4 text-gray-900">{o.buyer}</td>
                          <td className="py-3 pr-4 text-gray-600">{o.product}</td>
                          <td className="py-3 pr-4 text-right font-medium text-gray-900">${o.total.toFixed(2)}</td>
                          <td className="py-3 pr-4">
                            <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusColors[o.status] || statusColors.pending}`}>
                              {o.status}
                            </span>
                          </td>
                          <td className="py-3 text-right text-gray-500">{o.time}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-gray-400">No orders yet — they'll appear here in real time</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
