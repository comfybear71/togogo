import { useState, useEffect, useRef } from 'react'
import { Sparkles, Wand2, ShoppingBag, Loader2, Check, AlertTriangle, Rocket, Search, Package } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || ''

function getAuthHeaders() {
  const token = localStorage.getItem('togogo-token')
  if (token) return { Authorization: `Bearer ${token}` }
  const secret = sessionStorage.getItem('togogo-setup-secret')
  if (secret) return { 'x-setup-secret': secret }
  return {}
}

const SUGGESTED_NICHES = [
  'fishing equipment', 'ladies fashion', 'kitchen gadgets', 'beauty & makeup',
  'pet supplies', 'home decor', 'fitness gear', 'baby & kids', 'phone accessories',
  'jewellery', 'gardening tools', 'camping & outdoors',
]

const STAGES = [
  { key: 'idle', label: 'Ready to begin' },
  { key: 'planning', label: 'Consulting AI strategist…' },
  { key: 'plan-ready', label: 'Plan ready!' },
  { key: 'queuing', label: 'Queuing the build…' },
  { key: 'building', label: 'Scanning 50M AliExpress products…' },
  { key: 'curating', label: 'Curating your collection…' },
  { key: 'complete', label: 'Your shop is ready!' },
]

export default function StoreBuilderPage() {
  // Store selector
  const [stores, setStores] = useState([])
  const [storeId, setStoreId] = useState('')

  // Niche input
  const [niche, setNiche] = useState('')

  // Workflow state
  const [stage, setStage] = useState('idle')
  const [error, setError] = useState(null)

  // Plan from Claude
  const [plan, setPlan] = useState(null)
  const [planLoading, setPlanLoading] = useState(false)

  // Build progress
  const [progress, setProgress] = useState(null)
  const [productCount, setProductCount] = useState(0)
  const [recentImages, setRecentImages] = useState([])
  const [confettiOn, setConfettiOn] = useState(false)
  const pollTimerRef = useRef(null)

  // Load admin's stores
  useEffect(() => {
    fetch(`${API_BASE}/api/admin/stores`, { headers: getAuthHeaders() })
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const list = Array.isArray(data) ? data : (data?.stores || [])
        setStores(list)
        if (list.length > 0) setStoreId(list[0].id)
      })
      .catch(() => {})
  }, [])

  async function handleGeneratePlan() {
    if (!niche.trim()) return setError('Type a niche first')
    setError(null)
    setPlan(null)
    setStage('planning')
    setPlanLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/store-provision/niche-plan`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Plan generation failed')
      setPlan(data)
      setStage('plan-ready')
    } catch (err) {
      setError(err.message)
      setStage('idle')
    } finally {
      setPlanLoading(false)
    }
  }

  async function handleBuild() {
    if (!storeId) return setError('Pick a store first')
    if (!plan) return
    setError(null)
    setStage('queuing')
    try {
      const res = await fetch(`${API_BASE}/api/store-provision/build-catalog`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId,
          niche: plan.niche,
          categories: plan.categories,
          allKeywords: plan.allKeywords,
          maxKeywords: 100,
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Queue failed')
      setStage('building')
    } catch (err) {
      setError(err.message)
      setStage('plan-ready')
    }
  }

  // Poll build status while building
  useEffect(() => {
    if (stage !== 'building' && stage !== 'curating') return
    if (!storeId) return

    async function poll() {
      try {
        const res = await fetch(`${API_BASE}/api/store-provision/build-status?storeId=${storeId}`)
        const data = await res.json()
        setProgress(data.progress)
        // Roll up the counter smoothly
        setProductCount(data.progress.productsFound || 0)
        if (data.recentProducts?.length) {
          setRecentImages(data.recentProducts.filter(p => p.image).slice(0, 8))
        }
        // Stage transitions: building -> curating -> complete
        if (data.status === 'complete') {
          setStage('complete')
          setConfettiOn(true)
          setTimeout(() => setConfettiOn(false), 8000)
        } else if (data.progress.percent >= 70 && stage === 'building') {
          setStage('curating')
        }
      } catch { /* keep polling */ }
    }

    poll()
    pollTimerRef.current = setInterval(poll, 3000)
    return () => clearInterval(pollTimerRef.current)
  }, [stage, storeId])

  function handleReset() {
    setStage('idle')
    setPlan(null)
    setProgress(null)
    setProductCount(0)
    setRecentImages([])
    setConfettiOn(false)
    setError(null)
  }

  const currentStage = STAGES.find(s => s.key === stage) || STAGES[0]
  const percent = progress?.percent || 0

  return (
    <div className="space-y-6 relative">
      {confettiOn && <Confetti />}

      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Wand2 className="h-6 w-6 text-[#FF6B35]" /> AI Store Builder
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Give us a niche. Claude builds a catalogue. AliExpress fills it. The shop opens itself.
        </p>
      </div>

      {/* Store selector */}
      <div className="rounded-lg border border-white/[0.06] bg-[#0a0a0a] p-4">
        <label className="block text-xs font-medium text-zinc-400 mb-2">Build for store</label>
        <select
          value={storeId}
          onChange={e => setStoreId(e.target.value)}
          className="w-full rounded-md border border-white/[0.08] bg-black px-3 py-2 text-sm text-white focus:border-[#FF6B35] focus:outline-none"
          disabled={stage === 'building' || stage === 'curating'}
        >
          {stores.length === 0 && <option value="">Loading stores…</option>}
          {stores.map(s => (
            <option key={s.id} value={s.id}>
              {s.subdomain}.togogo.me — {s.store_name || s.subdomain}
            </option>
          ))}
        </select>
      </div>

      {/* Step 1: Niche input */}
      {stage === 'idle' && (
        <div className="rounded-lg border border-white/[0.06] bg-gradient-to-br from-[#0a0a0a] to-[#0f0710] p-8 text-center">
          <Sparkles className="mx-auto h-10 w-10 text-[#FF6B35] mb-3" />
          <h2 className="text-2xl font-bold text-white mb-2">What's your shop selling?</h2>
          <p className="text-sm text-zinc-500 mb-6">Describe the niche in a few words — the more specific, the better the catalogue</p>
          <input
            type="text"
            value={niche}
            onChange={e => setNiche(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleGeneratePlan() }}
            placeholder="e.g. fishing equipment"
            className="w-full max-w-lg mx-auto block rounded-xl border border-white/[0.08] bg-black px-5 py-4 text-base text-white text-center focus:border-[#FF6B35] focus:outline-none"
          />
          <div className="flex flex-wrap gap-2 justify-center mt-4 max-w-xl mx-auto">
            {SUGGESTED_NICHES.map(s => (
              <button
                key={s}
                onClick={() => setNiche(s)}
                className="rounded-full px-3 py-1 text-xs text-zinc-400 border border-white/[0.08] hover:bg-white/[0.04] hover:text-white transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
          <button
            onClick={handleGeneratePlan}
            disabled={!niche.trim() || !storeId}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#FF6B35] to-pink-500 px-6 py-3 text-sm font-bold text-white hover:from-[#FF6B35]/90 hover:to-pink-500/90 disabled:opacity-50"
          >
            <Wand2 className="h-4 w-4" /> Generate my catalogue
          </button>
        </div>
      )}

      {/* Step 2: Planning */}
      {stage === 'planning' && (
        <div className="rounded-lg border border-white/[0.06] bg-[#0a0a0a] p-12 text-center">
          <div className="relative mx-auto h-16 w-16 mb-4">
            <Loader2 className="h-16 w-16 animate-spin text-[#FF6B35]" />
            <Sparkles className="absolute inset-0 m-auto h-6 w-6 text-pink-400 animate-pulse" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Consulting AI strategist…</h2>
          <p className="text-sm text-zinc-500">Claude is designing the perfect catalogue for "<span className="text-white">{niche}</span>"</p>
          <p className="text-xs text-zinc-600 mt-2">This usually takes 15–30 seconds</p>
        </div>
      )}

      {/* Step 3: Plan preview */}
      {stage === 'plan-ready' && plan && (
        <div className="space-y-4">
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 flex items-start gap-3">
            <Check className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-white">Plan ready — {plan.keywordCount} keywords across {plan.categoryCount} categories</p>
              <p className="text-xs text-zinc-500 mt-0.5">We'll cap at the top 100 keywords for a focused, fast build.</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(plan.categories).map(([cat, items]) => (
              <div key={cat} className="rounded-lg border border-white/[0.06] bg-[#0a0a0a] p-3">
                <h3 className="text-sm font-bold text-white mb-1">{cat}</h3>
                <p className="text-xs text-zinc-500">{items.length} keywords</p>
                <p className="text-xs text-zinc-600 mt-1 line-clamp-2">{items.slice(0, 4).join(', ')}{items.length > 4 ? '…' : ''}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="rounded-xl border border-white/[0.08] px-5 py-3 text-sm font-medium text-zinc-300 hover:bg-white/[0.04]"
            >
              Try a different niche
            </button>
            <button
              onClick={handleBuild}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#FF6B35] to-pink-500 px-6 py-3 text-sm font-bold text-white hover:from-[#FF6B35]/90 hover:to-pink-500/90"
            >
              <Rocket className="h-4 w-4" /> Build my store!
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Building */}
      {(stage === 'queuing' || stage === 'building' || stage === 'curating') && (
        <div className="space-y-4">
          <div className="rounded-lg border border-white/[0.06] bg-gradient-to-br from-[#0a0a0a] to-[#0f0710] p-8 text-center">
            <div className="relative mx-auto h-16 w-16 mb-4">
              <div className="absolute inset-0 rounded-full border-2 border-[#FF6B35] border-t-transparent animate-spin"></div>
              <Search className="absolute inset-0 m-auto h-7 w-7 text-pink-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-1">{currentStage.label}</h2>
            <p className="text-sm text-zinc-500 mb-4">
              {progress?.done || 0} of {progress?.total || 0} keywords searched
            </p>
            {/* Progress bar with shimmer */}
            <div className="relative h-3 max-w-lg mx-auto bg-white/[0.04] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#FF6B35] via-pink-500 to-purple-500 transition-all duration-500"
                style={{ width: `${percent}%` }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
            </div>
            <p className="mt-4 text-3xl font-bold text-white tabular-nums">
              {productCount.toLocaleString()}
              <span className="text-sm font-normal text-zinc-500 ml-2">products discovered</span>
            </p>
          </div>

          {/* Recent product reveal */}
          {recentImages.length > 0 && (
            <div>
              <p className="text-xs text-zinc-500 mb-2 text-center">Latest finds</p>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {recentImages.map((p, i) => (
                  <div
                    key={p.supplier_product_id || i}
                    className="aspect-square rounded-lg overflow-hidden bg-white/[0.04] animate-fadein"
                  >
                    {p.image && <img src={p.image} alt="" className="w-full h-full object-cover" />}
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-center text-xs text-zinc-500">
            ⚡ The cron processes 5 keywords every minute. You can leave this page and come back — the build keeps running.
          </p>
        </div>
      )}

      {/* Step 5: Complete */}
      {stage === 'complete' && (
        <div className="rounded-lg border border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-[#FF6B35]/5 p-8 text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
            <ShoppingBag className="h-8 w-8 text-emerald-400" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">Your shop is open! 🎉</h2>
          <p className="text-sm text-zinc-300 mb-6">
            <span className="text-3xl font-bold text-emerald-400">{productCount.toLocaleString()}</span> products discovered across {progress?.done || 0} searches
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleReset}
              className="rounded-xl border border-white/[0.08] px-5 py-3 text-sm font-medium text-zinc-300 hover:bg-white/[0.04]"
            >
              Build another
            </button>
            <a
              href={`https://${stores.find(s => s.id === storeId)?.subdomain}.togogo.me`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#FF6B35] to-pink-500 px-6 py-3 text-sm font-bold text-white"
            >
              <Rocket className="h-4 w-4" /> Visit my shop
            </a>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-300">{error}</p>
        </div>
      )}

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer { animation: shimmer 2s infinite; }
        @keyframes fadein {
          from { opacity: 0; transform: scale(0.85); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadein { animation: fadein 0.4s ease-out; }
      `}</style>
    </div>
  )
}

// Lightweight CSS-only confetti — no external dependency
function Confetti() {
  const pieces = Array.from({ length: 60 })
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {pieces.map((_, i) => {
        const left = Math.random() * 100
        const delay = Math.random() * 2
        const duration = 3 + Math.random() * 2
        const colors = ['#FF6B35', '#06D6A0', '#FFD23F', '#EC4899', '#8B5CF6', '#3B82F6']
        const color = colors[i % colors.length]
        return (
          <span
            key={i}
            style={{
              position: 'absolute',
              left: `${left}%`,
              top: '-20px',
              width: 8,
              height: 12,
              background: color,
              transform: `rotate(${Math.random() * 360}deg)`,
              animation: `fall ${duration}s ${delay}s linear forwards`,
            }}
          />
        )
      })}
      <style>{`
        @keyframes fall {
          to { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
