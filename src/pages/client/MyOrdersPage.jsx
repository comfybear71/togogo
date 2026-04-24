import { useState, useEffect } from 'react'
import {
  Package, Loader2, CheckCircle2, Clock, Truck, XCircle, AlertCircle,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'

const API_BASE = import.meta.env.VITE_API_URL || ''

// Phase 2 Orders page — shows the store owner's own orders only.
// Big rows, plain language, elderly-friendly: no dense admin table.
// Uses GET /api/my-shop/orders which applies ownership server-side.

const STATUS_META = {
  pending:          { label: 'Waiting',    icon: Clock,        color: 'bg-yellow-500/15 text-yellow-300' },
  pending_payment:  { label: 'Not paid',   icon: Clock,        color: 'bg-zinc-500/15 text-zinc-300' },
  processing:       { label: 'Preparing',  icon: Package,      color: 'bg-blue-500/15 text-blue-300' },
  shipped:          { label: 'Shipped',    icon: Truck,        color: 'bg-purple-500/15 text-purple-300' },
  delivered:        { label: 'Delivered',  icon: CheckCircle2, color: 'bg-emerald-500/15 text-emerald-300' },
  cancelled:        { label: 'Cancelled',  icon: XCircle,      color: 'bg-red-500/15 text-red-300' },
  refunded:         { label: 'Refunded',   icon: XCircle,      color: 'bg-red-500/15 text-red-300' },
}

export default function MyOrdersPage() {
  const token = useAuthStore(s => s.token)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true); setErr(null)
      try {
        const res = await fetch(`${API_BASE}/api/my-shop/orders?limit=200`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (!cancelled) setOrders(data.orders || [])
      } catch (e) {
        if (!cancelled) setErr('Could not load your orders. Please refresh the page.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [token])

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl p-8 flex items-center gap-3 text-zinc-400 text-[16px]">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading your orders…
      </div>
    )
  }

  if (err) {
    return (
      <div className="mx-auto max-w-5xl p-4 md:p-8 text-[16px]">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 flex items-start gap-3">
          <AlertCircle className="h-6 w-6 text-red-400 flex-shrink-0" />
          <div>
            <div className="text-[17px] font-semibold text-red-300 mb-1">Something went wrong</div>
            <div className="text-[15px] text-red-200/80">{err}</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-8 text-[16px]">
      <header className="mb-6">
        <h1 className="text-[28px] md:text-[32px] font-bold text-white mb-1">Orders</h1>
        <p className="text-[16px] text-zinc-400">
          {orders.length === 0
            ? "You haven't had any sales yet."
            : `Showing your most recent ${orders.length} order${orders.length === 1 ? '' : 's'}.`}
        </p>
      </header>

      {orders.length === 0 ? (
        <EmptyState />
      ) : (
        <OrdersList orders={orders} />
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <section className="rounded-2xl border border-white/[0.06] bg-[#111] p-10 text-center">
      <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-[#FF6B35]/10">
        <Package className="h-10 w-10 text-[#FF6B35]" aria-hidden />
      </div>
      <div className="text-[22px] font-semibold text-white mb-2">No orders yet</div>
      <p className="text-[16px] text-zinc-400 max-w-md mx-auto mb-5">
        When a customer buys from your shop, you'll see it here. Share your shop link with friends and family to get your first sale!
      </p>
    </section>
  )
}

function OrdersList({ orders }) {
  return (
    <div className="space-y-3">
      {orders.map(o => <OrderCard key={o.id} order={o} />)}
    </div>
  )
}

function OrderCard({ order }) {
  const meta = STATUS_META[order.status] || STATUS_META.pending
  const StatusIcon = meta.icon
  const profitPos = order.profit > 0
  const profitNeg = order.profit < 0
  const date = order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : ''

  return (
    <article className="rounded-2xl border border-white/[0.06] bg-[#111] p-4 md:p-5 min-h-[92px]">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {order.productImage && (
            <img
              src={order.productImage}
              alt=""
              className="h-14 w-14 rounded-lg object-cover flex-shrink-0"
            />
          )}
          <div className="min-w-0">
            <div className="text-[16px] md:text-[17px] font-semibold text-white line-clamp-2">
              {order.productTitle || 'Unknown product'}
            </div>
            <div className="text-[14px] text-zinc-500 mt-0.5">
              {order.customerName} · {date}
            </div>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[13px] font-semibold ${meta.color}`}>
          <StatusIcon className="h-3.5 w-3.5" aria-hidden />
          {meta.label}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/[0.04]">
        <Metric label="Customer paid" value={`$${order.customerPaid.toFixed(2)}`} color="text-white" />
        <Metric label="Our cost" value={order.aeBilled != null ? `$${order.aeBilled.toFixed(2)}` : '—'} color="text-zinc-400" />
        <Metric
          label="Your profit"
          value={`${profitPos ? '+' : profitNeg ? '−' : ''}$${Math.abs(order.profit).toFixed(2)}`}
          color={profitPos ? 'text-emerald-400' : profitNeg ? 'text-red-400' : 'text-zinc-400'}
        />
      </div>
    </article>
  )
}

function Metric({ label, value, color }) {
  return (
    <div>
      <div className="text-[12px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className={`text-[18px] md:text-[20px] font-semibold tabular-nums ${color}`}>{value}</div>
    </div>
  )
}
