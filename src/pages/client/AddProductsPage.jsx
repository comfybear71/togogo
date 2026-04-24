import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Sparkles, Search, ArrowRight, ArrowLeft, AlertTriangle, Loader2 } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'

const API_BASE = import.meta.env.VITE_API_URL || ''

// Entry point for adding products to a shop. Two paths:
//   • Let AI fill the shop based on a niche (Phase 3 build flow)
//   • Browse the platform catalogue manually (existing /browse)
//
// Deliberately not in the sidebar — Home's "Add products" quick action
// brings users here, keeping the sidebar to five items for clarity.
//
// Copy adapts based on whether the owner already has a niche built:
// first-timers get a warm invite; owners who've already built get
// "rebuild replaces current catalogue" framing.

export default function AddProductsPage() {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const authLoading = useAuthStore(s => s.loading)
  const token = typeof window !== 'undefined' ? localStorage.getItem('togogo-token') : null

  const [store, setStore] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) useAuthStore.getState().initialize?.()
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (!user || !token) { navigate('/auth?redirect=/my-shop/add-products'); return }
    ;(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/my-shop/store`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          setStore(data.store || null)
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [user, token, authLoading])

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl p-8 flex items-center gap-3 text-zinc-400 text-[16px]">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading…
      </div>
    )
  }

  const hasExistingNiche = !!store?.niche

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-8 text-[16px]">
      <Link
        to="/my-shop"
        className="inline-flex items-center gap-2 text-[16px] text-zinc-400 hover:text-white mb-6 min-h-[44px]"
      >
        <ArrowLeft className="h-5 w-5" aria-hidden />
        Back to Home
      </Link>

      <header className="mb-8">
        <h1 className="text-[28px] md:text-[32px] font-bold text-white mb-2">Add products</h1>
        <p className="text-[17px] text-zinc-400">
          {hasExistingNiche
            ? `Your shop is set up for "${store.niche}". Add more products or switch to a new niche.`
            : "Pick how you'd like to fill your shop. You can always add more later."}
        </p>
      </header>

      {/* Rebuild warning banner — only shown when the shop already has
          a niche. Separates the destructive intent from the friendly
          "add some more" framing. */}
      {hasExistingNiche && (
        <div className="mb-6 rounded-2xl border border-amber-500/20 bg-amber-500/[0.05] p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" aria-hidden />
          <div className="text-[15px] text-amber-100">
            <strong className="text-amber-300">Heads up:</strong> using AI Builder again will replace your current products with ones from a new niche. Your existing orders and earnings are unaffected.
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PathCard
          to="/my-shop/build"
          icon={Sparkles}
          title={hasExistingNiche ? 'Build with AI (rebuild)' : 'Let AI build my shop'}
          description={hasExistingNiche
            ? 'Pick a new niche and we\'ll refill your shop automatically.'
            : 'Tell us what you want to sell — Claude picks great products and fills your shop in minutes.'}
          cta={hasExistingNiche ? 'Rebuild with AI' : 'Get started'}
          tone="primary"
        />
        <PathCard
          to="/browse"
          icon={Search}
          title="Browse and pick myself"
          description="Look through our catalogue and add products one at a time, your way."
          cta="Browse products"
          tone="neutral"
        />
      </div>
    </div>
  )
}

function PathCard({ to, icon: Icon, title, description, cta, tone }) {
  const isPrimary = tone === 'primary'
  return (
    <Link
      to={to}
      className={`group flex flex-col justify-between rounded-2xl border p-6 md:p-8 min-h-[240px] transition-colors ` +
        (isPrimary
          ? 'border-[#FF6B35]/30 bg-[#FF6B35]/[0.05] hover:bg-[#FF6B35]/[0.1] hover:border-[#FF6B35]/60'
          : 'border-white/[0.08] bg-[#111] hover:bg-[#181818] hover:border-white/[0.2]')}
    >
      <div className={`flex h-14 w-14 items-center justify-center rounded-xl ` +
        (isPrimary ? 'bg-[#FF6B35]/20' : 'bg-white/[0.06]')}>
        <Icon className={`h-7 w-7 ${isPrimary ? 'text-[#FF6B35]' : 'text-zinc-300'}`} aria-hidden />
      </div>
      <div>
        <h2 className="text-[22px] md:text-[24px] font-semibold text-white mb-2">{title}</h2>
        <p className="text-[16px] text-zinc-400 mb-5 leading-relaxed">{description}</p>
        <div className={`inline-flex items-center gap-2 text-[16px] font-semibold ` +
          (isPrimary ? 'text-[#FF6B35]' : 'text-zinc-300')}>
          {cta}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </div>
      </div>
    </Link>
  )
}
