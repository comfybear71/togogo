import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Sparkles, ArrowLeft, ArrowRight, Wand2, Loader2, CheckCircle2,
  AlertCircle, Rocket, Search, ExternalLink, Store, X,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'

const API_BASE = import.meta.env.VITE_API_URL || ''

// Phase 3 — Client AI Builder. Mirrors admin /admin/store-builder UX
// because the excitement of watching products land in real time is a
// signature moment for store owners (confirmed with Stuart).
//
// Flow (stages):
//   idle       → niche input with friendly examples
//   planning   → "Claude is designing your shop…" spinner
//   plan-ready → preview categories/keywords; confirm if existing niche
//   queuing    → brief transition
//   building   → live tease reel + progress bar + counters
//   complete   → celebration + "See my shop"
//
// Auth: bearer token from localStorage (same pattern as the rest of
// the client dashboard). Ownership enforced by backend:
//   - niche-plan is open to any signed-in user
//   - build-catalog verifies storeId belongs to caller.id
//
// All endpoints already existed for admin; this page reuses them.
// Build-status polling is public so the progress reveal works anonymously.

const SUGGESTED_NICHES = [
  'pet supplies', 'kitchen gadgets', 'beauty & makeup',
  'fishing gear', 'home decor', 'baby & kids',
  'phone accessories', 'gardening tools', 'fitness gear',
]

export default function BuildStorePage() {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const authLoading = useAuthStore(s => s.loading)
  const token = typeof window !== 'undefined' ? localStorage.getItem('togogo-token') : null

  const [store, setStore] = useState(null)
  const [storeLoading, setStoreLoading] = useState(true)

  const [niche, setNiche] = useState('')
  const [stage, setStage] = useState('idle')
  const [plan, setPlan] = useState(null)
  const [error, setError] = useState(null)

  // Build progress
  const [progress, setProgress] = useState(null)
  const [productCount, setProductCount] = useState(0)
  const [recentImages, setRecentImages] = useState([])
  const pollRef = useRef(null)

  // Confirmation dialog for rebuilds (existing niche)
  const [confirmRebuild, setConfirmRebuild] = useState(false)

  // Initial auth + store load
  useEffect(() => { if (authLoading) useAuthStore.getState().initialize?.() }, [])

  useEffect(() => {
    if (authLoading) return
    if (!user || !token) { navigate('/auth?redirect=/my-shop/build'); return }
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
        setStoreLoading(false)
      }
    })()
  }, [user, token, authLoading])

  // Ask Claude to design a shop. No ownership check here — the server
  // treats planning as read-only.
  async function handleGeneratePlan() {
    const trimmed = niche.trim()
    if (!trimmed) { setError('Type what you want to sell first.'); return }
    setError(null)
    setPlan(null)
    setStage('planning')
    try {
      const res = await fetch(`${API_BASE}/api/store-provision/niche-plan`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche: trimmed }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Could not make a plan')
      setPlan(data)
      setStage('plan-ready')
    } catch (err) {
      setError(err.message)
      setStage('idle')
    }
  }

  // Queue the build. If the store already has a niche, show a brief
  // confirmation so the owner knows the run will *add* products to the
  // existing shop — earlier wording said it would replace them, which
  // was incorrect. AI Builder always appends; the Reset shop button on
  // /my-shop/store is the wipe-and-start-over path.
  function requestBuild() {
    if (store?.niche) {
      setConfirmRebuild(true)
    } else {
      doBuild()
    }
  }

  async function doBuild() {
    setConfirmRebuild(false)
    if (!store?.id || !plan) return
    setError(null)
    setStage('queuing')
    try {
      const res = await fetch(`${API_BASE}/api/store-provision/build-catalog`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: store.id,
          niche: plan.niche,
          categories: plan.categories,
          allKeywords: plan.allKeywords,
          maxKeywords: 100,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not start the build')
      if (!data.success) throw new Error(data.error || 'Could not start the build')
      setStage('building')
      setProductCount(0)
      setRecentImages([])
    } catch (err) {
      setError(err.message)
      setStage('plan-ready')
    }
  }

  // Poll build status while building. Stops once all keywords processed.
  useEffect(() => {
    if (stage !== 'building') return
    if (!store?.id) return

    async function tick() {
      try {
        const res = await fetch(`${API_BASE}/api/store-provision/build-status?storeId=${store.id}`)
        if (!res.ok) return
        const data = await res.json()
        setProgress(data.progress || null)
        setProductCount(data.productsInShop ?? data.progress?.productsFound ?? 0)
        if (Array.isArray(data.recentProducts)) {
          setRecentImages(
            data.recentProducts
              .filter(p => p?.image)
              .slice(0, 8)
              .map(p => ({ image: p.image, title: p.title, price: p.sale_price }))
          )
        }
        // Transition to complete once every queued keyword is processed
        // AND at least one product actually landed (otherwise we'd
        // "complete" on an empty-queue race).
        const total = data.progress?.total || 0
        const processed = (data.progress?.done || 0) + (data.progress?.failed || 0)
        if (total > 0 && processed >= total) {
          setStage('complete')
        }
      } catch { /* swallow; keep polling */ }
    }

    tick()
    pollRef.current = setInterval(tick, 3000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [stage, store?.id])

  // ─── Render ──────────────────────────────────────────────────────

  if (storeLoading) {
    return (
      <div className="mx-auto max-w-5xl p-8 flex items-center gap-3 text-zinc-400 text-[16px]">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading your shop…
      </div>
    )
  }

  if (!store) {
    return (
      <div className="mx-auto max-w-3xl p-8 text-center">
        <Store className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
        <div className="text-[20px] font-semibold text-white mb-2">No shop found</div>
        <p className="text-[16px] text-zinc-400 mb-6">You need a shop set up before AI can fill it.</p>
      </div>
    )
  }

  const storefrontUrl = `https://${store.subdomain}.togogo.me`

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-8 text-[16px]">
      {stage === 'idle' && (
        <Link
          to="/my-shop/add-products"
          className="inline-flex items-center gap-2 text-[16px] text-zinc-400 hover:text-white mb-6 min-h-[44px]"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden /> Back
        </Link>
      )}

      {/* STAGE: idle — niche input */}
      {stage === 'idle' && (
        <section>
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FF6B35]/15">
              <Sparkles className="h-6 w-6 text-[#FF6B35]" aria-hidden />
            </div>
            <div>
              <h1 className="text-[28px] md:text-[32px] font-bold text-white leading-tight">Build your shop with AI</h1>
              <p className="text-[16px] text-zinc-400 mt-1">Tell us what you'd like to sell.</p>
            </div>
          </div>

          <label className="block mb-2">
            <span className="block text-[15px] font-medium text-zinc-300 mb-2">What do you want to sell?</span>
            <textarea
              value={niche}
              onChange={e => setNiche(e.target.value)}
              placeholder="e.g. ladies fashion — shoes, handbags, jewellery and accessories"
              maxLength={300}
              rows={3}
              className="w-full rounded-xl border border-white/[0.08] bg-[#0a0a0a] px-4 py-3 text-[18px] text-white focus:border-[#FF6B35] focus:outline-none resize-y min-h-[112px]"
              // Cmd/Ctrl + Enter submits so the single-line-habit users
              // still have a keyboard shortcut, without trapping people
              // who want to type multi-line descriptions.
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGeneratePlan()
              }}
            />
          </label>
          <p className="text-[14px] text-zinc-500 mb-6">
            The more specific, the better — tell us exactly what you want to sell. {niche.length}/300
          </p>

          <div className="mb-6">
            <div className="text-[14px] text-zinc-500 mb-2">Or pick an idea:</div>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_NICHES.map(n => (
                <button
                  key={n}
                  onClick={() => setNiche(n)}
                  className="rounded-full border border-white/[0.08] px-3 py-2 text-[14px] text-zinc-300 hover:bg-white/[0.06] hover:border-white/[0.18] min-h-[40px]"
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {error && <ErrorBanner message={error} />}

          <button
            onClick={handleGeneratePlan}
            disabled={!niche.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-[#FF6B35] px-6 py-4 text-[18px] font-semibold text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed min-h-[56px]"
          >
            <Wand2 className="h-5 w-5" aria-hidden />
            Design my shop
          </button>
        </section>
      )}

      {/* STAGE: planning */}
      {stage === 'planning' && (
        <StageCard
          icon={Wand2}
          title="Claude is designing your shop…"
          subtitle="Picking categories and products just for your niche. Usually takes 15-30 seconds."
        />
      )}

      {/* STAGE: plan-ready — review + confirm */}
      {stage === 'plan-ready' && plan && (
        <section>
          <div className="mb-6">
            <h1 className="text-[26px] md:text-[30px] font-bold text-white mb-1">Here's your plan</h1>
            <p className="text-[16px] text-zinc-400">
              Claude found <strong className="text-white">{plan.keywordCount || plan.allKeywords.length}</strong>{' '}
              product ideas across <strong className="text-white">{plan.categoryCount || Object.keys(plan.categories || {}).length}</strong> categories.
              We'll use the top 100 for a focused build.
            </p>
          </div>

          <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-1">
            {Object.entries(plan.categories || {}).map(([cat, kws]) => (
              <div key={cat} className="rounded-xl border border-white/[0.06] bg-[#111] p-4">
                <div className="text-[15px] font-semibold text-white mb-1">{cat}</div>
                <div className="text-[13px] text-zinc-400 line-clamp-2">
                  {Array.isArray(kws) ? kws.slice(0, 4).join(', ') : ''}
                  {Array.isArray(kws) && kws.length > 4 && ` +${kws.length - 4} more`}
                </div>
              </div>
            ))}
          </div>

          {error && <ErrorBanner message={error} />}

          <div className="flex flex-wrap gap-3">
            <button
              onClick={requestBuild}
              className="inline-flex items-center gap-2 rounded-xl bg-[#FF6B35] px-6 py-4 text-[18px] font-semibold text-white hover:opacity-90 min-h-[56px]"
            >
              <Rocket className="h-5 w-5" aria-hidden />
              Build my shop!
            </button>
            <button
              onClick={() => { setStage('idle'); setPlan(null) }}
              className="inline-flex items-center gap-2 rounded-xl border border-white/[0.12] px-5 py-3 text-[16px] font-semibold text-white hover:bg-white/[0.06] min-h-[48px]"
            >
              Try a different niche
            </button>
          </div>
        </section>
      )}

      {/* STAGE: queuing — brief */}
      {stage === 'queuing' && (
        <StageCard
          icon={Rocket}
          title="Getting ready…"
          subtitle="Lining up the shelves for your new products."
        />
      )}

      {/* STAGE: building — THE SHOW */}
      {stage === 'building' && (
        <BuildingView
          progress={progress}
          productCount={productCount}
          recentImages={recentImages}
        />
      )}

      {/* STAGE: complete — celebration */}
      {stage === 'complete' && (
        <section className="text-center py-8">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-500/15">
            <CheckCircle2 className="h-12 w-12 text-emerald-400" aria-hidden />
          </div>
          <h1 className="text-[30px] md:text-[36px] font-bold text-white mb-2">Your shop is ready! 🎉</h1>
          <p className="text-[18px] text-zinc-400 mb-8">
            We added <strong className="text-white">{productCount}</strong> products to your shop.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <a
              href={storefrontUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-[#FF6B35] px-6 py-4 text-[17px] font-semibold text-white hover:opacity-90 min-h-[56px]"
            >
              <Store className="h-5 w-5" aria-hidden />
              See my shop
              <ExternalLink className="h-4 w-4" aria-hidden />
            </a>
            <button
              onClick={() => navigate('/my-shop')}
              className="inline-flex items-center gap-2 rounded-xl border border-white/[0.12] px-5 py-3 text-[16px] font-semibold text-white hover:bg-white/[0.06] min-h-[48px]"
            >
              Back to home
            </button>
          </div>
        </section>
      )}

      {/* Add-more confirmation modal */}
      {confirmRebuild && (
        <ConfirmModal
          title="Add more products to your shop?"
          body={`We'll add fresh products for "${plan?.niche}" on top of your current catalogue. Existing products, orders, and earnings stay exactly as they are.`}
          confirmLabel="Yes, add more"
          cancelLabel="Cancel"
          onConfirm={doBuild}
          onCancel={() => setConfirmRebuild(false)}
        />
      )}
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────

function StageCard({ icon: Icon, title, subtitle }) {
  return (
    <section className="rounded-2xl border border-white/[0.06] bg-[#111] p-8 md:p-12 text-center">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FF6B35]/15">
        <Icon className="h-8 w-8 text-[#FF6B35] animate-pulse" aria-hidden />
      </div>
      <h2 className="text-[24px] md:text-[28px] font-bold text-white mb-2">{title}</h2>
      <p className="text-[16px] text-zinc-400 max-w-md mx-auto">{subtitle}</p>
    </section>
  )
}

function BuildingView({ progress, productCount, recentImages }) {
  const done = progress?.done || 0
  const total = progress?.total || 0
  const percent = total > 0 ? Math.round((done / total) * 100) : 0
  return (
    <section>
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FF6B35]/15">
          <Search className="h-8 w-8 text-[#FF6B35] animate-pulse" aria-hidden />
        </div>
        <h2 className="text-[24px] md:text-[28px] font-bold text-white mb-1">Finding great products for you…</h2>
        <p className="text-[15px] text-zinc-400">This usually takes 10-20 minutes. You can leave this page open or come back later.</p>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-[14px] text-zinc-400 mb-2">
          <span>{done} of {total} searches done</span>
          <span className="tabular-nums">{percent}%</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-[#FF6B35] transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* Big counter */}
      <div className="mb-6 rounded-2xl bg-[#FF6B35]/[0.05] border border-[#FF6B35]/20 p-6 text-center">
        <div className="text-[14px] uppercase tracking-wider text-[#FF6B35]/80 mb-1">Products landed in your shop</div>
        <div className="text-[48px] md:text-[56px] font-bold text-[#FF6B35] tabular-nums leading-none">{productCount}</div>
      </div>

      {/* Tease reel */}
      {recentImages.length > 0 && (
        <div>
          <div className="text-[14px] font-semibold text-zinc-300 mb-3">Just landed in your shop</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {recentImages.map((p, i) => (
              <div key={i} className="rounded-xl border border-white/[0.06] bg-[#111] overflow-hidden">
                <div className="aspect-square bg-black/40 overflow-hidden">
                  <img src={p.image} alt="" className="w-full h-full object-cover" />
                </div>
                {p.title && (
                  <div className="p-2">
                    <p className="text-[11px] text-zinc-300 line-clamp-2 leading-tight">{p.title}</p>
                    {p.price != null && (
                      <p className="mt-1 text-xs font-bold text-[#FF6B35]">US ${parseFloat(p.price).toFixed(2)}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

function ConfirmModal({ title, body, confirmLabel, cancelLabel, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#111] p-6 text-[16px]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-3">
          <h2 className="text-[20px] font-bold text-white">{title}</h2>
          <button onClick={onCancel} aria-label="Close" className="text-zinc-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-[16px] text-zinc-300 mb-6 leading-relaxed">{body}</p>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-xl border border-white/[0.12] px-5 py-3 text-[15px] font-semibold text-white hover:bg-white/[0.06] min-h-[48px]"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="rounded-xl bg-[#FF6B35] px-5 py-3 text-[15px] font-semibold text-white hover:opacity-90 min-h-[48px]"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function ErrorBanner({ message }) {
  return (
    <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/[0.08] p-3 flex items-start gap-2">
      <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" aria-hidden />
      <div className="text-[15px] text-red-200">{message}</div>
    </div>
  )
}
