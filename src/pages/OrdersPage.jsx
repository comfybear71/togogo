import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Package, Clock, Truck, Check, X, ChevronRight,
  ShoppingBag, AlertCircle, MapPin, RefreshCw,
} from 'lucide-react'
import { useOrderStore } from '../stores/orderStore'
import { useAuthStore } from '../stores/authStore'
import Button from '../components/ui/Button'

const STATUS_CONFIG = {
  processing: { icon: Clock, label: 'Processing', color: '#FFD23F', bg: 'bg-[#FFD23F]/10' },
  shipped: { icon: Truck, label: 'Shipped', color: '#a78bfa', bg: 'bg-[#a78bfa]/10' },
  delivered: { icon: Check, label: 'Delivered', color: '#06D6A0', bg: 'bg-[#06D6A0]/10' },
  cancelled: { icon: X, label: 'Cancelled', color: '#ef4444', bg: 'bg-red-500/10' },
}

function formatDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatTime(iso) {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

export default function OrdersPage() {
  const { orders } = useOrderStore()
  const user = useAuthStore((s) => s.user)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [filter, setFilter] = useState('all')

  const filteredOrders = filter === 'all'
    ? orders
    : orders.filter((o) => o.status === filter)

  if (!user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center px-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-zinc-800/50 mx-auto mb-6">
            <Package className="h-10 w-10 text-zinc-600" />
          </div>
          <h2 className="font-heading text-xl font-bold text-white mb-2">Sign in to view orders</h2>
          <p className="text-sm text-zinc-500 mb-6">Track your order history and delivery status.</p>
          <Link to="/auth?redirect=/orders">
            <Button>Sign In</Button>
          </Link>
        </div>
      </div>
    )
  }

  // Order detail view
  if (selectedOrder) {
    const order = selectedOrder
    const sc = STATUS_CONFIG[order.status] || STATUS_CONFIG.processing
    const StatusIcon = sc.icon

    return (
      <div className="py-6 max-w-2xl mx-auto">
        <button
          onClick={() => setSelectedOrder(null)}
          className="flex items-center gap-1 text-xs text-zinc-500 hover:text-white mb-4 transition-colors"
        >
          &larr; Back to Orders
        </button>

        {/* Order header */}
        <div className="rounded-xl bg-[#111] border border-white/[0.06] p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[10px] text-zinc-600">Order ID</p>
              <p className="text-sm font-bold text-white font-mono">{order.id}</p>
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${sc.bg}`}>
              <StatusIcon className="h-3 w-3" style={{ color: sc.color }} />
              <span className="text-[10px] font-bold" style={{ color: sc.color }}>{sc.label}</span>
            </div>
          </div>
          <div className="flex gap-6 text-[10px] text-zinc-500">
            <div>
              <p>Placed</p>
              <p className="text-white font-medium">{formatDate(order.createdAt)}</p>
            </div>
            <div>
              <p>Time</p>
              <p className="text-white font-medium">{formatTime(order.createdAt)}</p>
            </div>
            <div>
              <p>Total</p>
              <p className="text-white font-medium">${order.total.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="rounded-xl bg-[#111] border border-white/[0.06] p-5 mb-4">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Items</h3>
          <div className="space-y-3">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#0a0a0a] flex items-center justify-center flex-shrink-0">
                  {item.image ? (
                    <img src={item.image} alt="" className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <Package className="h-4 w-4 text-zinc-700" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white font-medium truncate">{item.title}</p>
                  <p className="text-[10px] text-zinc-600">Qty: {item.quantity}</p>
                </div>
                <p className="text-xs font-semibold text-white">${(item.price * item.quantity).toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Shipping */}
        {order.shipping && (
          <div className="rounded-xl bg-[#111] border border-white/[0.06] p-5">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="h-3.5 w-3.5 text-[#FF6B35]" />
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Shipping Address</h3>
            </div>
            <p className="text-xs text-white">{order.shipping.name}</p>
            <p className="text-[10px] text-zinc-500 mt-0.5">
              {order.shipping.address}, {order.shipping.city} {order.shipping.postcode}
            </p>
            <p className="text-[10px] text-zinc-500">{order.shipping.country}</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="py-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#a78bfa]/15">
          <Package className="h-5 w-5 text-[#a78bfa]" />
        </div>
        <div>
          <h1 className="text-xl font-heading font-bold text-white">Orders</h1>
          <p className="text-[10px] text-zinc-500">{orders.length} order{orders.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1 scrollbar-hide">
        {['all', 'processing', 'shipped', 'delivered'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-medium border transition-colors capitalize ${
              filter === f
                ? 'bg-[#FF6B35]/15 border-[#FF6B35]/30 text-[#FF6B35]'
                : 'bg-[#111] border-white/[0.06] text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Orders list */}
      {filteredOrders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/[0.08] p-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#111] border border-white/[0.06] mx-auto mb-4">
            <ShoppingBag className="h-7 w-7 text-zinc-600" />
          </div>
          <h3 className="text-sm font-semibold text-white mb-1">No orders yet</h3>
          <p className="text-xs text-zinc-500 mb-5 max-w-[240px] mx-auto">
            When you place an order, it will show up here so you can track it.
          </p>
          <Link to="/suppliers">
            <Button size="sm">Browse Products</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const sc = STATUS_CONFIG[order.status] || STATUS_CONFIG.processing
            const StatusIcon = sc.icon
            return (
              <button
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className="w-full text-left rounded-xl bg-[#111] border border-white/[0.06] p-4 hover:border-white/[0.12] transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-white font-mono">{order.id}</p>
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${sc.bg}`}>
                    <StatusIcon className="h-2.5 w-2.5" style={{ color: sc.color }} />
                    <span className="text-[9px] font-bold" style={{ color: sc.color }}>{sc.label}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] text-zinc-500">{formatDate(order.createdAt)}</p>
                    <span className="text-zinc-700">·</span>
                    <p className="text-[10px] text-zinc-500">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-white">${order.total.toFixed(2)}</p>
                    <ChevronRight className="h-3.5 w-3.5 text-zinc-600" />
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
