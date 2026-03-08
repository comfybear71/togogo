import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  DollarSign, Package, ShoppingBag, TrendingUp, Clock,
  Store, ExternalLink, Plus, ArrowUpRight, ArrowDownRight,
  Settings, User, LogOut, ChevronRight, Eye, BarChart3,
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from 'recharts'
import { useAuthStore, authFetch } from '../stores/authStore'

// Placeholder data — will be replaced with real API data
const earningsData = Array.from({ length: 14 }, (_, i) => ({
  date: new Date(Date.now() - (13 - i) * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  earnings: Math.floor(Math.random() * 150 + 30),
  orders: Math.floor(Math.random() * 8 + 1),
}))

const recentOrders = [
  { id: 'ORD-001', product: 'Wireless Earbuds Pro', customer: 'Sarah M.', salePrice: 29.99, cost: 8.50, profit: 21.49, status: 'delivered', date: '2 days ago', supplier: 'CJ Dropshipping' },
  { id: 'ORD-002', product: 'Custom T-Shirt — Logo', customer: 'James K.', salePrice: 27.99, cost: 12.50, profit: 15.49, status: 'shipped', date: '3 days ago', supplier: 'Printful' },
  { id: 'ORD-003', product: 'LED Strip Lights RGB', customer: 'Aisha R.', salePrice: 19.99, cost: 4.70, profit: 15.29, status: 'processing', date: '1 day ago', supplier: 'CJ Dropshipping' },
  { id: 'ORD-004', product: 'Custom Mug — Birthday', customer: 'Miguel L.', salePrice: 22.99, cost: 9.50, profit: 13.49, status: 'processing', date: 'Today', supplier: 'Printify' },
  { id: 'ORD-005', product: 'Phone Case Clear', customer: 'Emily C.', salePrice: 14.99, cost: 3.20, profit: 11.79, status: 'pending', date: 'Today', supplier: 'AliExpress' },
]

const statusColors = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  processing: 'bg-blue-500/20 text-blue-400',
  shipped: 'bg-purple-500/20 text-purple-400',
  delivered: 'bg-green-500/20 text-green-400',
  cancelled: 'bg-red-500/20 text-red-400',
}

const topProducts = [
  { name: 'Wireless Earbuds Pro', sold: 47, revenue: 1409.53, margin: '71%' },
  { name: 'Custom T-Shirt — Logo', sold: 32, revenue: 895.68, margin: '55%' },
  { name: 'LED Strip Lights RGB', sold: 28, revenue: 559.72, margin: '76%' },
  { name: 'Custom 11oz Mug', sold: 24, revenue: 551.76, margin: '58%' },
  { name: 'Vintage Sunglasses', sold: 19, revenue: 284.81, margin: '81%' },
]

export default function DashboardPage() {
  const profile = useAuthStore(s => s.profile)
  const [tab, setTab] = useState('overview')

  // Summary stats
  const totalRevenue = 3701.50
  const totalProfit = 2412.80
  const totalOrders = 150
  const activeProducts = 23
  const avgMargin = 65

  return (
    <div className="py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white">
            Dashboard
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Welcome back, {profile?.name || 'Seller'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/suppliers" className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#FF6B35] text-white hover:bg-[#FF6B35]/90 transition-colors flex items-center gap-1">
            <Plus className="h-3 w-3" />
            Add Product
          </Link>
          <Link to="/profile" className="p-2 rounded-lg bg-[#111] border border-white/[0.06] text-zinc-400 hover:text-white transition-colors">
            <Settings className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="rounded-2xl bg-[#111] border border-white/[0.06] p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-[#06D6A0]/15">
              <DollarSign className="h-3.5 w-3.5 text-[#06D6A0]" />
            </div>
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Revenue</span>
          </div>
          <p className="text-xl font-bold text-white">${totalRevenue.toLocaleString()}</p>
          <div className="flex items-center gap-1 mt-1">
            <ArrowUpRight className="h-3 w-3 text-[#06D6A0]" />
            <span className="text-[10px] text-[#06D6A0]">+12% this week</span>
          </div>
        </div>

        <div className="rounded-2xl bg-[#111] border border-white/[0.06] p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-[#FFD23F]/15">
              <TrendingUp className="h-3.5 w-3.5 text-[#FFD23F]" />
            </div>
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Profit</span>
          </div>
          <p className="text-xl font-bold text-white">${totalProfit.toLocaleString()}</p>
          <div className="flex items-center gap-1 mt-1">
            <ArrowUpRight className="h-3 w-3 text-[#06D6A0]" />
            <span className="text-[10px] text-[#06D6A0]">{avgMargin}% avg margin</span>
          </div>
        </div>

        <div className="rounded-2xl bg-[#111] border border-white/[0.06] p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-[#FF6B35]/15">
              <ShoppingBag className="h-3.5 w-3.5 text-[#FF6B35]" />
            </div>
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Orders</span>
          </div>
          <p className="text-xl font-bold text-white">{totalOrders}</p>
          <div className="flex items-center gap-1 mt-1">
            <ArrowUpRight className="h-3 w-3 text-[#06D6A0]" />
            <span className="text-[10px] text-[#06D6A0]">8 today</span>
          </div>
        </div>

        <div className="rounded-2xl bg-[#111] border border-white/[0.06] p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-[#a78bfa]/15">
              <Package className="h-3.5 w-3.5 text-[#a78bfa]" />
            </div>
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Products</span>
          </div>
          <p className="text-xl font-bold text-white">{activeProducts}</p>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-[10px] text-zinc-500">Active listings</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-[#111] rounded-xl p-1 border border-white/[0.06]">
        {['overview', 'orders', 'products', 'stores'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors capitalize ${
              tab === t ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {tab === 'overview' && (
        <div className="space-y-4">
          {/* Earnings chart */}
          <div className="rounded-2xl bg-[#111] border border-white/[0.06] p-4">
            <h3 className="text-xs font-semibold text-white mb-3 flex items-center gap-2">
              <BarChart3 className="h-3.5 w-3.5 text-[#06D6A0]" />
              Earnings — Last 14 Days
            </h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={earningsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#666' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: '#666' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: 8, fontSize: 11 }}
                    labelStyle={{ color: '#999' }}
                    formatter={(value) => [`$${value}`, 'Earnings']}
                  />
                  <Bar dataKey="earnings" fill="#06D6A0" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top products */}
          <div className="rounded-2xl bg-[#111] border border-white/[0.06] p-4">
            <h3 className="text-xs font-semibold text-white mb-3 flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5 text-[#FFD23F]" />
              Top Selling Products
            </h3>
            <div className="space-y-2">
              {topProducts.map((p, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-zinc-600 w-4">#{i + 1}</span>
                    <span className="text-xs text-white">{p.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px]">
                    <span className="text-zinc-500">{p.sold} sold</span>
                    <span className="text-[#06D6A0] font-semibold">${p.revenue.toFixed(0)}</span>
                    <span className="text-zinc-600">{p.margin}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Orders tab */}
      {tab === 'orders' && (
        <div className="space-y-2">
          {recentOrders.map((order) => (
            <div key={order.id} className="rounded-2xl bg-[#111] border border-white/[0.06] p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="text-xs font-semibold text-white">{order.product}</h4>
                  <p className="text-[10px] text-zinc-500 mt-0.5">{order.id} · {order.customer} · {order.date}</p>
                </div>
                <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full capitalize ${statusColors[order.status]}`}>
                  {order.status}
                </span>
              </div>
              <div className="flex items-center gap-4 text-[10px]">
                <span className="text-zinc-500">Sold: <span className="text-white font-medium">${order.salePrice}</span></span>
                <span className="text-zinc-500">Cost: <span className="text-zinc-300">${order.cost}</span></span>
                <span className="text-[#06D6A0] font-semibold">+${order.profit} profit</span>
                <span className="text-zinc-600 ml-auto">{order.supplier}</span>
              </div>
            </div>
          ))}
          {recentOrders.length === 0 && (
            <div className="text-center py-12">
              <ShoppingBag className="h-8 w-8 text-zinc-700 mx-auto mb-2" />
              <p className="text-sm text-zinc-400">No orders yet</p>
              <p className="text-xs text-zinc-600 mt-1">Start selling products to see orders here</p>
            </div>
          )}
        </div>
      )}

      {/* Products tab */}
      {tab === 'products' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-xs text-zinc-500">{activeProducts} active products</p>
            <Link to="/suppliers" className="text-xs text-[#FF6B35] font-medium flex items-center gap-1">
              <Plus className="h-3 w-3" />
              Add more
            </Link>
          </div>
          {topProducts.map((p, i) => (
            <div key={i} className="rounded-2xl bg-[#111] border border-white/[0.06] p-4 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold text-white">{p.name}</h4>
                <p className="text-[10px] text-zinc-500 mt-0.5">{p.sold} sold · {p.margin} margin</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-[#06D6A0]">${p.revenue.toFixed(0)}</p>
                <p className="text-[9px] text-zinc-600">revenue</p>
              </div>
            </div>
          ))}
          <Link
            to="/suppliers"
            className="block w-full py-3 rounded-xl text-center text-xs font-semibold bg-[#FF6B35]/10 border border-[#FF6B35]/20 text-[#FF6B35] hover:bg-[#FF6B35]/15 transition-colors"
          >
            Browse Products to Sell
          </Link>
        </div>
      )}

      {/* Stores tab */}
      {tab === 'stores' && (
        <div className="space-y-3">
          <p className="text-xs text-zinc-500">Connect your selling platforms</p>

          {['Shopify', 'Etsy', 'eBay', 'TikTok Shop', 'Amazon'].map((platform) => (
            <div key={platform} className="rounded-2xl bg-[#111] border border-white/[0.06] p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Store className="h-4 w-4 text-zinc-500" />
                <div>
                  <h4 className="text-xs font-semibold text-white">{platform}</h4>
                  <p className="text-[10px] text-zinc-600">Not connected</p>
                </div>
              </div>
              <Link
                to="/platforms"
                className="px-3 py-1 rounded-lg text-[10px] font-semibold bg-white/5 border border-white/[0.08] text-zinc-400 hover:text-white transition-colors"
              >
                Connect
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
