import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  DollarSign, Package, ShoppingBag, TrendingUp, Clock,
  Store, ExternalLink, Plus, ArrowUpRight, ArrowDownRight,
  Settings, Globe, Link2, Unlink, Rocket, CheckCircle2,
  AlertCircle, Loader2, BarChart3, ChevronRight, Zap,
  RefreshCw, Truck, Send,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useAuthStore, authFetch } from '../stores/authStore'

const API_BASE = import.meta.env.VITE_API_URL || ''

const statusColors = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  processing: 'bg-blue-500/20 text-blue-400',
  shipped: 'bg-purple-500/20 text-purple-400',
  delivered: 'bg-green-500/20 text-green-400',
  cancelled: 'bg-red-500/20 text-red-400',
}

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

export default function DashboardPage() {
  const profile = useAuthStore(s => s.profile)
  const [tab, setTab] = useState('overview')
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [fulfilling, setFulfilling] = useState(false)
  const [actionMessage, setActionMessage] = useState(null)
  const [editingOrder, setEditingOrder] = useState(null)
  const [editForm, setEditForm] = useState({ status: '', tracking_number: '', tracking_url: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function fetchStats() {
      try {
        const data = await authFetch('/api/dashboard/stats')
        setStats(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  async function refreshStats() {
    try {
      const data = await authFetch('/api/dashboard/stats')
      setStats(data)
    } catch { /* ignore */ }
  }

  async function handleSyncTracking() {
    setSyncing(true)
    setActionMessage(null)
    try {
      const result = await authFetch('/api/orders/sync-tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      setActionMessage(
        result.updated > 0
          ? `Updated ${result.updated} order(s) with new tracking info`
          : 'All orders are up to date — no new tracking info from suppliers'
      )
      await refreshStats()
    } catch (err) {
      setActionMessage(`Sync failed: ${err.message}`)
    } finally {
      setSyncing(false)
    }
  }

  async function handleFulfillOrders() {
    setFulfilling(true)
    setActionMessage(null)
    try {
      const result = await authFetch('/api/orders/fulfill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (result.fulfilled > 0 && result.failed === 0) {
        setActionMessage(`Sent ${result.fulfilled} order(s) to suppliers`)
      } else if (result.fulfilled > 0 && result.failed > 0) {
        setActionMessage(`Sent ${result.fulfilled} order(s), ${result.failed} failed`)
      } else if (result.results?.length === 0) {
        setActionMessage('No unfulfilled orders to send')
      } else {
        const errors = (result.results || []).filter(r => !r.success).map(r => `${r.product_title || 'Order'}: ${r.error}`).join('; ')
        setActionMessage(`${result.failed} order(s) failed — ${errors || 'check supplier API keys'}`)
      }
      await refreshStats()
    } catch (err) {
      setActionMessage(`Fulfillment failed: ${err.message}`)
    } finally {
      setFulfilling(false)
    }
  }

  function openEditOrder(order) {
    setEditingOrder(order)
    setEditForm({
      status: order.status || '',
      tracking_number: order.tracking_number || '',
      tracking_url: order.tracking_url || '',
    })
  }

  async function handleSaveOrder() {
    if (!editingOrder) return
    setSaving(true)
    try {
      await authFetch('/api/orders/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: editingOrder.id,
          status: editForm.status || undefined,
          tracking_number: editForm.tracking_number || undefined,
          tracking_url: editForm.tracking_url || undefined,
        }),
      })
      setEditingOrder(null)
      await refreshStats()
    } catch (err) {
      setActionMessage(`Save failed: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF6B35]" />
      </div>
    )
  }

  const connections = stats?.connections || []
  const activeConnections = connections.filter(c => c.status === 'active')
  const domains = stats?.domains || []
  const orders = stats?.orders || { total: 0, revenue: 0, profit: 0 }
  const products = stats?.products || { total: 0, active: 0 }
  const recentOrders = stats?.recentOrders || []
  const earnings = stats?.earnings || []

  const hasSetup = activeConnections.length > 0
  const avgMargin = orders.revenue > 0 ? Math.round((orders.profit / orders.revenue) * 100) : 0

  return (
    <div className="py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white">Dashboard</h1>
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

      {/* Setup Status Card — show if no connections yet */}
      {!hasSetup && (
        <div className="rounded-2xl bg-gradient-to-r from-[#FF6B35]/10 to-[#FFD23F]/10 border border-[#FF6B35]/20 p-5 mb-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FF6B35]/15 flex-shrink-0">
              <Rocket className="h-5 w-5 text-[#FF6B35]" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-white mb-1">Get started — launch your store</h3>
              <p className="text-xs text-zinc-400 mb-3">
                Connect a selling platform to start listing products and making sales.
              </p>
              <Link
                to="/launch-store"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#FF6B35] text-white text-xs font-semibold hover:bg-[#FF6B35]/90 transition-colors"
              >
                <Rocket className="h-3.5 w-3.5" />
                Launch Store
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* My Setup Panel */}
      <div className="rounded-2xl bg-[#111] border border-white/[0.06] p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-white flex items-center gap-2">
            <Store className="h-3.5 w-3.5 text-[#FF6B35]" />
            My Setup
          </h3>
          <Link to="/launch-store" className="text-[10px] text-[#FF6B35] font-medium flex items-center gap-0.5">
            Manage <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Connected Platforms */}
        {activeConnections.length > 0 ? (
          <div className="space-y-2 mb-3">
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
                      <CheckCircle2 className="h-2.5 w-2.5" /> Connected
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {conn.shop_name && (
                      <span className="text-[10px] text-zinc-500 truncate">{conn.shop_name}</span>
                    )}
                    {conn.shop_url && (
                      <a
                        href={conn.shop_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-zinc-600 hover:text-zinc-400 flex items-center gap-0.5 flex-shrink-0"
                      >
                        <ExternalLink className="h-2.5 w-2.5" />
                        {conn.shop_url.replace(/^https?:\/\//, '').replace(/\/+$/, '')}
                      </a>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[10px] text-zinc-600">
                    {conn.products_synced || 0} products
                  </p>
                  {conn.connected_at && (
                    <p className="text-[9px] text-zinc-700">
                      Since {new Date(conn.connected_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-600 mb-3">No platforms connected yet</p>
        )}

        {/* Domains */}
        {domains.length > 0 && (
          <div className="pt-2 border-t border-white/[0.04]">
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Domains</p>
            {domains.map((d) => (
              <div key={d.domain} className="flex items-center gap-2 py-1.5">
                <Globe className="h-3.5 w-3.5 text-[#06D6A0]" />
                <span className="text-xs text-white font-medium">{d.domain}</span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                  d.status === 'active' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-yellow-500/15 text-yellow-400'
                }`}>
                  {d.status}
                </span>
                {d.expires_at && (
                  <span className="text-[9px] text-zinc-600 ml-auto">
                    Expires {new Date(d.expires_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Quick actions */}
        <div className="flex gap-2 mt-3 pt-3 border-t border-white/[0.04]">
          {activeConnections.length === 0 && (
            <Link
              to="/launch-store"
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#FF6B35]/10 border border-[#FF6B35]/20 text-[10px] font-semibold text-[#FF6B35] hover:bg-[#FF6B35]/15 transition-colors"
            >
              <Link2 className="h-3 w-3" /> Connect a Platform
            </Link>
          )}
          <Link
            to="/suppliers"
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[10px] font-semibold text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors"
          >
            <Plus className="h-3 w-3" /> Add Products
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
          <p className="text-xl font-bold text-white">${orders.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
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
          <p className="text-xl font-bold text-white">${orders.profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          {avgMargin > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <ArrowUpRight className="h-3 w-3 text-[#06D6A0]" />
              <span className="text-[10px] text-[#06D6A0]">{avgMargin}% avg margin</span>
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

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-[#111] rounded-xl p-1 border border-white/[0.06]">
        {['overview', 'orders', 'stores'].map(t => (
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
                      {order.tracking_number && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Truck className="h-2.5 w-2.5 text-purple-400" />
                          <span className="text-[9px] text-purple-400 font-mono">{order.tracking_number}</span>
                        </div>
                      )}
                      {!order.supplier_order_id && ['pending', 'processing'].includes(order.status) && (
                        <span className="text-[9px] text-yellow-400/70 mt-0.5 block">Not sent to supplier</span>
                      )}
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
              </div>
            )}
          </div>
        </div>
      )}

      {/* Orders tab */}
      {tab === 'orders' && (
        <div className="space-y-2">
          {/* Action buttons */}
          {recentOrders.length > 0 && (
            <div className="flex gap-2 mb-3">
              <button
                onClick={handleSyncTracking}
                disabled={syncing}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#111] border border-white/[0.06] text-[10px] font-semibold text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-3 w-3 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Checking suppliers...' : 'Sync Tracking'}
              </button>
              {recentOrders.some(o => !o.supplier_order_id && ['pending', 'processing'].includes(o.status)) && (
                <button
                  onClick={handleFulfillOrders}
                  disabled={fulfilling}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#FF6B35]/10 border border-[#FF6B35]/20 text-[10px] font-semibold text-[#FF6B35] hover:bg-[#FF6B35]/15 transition-colors disabled:opacity-50"
                >
                  <Send className={`h-3 w-3 ${fulfilling ? 'animate-pulse' : ''}`} />
                  {fulfilling ? 'Sending to suppliers...' : 'Send to Suppliers'}
                </button>
              )}
            </div>
          )}

          {/* Action feedback message */}
          {actionMessage && (
            <div className="rounded-xl bg-[#111] border border-white/[0.06] p-3 mb-2">
              <p className="text-[11px] text-zinc-300">{actionMessage}</p>
            </div>
          )}

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

                {/* Supplier fulfillment status */}
                <div className="mt-2 pt-2 border-t border-white/[0.04]">
                  {order.supplier_order_id ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-emerald-400 flex-shrink-0" />
                      <span className="text-[10px] text-zinc-400">
                        Sent to {order.supplier} — Ref: <span className="text-zinc-300 font-mono">{order.supplier_order_id}</span>
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-3 w-3 text-yellow-400 flex-shrink-0" />
                      <span className="text-[10px] text-yellow-400/80">
                        Not yet sent to supplier — use "Send to Suppliers" above
                      </span>
                    </div>
                  )}

                  {order.tracking_number && (
                    <div className="flex items-center gap-2 mt-1.5">
                      <Truck className="h-3 w-3 text-purple-400 flex-shrink-0" />
                      <span className="text-[10px] text-zinc-400">
                        Tracking:{' '}
                        {order.tracking_url ? (
                          <a href={order.tracking_url} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 underline font-mono">
                            {order.tracking_number}
                          </a>
                        ) : (
                          <span className="text-zinc-300 font-mono">{order.tracking_number}</span>
                        )}
                      </span>
                    </div>
                  )}

                  {!order.tracking_number && order.supplier_order_id && (
                    <div className="flex items-center gap-2 mt-1.5">
                      <Clock className="h-3 w-3 text-zinc-600 flex-shrink-0" />
                      <span className="text-[10px] text-zinc-600">
                        Tracking not yet available — tap Sync Tracking to check
                      </span>
                    </div>
                  )}
                </div>

                {order.notes && (
                  <p className="text-[9px] text-zinc-600 mt-1.5 italic">{order.notes}</p>
                )}

                {/* Edit button */}
                <button
                  onClick={() => openEditOrder(order)}
                  className="mt-2 w-full py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[10px] font-medium text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors"
                >
                  Update Status / Add Tracking
                </button>
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

      {/* Stores tab */}
      {tab === 'stores' && (
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
                <Rocket className="h-3.5 w-3.5" /> Launch Your Store
              </Link>
            </div>
          )}

          {/* Domains section */}
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
      {/* Order edit modal */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setEditingOrder(null)}>
          <div className="bg-[#111] border border-white/[0.08] rounded-t-2xl sm:rounded-2xl w-full max-w-md p-5" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-white mb-1">Update Order</h3>
            <p className="text-[10px] text-zinc-500 mb-4 truncate">{editingOrder.product_title}</p>

            <label className="block mb-3">
              <span className="text-[10px] text-zinc-400 font-medium">Status</span>
              <select
                value={editForm.status}
                onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                className="mt-1 w-full px-3 py-2 rounded-lg bg-black border border-white/[0.08] text-xs text-white focus:outline-none focus:border-[#FF6B35]/50"
              >
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>

            <label className="block mb-3">
              <span className="text-[10px] text-zinc-400 font-medium">Tracking Number</span>
              <input
                type="text"
                value={editForm.tracking_number}
                onChange={e => setEditForm(f => ({ ...f, tracking_number: e.target.value }))}
                placeholder="e.g. AU1234567890"
                className="mt-1 w-full px-3 py-2 rounded-lg bg-black border border-white/[0.08] text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#FF6B35]/50"
              />
            </label>

            <label className="block mb-4">
              <span className="text-[10px] text-zinc-400 font-medium">Tracking URL <span className="text-zinc-600">(optional)</span></span>
              <input
                type="url"
                value={editForm.tracking_url}
                onChange={e => setEditForm(f => ({ ...f, tracking_url: e.target.value }))}
                placeholder="e.g. https://auspost.com.au/track/..."
                className="mt-1 w-full px-3 py-2 rounded-lg bg-black border border-white/[0.08] text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#FF6B35]/50"
              />
            </label>

            <div className="flex gap-2">
              <button
                onClick={() => setEditingOrder(null)}
                className="flex-1 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs font-medium text-zinc-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveOrder}
                disabled={saving}
                className="flex-1 py-2.5 rounded-lg bg-[#FF6B35] text-white text-xs font-semibold hover:bg-[#FF6B35]/90 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
