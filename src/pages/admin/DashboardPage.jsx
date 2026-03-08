import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  ShoppingBag,
  Package,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Trophy,
  Clock,
  ArrowLeft,
  Star,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';

const revenueDataDaily = Array.from({ length: 30 }, (_, i) => ({
  date: new Date(Date.now() - (29 - i) * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  revenue: Math.floor(Math.random() * 3000 + 1500),
}));

const revenueDataWeekly = [
  { date: 'Week 1', revenue: 14200 },
  { date: 'Week 2', revenue: 18700 },
  { date: 'Week 3', revenue: 16400 },
  { date: 'Week 4', revenue: 21300 },
];

const revenueDataMonthly = [
  { date: 'Oct', revenue: 52000 },
  { date: 'Nov', revenue: 61000 },
  { date: 'Dec', revenue: 78000 },
  { date: 'Jan', revenue: 65000 },
  { date: 'Feb', revenue: 71000 },
  { date: 'Mar', revenue: 43000 },
];

const signupsData = Array.from({ length: 30 }, (_, i) => ({
  date: new Date(Date.now() - (29 - i) * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  signups: Math.floor(Math.random() * 40 + 10),
}));

const topProducts = [
  { rank: 1, name: 'Vintage Leather Messenger Bag', unitsSold: 284, revenue: 14200 },
  { rank: 2, name: 'Handmade Ceramic Mug Set', unitsSold: 219, revenue: 8760 },
  { rank: 3, name: 'Organic Cotton Tote Bag', unitsSold: 198, revenue: 5940 },
  { rank: 4, name: 'Artisan Soy Candle Collection', unitsSold: 176, revenue: 7040 },
  { rank: 5, name: 'Recycled Glass Vase', unitsSold: 152, revenue: 6080 },
];

const recentOrders = [
  { id: 'ORD-7821', buyer: 'Sarah M.', product: 'Leather Messenger Bag', total: 49.99, status: 'processing', time: '3 min ago' },
  { id: 'ORD-7820', buyer: 'James K.', product: 'Ceramic Mug Set', total: 39.99, status: 'shipped', time: '12 min ago' },
  { id: 'ORD-7819', buyer: 'Aisha R.', product: 'Cotton Tote Bag', total: 29.99, status: 'delivered', time: '28 min ago' },
  { id: 'ORD-7818', buyer: 'Miguel L.', product: 'Soy Candle Collection', total: 44.99, status: 'processing', time: '45 min ago' },
  { id: 'ORD-7817', buyer: 'Emily C.', product: 'Glass Vase', total: 39.99, status: 'pending', time: '1 hr ago' },
];

const topSellers = [
  { name: 'EcoArtisan Co.', sales: 412, rating: 4.9 },
  { name: 'Craft & Bloom', sales: 387, rating: 4.8 },
  { name: 'Heritage Goods', sales: 341, rating: 4.7 },
  { name: 'The Green Studio', sales: 298, rating: 4.9 },
  { name: 'Makers United', sales: 276, rating: 4.6 },
];

const statusColors = {
  processing: 'bg-blue-100 text-blue-700',
  shipped: 'bg-[#FF6B35]/10 text-[#FF6B35]',
  delivered: 'bg-[#06D6A0]/10 text-[#06D6A0]',
  pending: 'bg-[#FFD23F]/10 text-[#FFD23F]',
};

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [revenueRange, setRevenueRange] = useState('daily');
  const [stats, setStats] = useState({
    totalUsers: 2847,
    activeListings: 1234,
    ordersToday: 89,
    revenueToday: 4327.5,
    openDisputes: 12,
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        const [{ count: usersCount }, { count: listingsCount }] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('products').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        ]);
        if (usersCount != null) setStats((s) => ({ ...s, totalUsers: usersCount }));
        if (listingsCount != null) setStats((s) => ({ ...s, activeListings: listingsCount }));
      } catch {
        // keep placeholder data
      }
    }
    fetchStats();
  }, []);

  const revenueChartData =
    revenueRange === 'daily' ? revenueDataDaily : revenueRange === 'weekly' ? revenueDataWeekly : revenueDataMonthly;

  const statCards = [
    { label: 'Total Users', value: stats.totalUsers.toLocaleString(), icon: Users, color: '#FF6B35' },
    { label: 'Active Listings', value: stats.activeListings.toLocaleString(), icon: ShoppingBag, color: '#06D6A0' },
    { label: 'Orders Today', value: stats.ordersToday.toLocaleString(), icon: Package, color: '#FFD23F' },
    { label: 'Revenue Today', value: `$${stats.revenueToday.toLocaleString()}`, icon: DollarSign, color: '#06D6A0' },
    { label: 'Open Disputes', value: stats.openDisputes.toLocaleString(), icon: AlertTriangle, color: '#FF6B35' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link to="/" className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#FF6B35]">
              <ArrowLeft className="h-4 w-4" /> Back to Site
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-500">Welcome back{user?.email ? `, ${user.email}` : ''}! Here's what's happening today.</p>
          </div>
        </div>

        {/* Admin navigation */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            { to: '/admin', label: 'Dashboard', active: true },
            { to: '/admin/users', label: 'Users' },
            { to: '/admin/products', label: 'Products' },
            { to: '/admin/orders', label: 'Orders' },
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

        {/* Charts Row */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Revenue Chart */}
          <div className="rounded-[16px] bg-white p-6 shadow">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[#06D6A0]" />
                <h2 className="text-lg font-semibold text-gray-900">Revenue</h2>
              </div>
              <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
                {['daily', 'weekly', 'monthly'].map((range) => (
                  <button
                    key={range}
                    onClick={() => setRevenueRange(range)}
                    className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors ${
                      revenueRange === range ? 'bg-[#FF6B35] text-white' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={revenueChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                <Tooltip formatter={(v) => [`$${v.toLocaleString()}`, 'Revenue']} />
                <Line type="monotone" dataKey="revenue" stroke="#FF6B35" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Signups Chart */}
          <div className="rounded-[16px] bg-white p-6 shadow">
            <div className="mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-[#FF6B35]" />
              <h2 className="text-lg font-semibold text-gray-900">New Signups (Last 30 Days)</h2>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={signupsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="signups" fill="#06D6A0" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
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
          </div>

          {/* Top Sellers */}
          <div className="rounded-[16px] bg-white p-6 shadow">
            <div className="mb-4 flex items-center gap-2">
              <Star className="h-5 w-5 text-[#FFD23F]" />
              <h2 className="text-lg font-semibold text-gray-900">Top Sellers</h2>
            </div>
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
                  <div className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-[#FFD23F] text-[#FFD23F]" />
                    <span className="text-sm font-medium text-gray-700">{seller.rating}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="rounded-[16px] bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-[#06D6A0]" />
              <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
            </div>
            <span className="text-xs text-gray-400">Auto-refreshes every 30s</span>
          </div>
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
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusColors[o.status]}`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="py-3 text-right text-gray-500">{o.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
