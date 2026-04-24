import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Plus, ExternalLink, Package, CheckCircle2, Circle,
  Store, CreditCard, DollarSign, ArrowRight, AlertTriangle,
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'

// The client dashboard HOME page. Designed for elderly users:
//   - Friendly welcome, plain language.
//   - Single big status card. No dense metrics grid on first load.
//   - Exactly THREE quick-action tiles, each 200×160px+. More than
//     three and the page becomes a decision tree.
//   - Persistent setup checklist until 100% complete — removes the
//     "what do I do next?" anxiety.
//   - Empty states always have a CTA button, not just a sentence.

const API_BASE = import.meta.env.VITE_API_URL || ''

export default function MyShopPage() {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const authLoading = useAuthStore(s => s.loading)
  // authStore only persists `profile` — token lives in localStorage. Read
  // it here so the bearer header is actually populated on fetch.
  const token = typeof window !== 'undefined' ? localStorage.getItem('togogo-token') : null

  const [store, setStore] = useState(null)
  const [subscription, setSubscription] = useState(null)
  const [productCount, setProductCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [resumingPayment, setResumingPayment] = useState(false)

  // Initialize auth on cold start
  useEffect(() => {
    if (authLoading) useAuthStore.getState().initialize?.()
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (!user) { navigate('/auth?redirect=/my-shop'); return }
    loadDashboard()
  }, [user, authLoading])

  async function loadDashboard() {
    setLoading(true)
    try {
      const [storeRes, productsRes] = await Promise.all([
        fetch(`${API_BASE}/api/my-shop/store`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
        fetch(`${API_BASE}/api/my-shop/products`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
      ])
      if (storeRes?.ok) {
        const data = await storeRes.json()
        setStore(data.store || null)
        setSubscription(data.subscription || null)
      }
      if (productsRes?.ok) {
        const data = await productsRes.json()
        setProductCount((data.products || []).length)
      }
    } finally {
      setLoading(false)
    }
  }

  const displayName = (user?.name || user?.email?.split('@')[0] || 'there').split(' ')[0]
  const storefrontUrl = store?.subdomain ? `https://${store.subdomain}.togogo.me` : null
  const stripeConnected = store?.stripe_connect_status === 'active'

  // The store stays usable while subscription is in limbo so the owner
  // can finish setup, but we need to nudge them toward completing payment.
  // 'missing'   → checkout was abandoned before webhook fired (Michael F).
  // 'past_due'  → Stripe couldn't charge their card on renewal.
  // 'cancelled' / 'expired' → they let it lapse but the store is still up.
  const subStatus = subscription?.status || null
  const needsPayment = !!store && subStatus !== 'active' && !loading

  async function resumeSubscription() {
    if (!store?.subdomain) return
    setResumingPayment(true)
    try {
      const res = await fetch(`${API_BASE}/api/subscriptions/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          storeName: store.store_name || store.subdomain,
          subdomain: store.subdomain,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (data?.alreadySubscribed) {
        // Race: subscription completed between page load and click. Just
        // re-fetch the dashboard so the banner disappears.
        loadDashboard()
        return
      }
      if (data?.url) {
        window.location.href = data.url
        return
      }
      window.alert(data?.error || 'Could not start checkout. Please try again.')
    } catch {
      window.alert('Could not reach the payment service. Please try again.')
    } finally {
      setResumingPayment(false)
    }
  }

  const setupSteps = [
    { key: 'account',  label: 'Create account',             done: !!user,             hint: 'Signed in as ' + (user?.email || '') },
    { key: 'store',    label: 'Your store is live',         done: !!store?.subdomain, hint: store?.subdomain ? `${store.subdomain}.togogo.me` : 'Waiting for store setup' },
    { key: 'payments', label: 'Payments set up',            done: stripeConnected,    hint: stripeConnected ? 'Ready to receive payouts' : 'You need this to receive money' },
    { key: 'products', label: 'Add your first product',     done: productCount > 0,   hint: productCount > 0 ? `${productCount} product${productCount === 1 ? '' : 's'} listed` : 'Zero products yet' },
    { key: 'sale',     label: 'Make your first sale',       done: false,              hint: 'Happens after a customer buys' },
  ]
  const completed = setupSteps.filter(s => s.done).length
  const totalSteps = setupSteps.length
  const allDone = completed === totalSteps

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-8 text-[16px]">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-[28px] md:text-[34px] font-bold text-white mb-2">
          Welcome back, {displayName} 👋
        </h1>
        <p className="text-[17px] text-zinc-400">
          Here's what's happening with your shop.
        </p>
      </div>

      {/* Payment-needed banner — shown when the shop exists but no
          successful subscription payment has landed yet. Plain language,
          big amber card, single big button. Designed for our elderly
          users so the path forward is one tap, not a treasure hunt. */}
      {needsPayment && (
        <section
          aria-labelledby="payment-needed-title"
          className="mb-6 rounded-2xl border border-amber-500/40 bg-amber-500/[0.08] p-5 md:p-6"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-7 w-7 text-amber-400 flex-shrink-0 mt-0.5" aria-hidden />
              <div>
                <h2 id="payment-needed-title" className="text-[19px] md:text-[20px] font-semibold text-white mb-1">
                  {subStatus === 'past_due' ? 'Your last payment didn\'t go through' :
                   subStatus === 'cancelled' || subStatus === 'expired' ? 'Your subscription has ended' :
                   'Finish setting up your shop'}
                </h2>
                <p className="text-[15px] md:text-[16px] text-zinc-200 leading-relaxed">
                  {subStatus === 'past_due'
                    ? 'Your card was declined when we tried to charge it. Please update your payment to keep your shop running.'
                    : subStatus === 'cancelled' || subStatus === 'expired'
                    ? 'Restart your $19.99/month subscription to keep your shop online.'
                    : 'Your shop is ready, but the $19.99/month payment didn\'t finish. Tap below to complete it now.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={resumeSubscription}
              disabled={resumingPayment}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 disabled:cursor-wait px-5 py-3 min-h-[52px] text-[16px] font-semibold text-black transition-colors"
            >
              <CreditCard className="h-5 w-5" aria-hidden />
              {resumingPayment ? 'Loading…' : 'Complete payment'}
            </button>
          </div>
        </section>
      )}

      {/* Store status card */}
      <section aria-label="Store status" className="mb-8 rounded-2xl bg-[#111] border border-white/[0.06] p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="text-[14px] uppercase tracking-wider text-zinc-500 mb-1">Your shop</div>
            <div className="text-[26px] md:text-[30px] font-bold text-white mb-1">
              {store?.store_name || (loading ? 'Loading…' : 'Your store')}
            </div>
            {storefrontUrl && (
              <a
                href={storefrontUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[17px] text-[#FF6B35] hover:underline"
              >
                {store.subdomain}.togogo.me
                <ExternalLink className="h-4 w-4" aria-hidden />
              </a>
            )}
          </div>
          <div className="flex gap-6">
            <div>
              <div className="text-[14px] uppercase tracking-wider text-zinc-500">Products</div>
              <div className="text-[32px] font-bold text-white">{productCount}</div>
            </div>
            <div>
              <div className="text-[14px] uppercase tracking-wider text-zinc-500">Status</div>
              <div className="text-[18px] font-semibold mt-1">
                {store?.status === 'active' ? (
                  <span className="text-emerald-400">● Live</span>
                ) : (
                  <span className="text-zinc-400">● Setting up</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick actions — exactly THREE, big, icon + label */}
      <section aria-label="Quick actions" className="mb-8">
        <h2 className="text-[20px] font-semibold text-white mb-4">Quick actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <QuickAction
            icon={Plus}
            label="Add products"
            desc="Let AI fill your shop, or browse manually"
            to="/my-shop/add-products"
          />
          <QuickAction
            icon={Store}
            label="View my store"
            desc="See what customers see"
            href={storefrontUrl}
            external
            disabled={!storefrontUrl}
          />
          <QuickAction
            icon={Package}
            label="My orders"
            desc="Check recent sales"
            to="/my-shop/orders"
          />
        </div>
      </section>

      {/* Setup checklist */}
      {!allDone && (
        <section aria-label="Setup checklist" className="rounded-2xl bg-[#111] border border-white/[0.06] p-6 md:p-8">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[20px] font-semibold text-white">Finish setting up</h2>
            <div className="text-[15px] text-zinc-400">{completed} of {totalSteps} done</div>
          </div>
          {/* Progress bar */}
          <div className="mb-6 h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-[#FF6B35] transition-all"
              style={{ width: `${(completed / totalSteps) * 100}%` }}
            />
          </div>
          <ul className="space-y-3">
            {setupSteps.map(step => (
              <li key={step.key} className="flex items-start gap-3 py-2">
                {step.done ? (
                  <CheckCircle2 className="h-6 w-6 text-emerald-400 flex-shrink-0 mt-0.5" aria-hidden />
                ) : (
                  <Circle className="h-6 w-6 text-zinc-600 flex-shrink-0 mt-0.5" aria-hidden />
                )}
                <div>
                  <div className={`text-[17px] font-medium ${step.done ? 'text-zinc-500 line-through' : 'text-white'}`}>
                    {step.label}
                  </div>
                  <div className="text-[14px] text-zinc-500">{step.hint}</div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {allDone && (
        <section className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-6 md:p-8 text-center">
          <div className="text-[22px] font-bold text-emerald-300 mb-1">Your shop is ready to sell 🎉</div>
          <div className="text-[16px] text-emerald-200/70">Keep adding products to grow your earnings.</div>
        </section>
      )}
    </div>
  )
}

function QuickAction({ icon: Icon, label, desc, to, href, external, disabled }) {
  // 180px+ tall tile, huge tap target. Elderly users can see the icon AND
  // read the label in the same glance.
  const content = (
    <div className={`flex flex-col justify-between h-full rounded-2xl border border-white/[0.06] bg-[#111] p-5 min-h-[160px] transition-colors ${disabled ? 'opacity-40' : 'hover:border-[#FF6B35]/40 hover:bg-[#181818]'}`}>
      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#FF6B35]/15">
        <Icon className="h-7 w-7 text-[#FF6B35]" aria-hidden />
      </div>
      <div>
        <div className="text-[19px] font-semibold text-white mb-1">{label}</div>
        <div className="flex items-center gap-1 text-[14px] text-zinc-400">
          {desc}
          {!disabled && <ArrowRight className="h-4 w-4" aria-hidden />}
        </div>
      </div>
    </div>
  )

  if (disabled) return <div>{content}</div>
  if (href) {
    return (
      <a href={href} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined}>
        {content}
      </a>
    )
  }
  return <Link to={to}>{content}</Link>
}
