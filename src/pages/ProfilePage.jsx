import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Moon, Sun, LogOut, Heart, Bell, CreditCard, User,
  Store, Link2, Globe, Package, ShoppingBag,
  DollarSign, TrendingUp, BarChart3, CheckCircle2,
  ArrowUpRight, ExternalLink, ChevronRight, Plus,
  Settings, Loader2, AlertCircle, Zap, Shield,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import Avatar from '../components/ui/Avatar'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { useAuthStore, authFetch } from '../stores/authStore'
import { useThemeStore } from '../stores/themeStore'

const TABS = ['My Store', 'Settings']

const platformColors = {
  woocommerce: '#7F54B3',
  ebay: '#E53238',
  etsy: '#F56400',
  amazon: '#FF9900',
  tiktok: '#000000',
  shopify: '#95BF47',
}

const platformNames = {
  woocommerce: 'WooCommerce',
  ebay: 'eBay',
  etsy: 'Etsy',
  amazon: 'Amazon',
  tiktok: 'TikTok Shop',
  shopify: 'Shopify',
}

const statusColors = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  processing: 'bg-blue-500/20 text-blue-400',
  shipped: 'bg-purple-500/20 text-purple-400',
  delivered: 'bg-green-500/20 text-green-400',
  cancelled: 'bg-red-500/20 text-red-400',
}

// Setup steps tracker
const SETUP_STEPS = [
  { key: 'account', label: 'Create account', icon: User, desc: 'Sign up for ToGoGo' },
  { key: 'stripe_connect', label: 'Connect payments', icon: CreditCard, desc: 'Set up Stripe to get paid', action: 'connect_stripe' },
  { key: 'platform', label: 'Connect a platform', icon: Link2, desc: 'eBay, Etsy, WooCommerce, etc.' },
  { key: 'products', label: 'Add products', icon: Package, desc: 'Find & list products to sell' },
  { key: 'first_sale', label: 'Make first sale', icon: DollarSign, desc: 'Get your first order!' },
]

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, profile, signOut } = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()
  const [activeTab, setActiveTab] = useState('My Store')
  const [stats, setStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [storeSubTab, setStoreSubTab] = useState('overview')
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    if (!user) {
      navigate('/auth')
      return
    }
    // Check admin role via API
    const token = localStorage.getItem('togogo-token')
    if (token) {
      fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => { if (r.ok) setIsAdmin(true) })
        .catch(() => {})
    }
  }, [user, navigate])

  // Fetch dashboard stats
  useEffect(() => {
    if (!user) return
    async function fetchStats() {
      try {
        const data = await authFetch('/api/dashboard/stats')
        setStats(data)
      } catch {
        // Stats not available yet
      } finally {
        setStatsLoading(false)
      }
    }
    fetchStats()
  }, [user])

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const displayName = profile?.name || profile?.full_name || user?.email?.split('@')[0] || 'User'
  const avatarUrl = profile?.avatar_url || ''
  const subscriptionPlan = profile?.subscription_plan || 'Pro'

  // Compute setup progress
  const connections = stats?.connections || []
  const activeConnections = connections.filter(c => c.status === 'active')
  const domains = stats?.domains || []
  const orders = stats?.orders || { total: 0, revenue: 0, profit: 0, pending: 0, processing: 0 }
  const products = stats?.products || { total: 0, active: 0 }
  const recentOrders = stats?.recentOrders || []
  const earnings = stats?.earnings || []
  const avgMargin = orders.revenue > 0 ? Math.round((orders.profit / orders.revenue) * 100) : 0

  const completedSteps = {
    account: true,
    stripe_connect: stats?.stripeConnectStatus === 'active',
    platform: activeConnections.length > 0,
    products: products.total > 0,
    first_sale: orders.total > 0,
  }
  const stepsCompleted = Object.values(completedSteps).filter(Boolean).length
  const setupProgress = Math.round((stepsCompleted / SETUP_STEPS.length) * 100)

  if (!user) return null

  return (
    <div className="min-h-screen bg-[#050505]">
      {/* Profile Header */}
      <div className="bg-gradient-to-b from-[#111] to-[#050505]">
        <div className="mx-auto max-w-3xl px-4 pt-10 pb-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Avatar
              src={avatarUrl}
              name={displayName}
              size="xl"
              className="h-16 w-16 text-2xl ring-2 ring-white/10 flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <h1 className="font-['Baloo_2'] text-xl font-bold text-white truncate">
                {displayName}
              </h1>
              <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
              {activeConnections.length > 0 && (
                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 mt-1.5">
                  <CheckCircle2 className="h-2.5 w-2.5" /> Store Active
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-white/5 sticky top-0 z-10 bg-[#050505]/90 backdrop-blur-lg">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1">
            {[...TABS, ...(isAdmin ? ['Admin'] : [])].map((tab) => (
              <button
                key={tab}
                onClick={() => tab === 'Admin' ? navigate('/admin') : setActiveTab(tab)}
                className={`relative flex items-center gap-2 px-4 py-3.5 font-['Nunito'] text-xs font-bold transition-colors ${
                  activeTab === tab
                    ? 'text-[#FF6B35]'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {tab === 'My Store' && <Store className="h-3.5 w-3.5" />}
                {tab === 'Settings' && <Settings className="h-3.5 w-3.5" />}
                {tab === 'Admin' && <Shield className="h-3.5 w-3.5" />}
                {tab}
                {activeTab === tab && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF6B35]" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">

        {/* ============================================ */}
        {/* MY STORE TAB */}
        {/* ============================================ */}
        {activeTab === 'My Store' && (
          <div className="space-y-4">

            {statsLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-[#FF6B35]" />
              </div>
            ) : (
              <>
                {/* Setup Progress */}
                <div className="rounded-2xl bg-[#111] border border-white/[0.06] p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-semibold text-white flex items-center gap-2">
                      <Store className="h-3.5 w-3.5 text-[#FF6B35]" />
                      Store Setup
                    </h3>
                    <span className="text-[10px] font-bold text-[#FF6B35]">{setupProgress}%</span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-1.5 bg-white/[0.06] rounded-full mb-4 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#FF6B35] to-[#FFD23F] transition-all duration-700"
                      style={{ width: `${setupProgress}%` }}
                    />
                  </div>

                  {/* Steps */}
                  <div className="space-y-2">
                    {SETUP_STEPS.map((step, i) => {
                      const done = completedSteps[step.key]
                      const Icon = step.icon
                      const isNext = !done && (i === 0 || completedSteps[SETUP_STEPS[i - 1]?.key])
                      return (
                        <div
                          key={step.key}
                          className={`flex items-center gap-3 py-2 px-3 rounded-xl transition-colors ${
                            isNext ? 'bg-[#FF6B35]/5 border border-[#FF6B35]/20' : ''
                          }`}
                        >
                          <div className={`flex h-7 w-7 items-center justify-center rounded-lg flex-shrink-0 ${
                            done
                              ? 'bg-emerald-500/15'
                              : isNext
                                ? 'bg-[#FF6B35]/15'
                                : 'bg-white/[0.04]'
                          }`}>
                            {done ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <Icon className={`h-3.5 w-3.5 ${isNext ? 'text-[#FF6B35]' : 'text-zinc-600'}`} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-semibold ${done ? 'text-zinc-500 line-through' : 'text-white'}`}>
                              {step.label}
                            </p>
                            <p className="text-[10px] text-zinc-600">{step.desc}</p>
                          </div>
                          {step.key === 'stripe_connect' && !done && (
                            <button
                              onClick={() => navigate('/setup-payments')}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold text-white flex-shrink-0 transition-colors ${
                                stats?.stripeConnectStatus === 'action_required' ? 'bg-[#FFD23F] text-black hover:bg-[#f0c430]'
                                : stats?.stripeConnectStatus === 'onboarding' ? 'bg-[#FF6B35] hover:bg-[#e85d2c]'
                                : 'bg-[#06D6A0] hover:bg-[#05b88a]'
                              }`}
                            >
                              {stats?.stripeConnectStatus === 'action_required' ? 'Action Required'
                                : stats?.stripeConnectStatus === 'onboarding' ? 'Continue Setup'
                                : 'Connect'}
                            </button>
                          )}
                          {step.key === 'stripe_connect' && done && (
                            <span className="px-3 py-1.5 rounded-lg bg-[#06D6A0]/10 text-[10px] font-bold text-[#06D6A0] flex-shrink-0">
                              Connected
                            </span>
                          )}
                          {isNext && step.key === 'platform' && (
                            <Link to="/launch-store" className="px-3 py-1.5 rounded-lg bg-[#FF6B35] text-[10px] font-bold text-white flex-shrink-0">
                              Connect
                            </Link>
                          )}
                          {isNext && step.key === 'products' && (
                            <Link to="/suppliers" className="px-3 py-1.5 rounded-lg bg-[#FF6B35] text-[10px] font-bold text-white flex-shrink-0">
                              Browse
                            </Link>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Stripe Connect Status */}
                {stats?.stripeConnectStatus && stats.stripeConnectStatus !== 'not_connected' && (
                  <div className="rounded-2xl bg-[#111] border border-white/[0.06] p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-semibold text-white flex items-center gap-2">
                        <CreditCard className="h-3.5 w-3.5 text-[#06D6A0]" />
                        Payment Gateway
                      </h3>
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        stats.stripeConnectStatus === 'active' ? 'bg-[#06D6A0]/10 text-[#06D6A0]'
                        : stats.stripeConnectStatus === 'action_required' ? 'bg-[#FFD23F]/10 text-[#FFD23F]'
                        : 'bg-[#FF6B35]/10 text-[#FF6B35]'
                      }`}>
                        {stats.stripeConnectStatus === 'active' ? 'Active'
                          : stats.stripeConnectStatus === 'action_required' ? 'Action Required'
                          : stats.stripeConnectStatus === 'pending_verification' ? 'Pending'
                          : 'Setup Incomplete'}
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-500">
                      {stats.stripeConnectStatus === 'active'
                        ? 'Stripe is connected. You will receive payments when customers buy from your store.'
                        : 'Complete your Stripe setup to start receiving payments.'}
                    </p>
                    {stats.stripeConnectStatus !== 'active' && (
                      <button
                        onClick={() => navigate('/setup-payments')}
                        className="mt-3 w-full py-2 rounded-lg bg-[#06D6A0] text-xs font-bold text-white hover:bg-[#05b88a] transition-colors"
                      >
                        Complete Payment Setup
                      </button>
                    )}
                  </div>
                )}

                {/* Connected Platforms */}
                {activeConnections.length > 0 && (
                  <div className="rounded-2xl bg-[#111] border border-white/[0.06] p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-semibold text-white flex items-center gap-2">
                        <Link2 className="h-3.5 w-3.5 text-[#06D6A0]" />
                        Connected Platforms
                      </h3>
                      <Link to="/launch-store" className="text-[10px] text-[#FF6B35] font-medium flex items-center gap-0.5">
                        Add more <ChevronRight className="h-3 w-3" />
                      </Link>
                    </div>
                    <div className="space-y-2">
                      {activeConnections.map((conn) => (
                        <div key={conn.platform} className="flex items-center gap-3 py-2 border-b border-white/[0.04] last:border-0">
                          <div
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold flex-shrink-0"
                            style={{
                              backgroundColor: `${platformColors[conn.platform] || '#666'}15`,
                              color: platformColors[conn.platform] || '#666',
                            }}
                          >
                            {(platformNames[conn.platform] || conn.platform).charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-semibold text-white truncate">
                                {platformNames[conn.platform] || conn.platform}
                              </p>
                              <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
                                <CheckCircle2 className="h-2.5 w-2.5" /> Live
                              </span>
                            </div>
                            {conn.shop_url && (
                              <a
                                href={conn.shop_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-zinc-500 hover:text-zinc-300 flex items-center gap-0.5 mt-0.5"
                              >
                                <ExternalLink className="h-2.5 w-2.5" />
                                {conn.shop_url.replace(/^https?:\/\//, '').replace(/\/+$/, '')}
                              </a>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-[10px] text-zinc-500">{conn.products_synced || 0} products</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Domains */}
                    {domains.length > 0 && (
                      <div className="pt-3 mt-3 border-t border-white/[0.04]">
                        {domains.map((d) => (
                          <div key={d.domain} className="flex items-center gap-2 py-1.5">
                            <Globe className="h-3.5 w-3.5 text-[#06D6A0]" />
                            <span className="text-xs text-white font-medium">{d.domain}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                              d.status === 'active' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-yellow-500/15 text-yellow-400'
                            }`}>
                              {d.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Subscription */}
                <div className="rounded-2xl bg-[#111] border border-white/[0.06] p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFD23F]/15">
                        <Zap className="h-4 w-4 text-[#FFD23F]" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-white">$19.99/mo</p>
                        <p className="text-[10px] text-zinc-500">Full access to all features</p>
                      </div>
                    </div>
                    <Link
                      to="/subscription"
                      className="px-3 py-1.5 rounded-lg bg-[#FFD23F]/10 text-[10px] font-bold text-[#FFD23F]"
                    >
                      Manage
                    </Link>
                  </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-[#111] border border-white/[0.06] p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 rounded-lg bg-[#06D6A0]/15">
                        <DollarSign className="h-3.5 w-3.5 text-[#06D6A0]" />
                      </div>
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Revenue</span>
                    </div>
                    <p className="text-xl font-bold text-white">
                      ${orders.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    {orders.total > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        <ArrowUpRight className="h-3 w-3 text-[#06D6A0]" />
                        <span className="text-[10px] text-[#06D6A0]">{orders.total} orders</span>
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl bg-[#111] border border-white/[0.06] p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 rounded-lg bg-[#FFD23F]/15">
                        <TrendingUp className="h-3.5 w-3.5 text-[#FFD23F]" />
                      </div>
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Profit</span>
                    </div>
                    <p className="text-xl font-bold text-white">
                      ${orders.profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    {avgMargin > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        <ArrowUpRight className="h-3 w-3 text-[#06D6A0]" />
                        <span className="text-[10px] text-[#06D6A0]">{avgMargin}% margin</span>
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl bg-[#111] border border-white/[0.06] p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 rounded-lg bg-[#FF6B35]/15">
                        <ShoppingBag className="h-3.5 w-3.5 text-[#FF6B35]" />
                      </div>
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Orders</span>
                    </div>
                    <p className="text-xl font-bold text-white">{orders.total}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {orders.pending > 0 && <span className="text-[10px] text-yellow-400">{orders.pending} pending</span>}
                      {orders.processing > 0 && <span className="text-[10px] text-blue-400">{orders.processing} processing</span>}
                      {orders.pending === 0 && orders.processing === 0 && <span className="text-[10px] text-zinc-600">No pending</span>}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-[#111] border border-white/[0.06] p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 rounded-lg bg-[#a78bfa]/15">
                        <Package className="h-3.5 w-3.5 text-[#a78bfa]" />
                      </div>
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Products</span>
                    </div>
                    <p className="text-xl font-bold text-white">{products.active}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-[10px] text-zinc-500">Active listings</span>
                    </div>
                  </div>
                </div>

                {/* Sub-tabs for store details */}
                <div className="flex gap-1 bg-[#111] rounded-xl p-1 border border-white/[0.06]">
                  {['overview', 'orders', 'stores'].map(t => (
                    <button
                      key={t}
                      onClick={() => setStoreSubTab(t)}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors capitalize ${
                        storeSubTab === t ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {/* Overview sub-tab */}
                {storeSubTab === 'overview' && (
                  <div className="space-y-4">
                    {/* Earnings chart */}
                    {earnings.length > 0 ? (
                      <div className="rounded-2xl bg-[#111] border border-white/[0.06] p-4">
                        <h3 className="text-xs font-semibold text-white mb-3 flex items-center gap-2">
                          <BarChart3 className="h-3.5 w-3.5 text-[#06D6A0]" />
                          Earnings — Last 14 Days
                        </h3>
                        <div className="h-48">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={earnings.map(e => ({
                              date: new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                              earnings: e.profit,
                              revenue: e.revenue,
                            }))}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                              <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#666' }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fontSize: 9, fill: '#666' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                              <Tooltip
                                contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: 8, fontSize: 11 }}
                                labelStyle={{ color: '#999' }}
                                formatter={(value, name) => [`$${value.toFixed(2)}`, name === 'earnings' ? 'Profit' : 'Revenue']}
                              />
                              <Bar dataKey="revenue" fill="#FF6B35" radius={[4, 4, 0, 0]} opacity={0.3} />
                              <Bar dataKey="earnings" fill="#06D6A0" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-2xl bg-[#111] border border-white/[0.06] p-8 text-center">
                        <BarChart3 className="h-8 w-8 text-zinc-700 mx-auto mb-2" />
                        <p className="text-sm text-zinc-400">No earnings yet</p>
                        <p className="text-xs text-zinc-600 mt-1">Sales data will appear here once orders come in</p>
                      </div>
                    )}

                    {/* Recent orders */}
                    <div className="rounded-2xl bg-[#111] border border-white/[0.06] p-4">
                      <h3 className="text-xs font-semibold text-white mb-3 flex items-center gap-2">
                        <ShoppingBag className="h-3.5 w-3.5 text-[#FF6B35]" />
                        Recent Orders
                      </h3>
                      {recentOrders.length > 0 ? (
                        <div className="space-y-2">
                          {recentOrders.slice(0, 5).map((order) => (
                            <div key={order.id} className="flex items-start justify-between py-2 border-b border-white/[0.04] last:border-0">
                              <div className="min-w-0 flex-1">
                                <h4 className="text-xs font-semibold text-white truncate">{order.product_title}</h4>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] text-zinc-500">{order.platform || order.supplier}</span>
                                  {order.customer_name && <span className="text-[10px] text-zinc-600">· {order.customer_name}</span>}
                                  <span className="text-[10px] text-zinc-700">{new Date(order.created_at).toLocaleDateString()}</span>
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0 ml-3">
                                <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full capitalize ${statusColors[order.status] || statusColors.pending}`}>
                                  {order.status}
                                </span>
                                <p className="text-xs font-bold text-[#06D6A0] mt-1">+${Number(order.profit).toFixed(2)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <ShoppingBag className="h-6 w-6 text-zinc-700 mx-auto mb-2" />
                          <p className="text-xs text-zinc-500">No orders yet</p>
                          <p className="text-[10px] text-zinc-600 mt-1">Orders appear here when customers buy from your store</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Orders sub-tab */}
                {storeSubTab === 'orders' && (
                  <div className="space-y-2">
                    {recentOrders.length > 0 ? (
                      recentOrders.map((order) => (
                        <div key={order.id} className="rounded-2xl bg-[#111] border border-white/[0.06] p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="min-w-0 flex-1">
                              <h4 className="text-xs font-semibold text-white truncate">{order.product_title}</h4>
                              <p className="text-[10px] text-zinc-500 mt-0.5">
                                {order.platform || order.supplier}
                                {order.customer_name && ` · ${order.customer_name}`}
                                {' · '}{new Date(order.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full capitalize ${statusColors[order.status] || statusColors.pending}`}>
                              {order.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-[10px]">
                            <span className="text-zinc-500">Sold: <span className="text-white font-medium">${Number(order.sale_price).toFixed(2)}</span></span>
                            <span className="text-zinc-500">Cost: <span className="text-zinc-300">${Number(order.supplier_cost).toFixed(2)}</span></span>
                            <span className="text-[#06D6A0] font-semibold">+${Number(order.profit).toFixed(2)} profit</span>
                          </div>
                          {order.tracking_number && (
                            <p className="text-[10px] text-zinc-500 mt-1">Tracking: {order.tracking_number}</p>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12">
                        <ShoppingBag className="h-8 w-8 text-zinc-700 mx-auto mb-2" />
                        <p className="text-sm text-zinc-400">No orders yet</p>
                        <p className="text-xs text-zinc-600 mt-1">Orders will appear here when customers buy from your store</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Stores sub-tab */}
                {storeSubTab === 'stores' && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-zinc-500">
                        {activeConnections.length} connected platform{activeConnections.length !== 1 ? 's' : ''}
                      </p>
                      <Link to="/launch-store" className="text-xs text-[#FF6B35] font-medium flex items-center gap-1">
                        <Plus className="h-3 w-3" />
                        Add more
                      </Link>
                    </div>

                    {activeConnections.length > 0 ? (
                      activeConnections.map((conn) => (
                        <div key={conn.platform} className="rounded-2xl bg-[#111] border border-white/[0.06] p-4">
                          <div className="flex items-center gap-3 mb-2">
                            <div
                              className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold flex-shrink-0"
                              style={{
                                backgroundColor: `${platformColors[conn.platform] || '#666'}15`,
                                color: platformColors[conn.platform] || '#666',
                              }}
                            >
                              {(platformNames[conn.platform] || conn.platform).charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-semibold text-white">
                                {platformNames[conn.platform] || conn.platform}
                              </h4>
                              {conn.shop_name && (
                                <p className="text-[10px] text-zinc-400 truncate">{conn.shop_name}</p>
                              )}
                            </div>
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
                              Active
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 ml-[52px]">
                            {conn.shop_url && (
                              <div>
                                <p className="text-[9px] text-zinc-600 uppercase tracking-wider">URL</p>
                                <a
                                  href={conn.shop_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-zinc-400 hover:text-white flex items-center gap-0.5 truncate"
                                >
                                  <ExternalLink className="h-2.5 w-2.5 flex-shrink-0" />
                                  {conn.shop_url.replace(/^https?:\/\//, '').replace(/\/+$/, '')}
                                </a>
                              </div>
                            )}
                            <div>
                              <p className="text-[9px] text-zinc-600 uppercase tracking-wider">Products</p>
                              <p className="text-[10px] text-zinc-400">{conn.products_synced || 0} synced</p>
                            </div>
                            <div>
                              <p className="text-[9px] text-zinc-600 uppercase tracking-wider">Connected</p>
                              <p className="text-[10px] text-zinc-400">
                                {conn.connected_at ? new Date(conn.connected_at).toLocaleDateString() : '—'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl bg-[#111] border border-dashed border-white/[0.06] p-8 text-center">
                        <Store className="h-8 w-8 text-zinc-700 mx-auto mb-2" />
                        <p className="text-sm text-zinc-400 mb-1">No stores connected</p>
                        <p className="text-xs text-zinc-600 mb-4">Connect a selling platform to start making sales</p>
                        <Link
                          to="/launch-store"
                          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#FF6B35] text-white text-xs font-semibold hover:bg-[#FF6B35]/90 transition-colors"
                        >
                          <Store className="h-3.5 w-3.5" /> Connect a Platform
                        </Link>
                      </div>
                    )}

                    {/* Domains */}
                    {domains.length > 0 && (
                      <>
                        <p className="text-xs text-zinc-500 mt-4">Your domains</p>
                        {domains.map((d) => (
                          <div key={d.domain} className="rounded-2xl bg-[#111] border border-white/[0.06] p-4 flex items-center gap-3">
                            <Globe className="h-5 w-5 text-[#06D6A0]" />
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-white">{d.domain}</p>
                              <p className="text-[10px] text-zinc-500">
                                {d.status === 'active' ? 'Registered' : d.status}
                                {d.expires_at && ` · Expires ${new Date(d.expires_at).toLocaleDateString()}`}
                              </p>
                            </div>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                              d.status === 'active' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-yellow-500/15 text-yellow-400'
                            }`}>
                              {d.status}
                            </span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ============================================ */}
        {/* SETTINGS TAB */}
        {/* ============================================ */}
        {activeTab === 'Settings' && (
          <div className="space-y-2">
            {/* Manage Subscription */}
            <Link
              to="/subscription"
              className="flex items-center justify-between rounded-xl border border-white/5 bg-[#111] p-4 transition-colors hover:border-white/10"
            >
              <div className="flex items-center gap-4">
                <CreditCard className="h-5 w-5 text-[#FF6B35]" />
                <div>
                  <p className="font-['Nunito'] text-sm font-bold text-white">Manage Subscription</p>
                  <p className="text-xs text-zinc-500">Currently on {subscriptionPlan} plan</p>
                </div>
              </div>
              <span className="text-xl text-zinc-600">&rsaquo;</span>
            </Link>

            {/* Dark Mode Toggle */}
            <div className="flex items-center justify-between rounded-xl border border-white/5 bg-[#111] p-4">
              <div className="flex items-center gap-4">
                {theme === 'dark' ? (
                  <Moon className="h-5 w-5 text-[#FFD23F]" />
                ) : (
                  <Sun className="h-5 w-5 text-[#FFD23F]" />
                )}
                <div>
                  <p className="font-['Nunito'] text-sm font-bold text-white">Dark Mode</p>
                  <p className="text-xs text-zinc-500">{theme === 'dark' ? 'Currently on' : 'Currently off'}</p>
                </div>
              </div>
              <button
                onClick={toggleTheme}
                className={`relative h-7 w-12 rounded-full transition-colors ${
                  theme === 'dark' ? 'bg-[#FF6B35]' : 'bg-zinc-700'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${
                    theme === 'dark' ? 'translate-x-5' : ''
                  }`}
                />
              </button>
            </div>

            {/* Sign Out */}
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-4 rounded-xl border border-red-500/20 bg-[#111] p-4 text-left transition-colors hover:bg-red-500/5"
            >
              <LogOut className="h-5 w-5 text-red-500" />
              <div>
                <p className="font-['Nunito'] text-sm font-bold text-red-400">Sign Out</p>
                <p className="text-xs text-zinc-500">Log out of your account</p>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Bottom padding for nav bar */}
      <div className="h-20" />
    </div>
  )
}
