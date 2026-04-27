import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  DollarSign, TrendingUp, Wallet, Clock, ExternalLink,
  Loader2, AlertCircle, CreditCard, ShieldCheck,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'

const API_BASE = import.meta.env.VITE_API_URL || ''

// Phase 2 Earnings page. Four big metric cards up top, then a
// plain-language "how you get paid" explainer with a deep link to
// the store owner's Stripe Express dashboard for payout details.
//
// Intentionally simple — most store owners won't dig into numbers.
// They want to see: "this month / lifetime / available now / pending".

export default function MyEarningsPage() {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const authLoading = useAuthStore(s => s.loading)
  // authStore only persists `profile` — token lives in localStorage. Read
  // it here so the bearer header is actually populated on fetch.
  const token = typeof window !== 'undefined' ? localStorage.getItem('togogo-token') : null

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)

  // Kick auth init on cold start
  useEffect(() => {
    if (authLoading) useAuthStore.getState().initialize?.()
  }, [])

  // Wait for auth; otherwise first render has token=undefined and
  // /api/my-shop/earnings returns 401.
  useEffect(() => {
    if (authLoading) return
    if (!user || !token) { navigate('/auth?redirect=/my-shop/earnings'); return }
    let cancelled = false
    async function load() {
      setLoading(true); setErr(null)
      try {
        const res = await fetch(`${API_BASE}/api/my-shop/earnings`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const d = await res.json()
        if (!cancelled) setData(d)
      } catch (e) {
        if (!cancelled) setErr('Could not load earnings. Please refresh the page.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [user, token, authLoading])

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl p-8 flex items-center gap-3 text-zinc-400 text-[16px]">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading your earnings…
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

  const month    = data?.thisMonth  || { sales: 0, earnings: 0, orderCount: 0 }
  const lifetime = data?.lifetime   || { sales: 0, earnings: 0, orderCount: 0 }
  const stripe   = data?.stripe     || { connected: false, status: 'not_connected', available: 0, pending: 0, dashboardUrl: null }

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-8 text-[16px]">
      <header className="mb-8">
        <h1 className="text-[28px] md:text-[32px] font-bold text-white mb-1">Earnings</h1>
        <p className="text-[16px] text-zinc-400">Track your income and payouts from ToGoGo.</p>
      </header>

      {/* 4 big metric cards. The first two (This month / Lifetime) show
          both SALES (big — what customers paid) and YOUR PROFIT (under,
          smaller — net after commission). Store owners' first question
          is "how much did I sell", and the profit line satisfies the
          "after-fees" follow-up without burying the headline number. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <SalesMetricCard
          icon={TrendingUp}
          label="This month"
          sales={month.sales}
          profit={month.earnings}
          orderCount={month.orderCount}
          emphasis
        />
        <SalesMetricCard
          icon={DollarSign}
          label="Lifetime"
          sales={lifetime.sales}
          profit={lifetime.earnings}
          orderCount={lifetime.orderCount}
        />
        <MetricCard
          icon={Wallet}
          label="Available to pay out"
          value={stripe.connected ? money(stripe.available) : '—'}
          sub={stripe.connected ? 'Ready in your bank' : 'Connect payments first'}
        />
        <MetricCard
          icon={Clock}
          label="Pending"
          value={stripe.connected ? money(stripe.pending) : '—'}
          sub={stripe.connected ? 'On the way' : ''}
        />
      </div>

      {/* "How you get paid" explainer + Stripe dashboard button */}
      <section className="rounded-2xl border border-white/[0.06] bg-[#111] p-6 md:p-8 mb-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FF6B35]/15 flex-shrink-0">
            <CreditCard className="h-5 w-5 text-[#FF6B35]" aria-hidden />
          </div>
          <div>
            <h2 className="text-[20px] font-semibold text-white mb-1">How you get paid</h2>
            <p className="text-[16px] text-zinc-300 leading-relaxed">
              When customers buy from your shop, money goes into your Stripe account and is automatically paid into your bank account.
              You can check your payout schedule and bank details any time in Stripe.
            </p>
          </div>
        </div>

        {stripe.connected && stripe.dashboardUrl ? (
          <a
            href={stripe.dashboardUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-[#FF6B35] px-5 py-3 text-[16px] font-semibold text-white hover:opacity-90 min-h-[48px]"
          >
            Open Stripe dashboard
            <ExternalLink className="h-4 w-4" aria-hidden />
          </a>
        ) : stripe.connected ? (
          <div className="inline-flex items-center gap-2 rounded-xl bg-white/[0.04] border border-white/[0.08] px-5 py-3 text-[15px] text-zinc-300">
            <ShieldCheck className="h-4 w-4 text-emerald-400" aria-hidden />
            Payments connected — Stripe dashboard link will appear here shortly
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-[15px] text-amber-200">
              You haven't connected payments yet. Set this up so customer payments can flow into your bank account.
            </div>
            {/* Direct link into the Stripe Connect onboarding flow.
                Without this CTA the page was a dead-end for owners who
                hadn't completed payment setup at signup (Stuart's dad
                Michael hit this — no way to recover from /my-shop). */}
            <Link
              to="/setup-payments"
              className="inline-flex items-center gap-2 rounded-xl bg-[#FF6B35] px-5 py-3 text-[16px] font-semibold text-white hover:opacity-90 min-h-[48px]"
            >
              <CreditCard className="h-4 w-4" aria-hidden />
              Set up payouts with Stripe
              <ExternalLink className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        )}
      </section>

      {/* Simple reassurance for people who want to understand fees */}
      <section className="rounded-2xl border border-white/[0.04] bg-white/[0.02] p-5 text-[14px] text-zinc-400">
        <p>
          <strong className="text-zinc-200">Your profit</strong> above is already after ToGoGo's commission has been taken. You won't see extra fees deducted from these numbers.
        </p>
      </section>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────

function MetricCard({ icon: Icon, label, value, sub, emphasis }) {
  return (
    <section
      className={`rounded-2xl border p-5 min-h-[140px] flex flex-col justify-between ` +
        (emphasis
          ? 'border-[#FF6B35]/30 bg-[#FF6B35]/[0.05]'
          : 'border-white/[0.06] bg-[#111]')}
    >
      <div className="flex items-center gap-2">
        <Icon className={`h-5 w-5 ${emphasis ? 'text-[#FF6B35]' : 'text-zinc-400'}`} aria-hidden />
        <span className="text-[13px] uppercase tracking-wider text-zinc-400">{label}</span>
      </div>
      <div>
        <div className={`text-[32px] md:text-[36px] font-bold tabular-nums ${emphasis ? 'text-[#FF6B35]' : 'text-white'}`}>
          {value}
        </div>
        {sub && <div className="text-[14px] text-zinc-500 mt-1">{sub}</div>}
      </div>
    </section>
  )
}

// Card variant for the top two metrics (This month / Lifetime) — shows
// sales as the headline number and profit as a smaller line beneath.
// Designed so elderly users see their shop activity at a glance without
// the "my profit is only $1?" confusion when most of revenue goes to
// AE + commission.
function SalesMetricCard({ icon: Icon, label, sales, profit, orderCount, emphasis }) {
  const profitColor = profit > 0 ? 'text-emerald-400' : profit < 0 ? 'text-red-400' : 'text-zinc-400'
  return (
    <section
      className={`rounded-2xl border p-5 min-h-[160px] flex flex-col justify-between ` +
        (emphasis
          ? 'border-[#FF6B35]/30 bg-[#FF6B35]/[0.05]'
          : 'border-white/[0.06] bg-[#111]')}
    >
      <div className="flex items-center gap-2">
        <Icon className={`h-5 w-5 ${emphasis ? 'text-[#FF6B35]' : 'text-zinc-400'}`} aria-hidden />
        <span className="text-[13px] uppercase tracking-wider text-zinc-400">{label}</span>
      </div>
      <div>
        <div className={`text-[13px] uppercase tracking-wider ${emphasis ? 'text-[#FF6B35]/70' : 'text-zinc-500'}`}>Sales</div>
        <div className={`text-[30px] md:text-[34px] font-bold tabular-nums ${emphasis ? 'text-[#FF6B35]' : 'text-white'}`}>
          {money(sales)}
        </div>
        <div className="mt-2 pt-2 border-t border-white/[0.06]">
          <div className="text-[12px] uppercase tracking-wider text-zinc-500">Your profit (after commission)</div>
          <div className={`text-[18px] font-semibold tabular-nums ${profitColor}`}>{money(profit)}</div>
        </div>
        {orderCount !== undefined && (
          <div className="text-[13px] text-zinc-500 mt-2">
            {orderCount} order{orderCount === 1 ? '' : 's'}
          </div>
        )}
      </div>
    </section>
  )
}

function money(usd) {
  const n = parseFloat(usd) || 0
  const sign = n < 0 ? '−' : ''
  return `${sign}$${Math.abs(n).toFixed(2)}`
}
