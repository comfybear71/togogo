import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Store, ExternalLink, Check, Copy, Palette, DollarSign,
  Package, Loader2, AlertCircle,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { STOREFRONT_THEMES } from '../../lib/storefrontThemes'

const API_BASE = import.meta.env.VITE_API_URL || ''

// Phase 2 My Store page — the store owner controls their name, markup,
// and theme from here. Scoped to the caller's own store via the auth
// token; backend ownership guard is /api/my-shop/store PATCH.

export default function MyStorePage() {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const authLoading = useAuthStore(s => s.loading)
  // authStore only persists `profile` — token lives in localStorage. Read
  // it here so the bearer header is actually populated on fetch.
  const token = typeof window !== 'undefined' ? localStorage.getItem('togogo-token') : null

  const [store, setStore] = useState(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)

  // Kick auth init on cold start
  useEffect(() => {
    if (authLoading) useAuthStore.getState().initialize?.()
  }, [])

  // Wait for auth to be ready before fetching — otherwise the bearer
  // token is undefined on first render and every /api/my-shop/* call
  // returns 401.
  useEffect(() => {
    if (authLoading) return
    if (!user || !token) { navigate('/auth?redirect=/my-shop/store'); return }
    load()
  }, [user, token, authLoading])

  async function load() {
    setLoading(true)
    setErr(null)
    try {
      const [storeRes, productsRes] = await Promise.all([
        fetch(`${API_BASE}/api/my-shop/store`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/my-shop/products`, { headers: { Authorization: `Bearer ${token}` } }),
      ])
      if (storeRes.ok) {
        const data = await storeRes.json()
        setStore(data.store || null)
      }
      if (productsRes.ok) {
        const data = await productsRes.json()
        setProducts(data.products || [])
      }
    } catch (e) {
      setErr('Could not load your store. Please refresh the page.')
    } finally {
      setLoading(false)
    }
  }

  async function patchStore(patch) {
    const res = await fetch(`${API_BASE}/api/my-shop/store`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || `HTTP ${res.status}`)
    }
    const data = await res.json()
    setStore(data.store || store)
    return data.store
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl p-8 text-[16px] flex items-center gap-3 text-zinc-400">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading your store…
      </div>
    )
  }

  if (err) {
    return (
      <div className="mx-auto max-w-3xl p-4 md:p-8 text-[16px]">
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

  if (!store) {
    return (
      <div className="mx-auto max-w-3xl p-8 text-center">
        <Store className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
        <div className="text-[20px] font-semibold text-white mb-2">You don't have a store yet</div>
        <p className="text-[16px] text-zinc-400 mb-6">Contact support to get your store set up.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl p-4 md:p-8 text-[16px]">
      <header className="mb-8">
        <h1 className="text-[28px] md:text-[32px] font-bold text-white mb-1">My Store</h1>
        <p className="text-[16px] text-zinc-400">Your shop's details, pricing, and look.</p>
      </header>

      <StoreDetailsCard store={store} onSave={patchStore} />
      <MarkupCard store={store} onSave={patchStore} />
      <ThemeCard store={store} onSave={patchStore} />
      <ProductsCard products={products} />
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────

function Card({ icon: Icon, title, children }) {
  return (
    <section className="mb-5 rounded-2xl border border-white/[0.06] bg-[#111] p-6">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="h-5 w-5 text-[#FF6B35]" aria-hidden />
        <h2 className="text-[20px] font-semibold text-white">{title}</h2>
      </div>
      {children}
    </section>
  )
}

function SaveButton({ saving, saved, disabled, onClick, children = 'Save' }) {
  return (
    <button
      onClick={onClick}
      disabled={saving || disabled}
      className="inline-flex items-center gap-2 rounded-xl bg-[#FF6B35] px-5 py-3 text-[16px] font-semibold text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]"
    >
      {saving && <Loader2 className="h-4 w-4 animate-spin" />}
      {saved && !saving && <Check className="h-4 w-4" />}
      {saved && !saving ? 'Saved' : children}
    </button>
  )
}

function StoreDetailsCard({ store, onSave }) {
  const [name, setName] = useState(store.store_name || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const storefrontUrl = `https://${store.subdomain}.togogo.me`
  const dirty = name.trim() !== (store.store_name || '').trim() && name.trim().length > 0

  async function save() {
    setSaving(true); setSaved(false)
    try {
      await onSave({ store_name: name.trim() })
      setSaved(true); setTimeout(() => setSaved(false), 2000)
    } catch { /* error surfaces via page-level banner */ }
    finally { setSaving(false) }
  }

  async function copy() {
    try { await navigator.clipboard.writeText(storefrontUrl); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* */ }
  }

  return (
    <Card icon={Store} title="Store details">
      <label className="block mb-4">
        <span className="block text-[14px] font-medium text-zinc-400 mb-2">Store name</span>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={100}
          className="w-full rounded-xl border border-white/[0.08] bg-[#0a0a0a] px-4 py-3 text-[17px] text-white focus:border-[#FF6B35] focus:outline-none"
          placeholder="e.g. Annie's Pet Emporium"
        />
      </label>

      <label className="block mb-5">
        <span className="block text-[14px] font-medium text-zinc-400 mb-2">Your shop link</span>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={storefrontUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[17px] text-[#FF6B35] hover:underline"
          >
            {store.subdomain}.togogo.me
            <ExternalLink className="h-4 w-4" aria-hidden />
          </a>
          <button
            onClick={copy}
            className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] px-3 py-2 text-[14px] text-zinc-300 hover:bg-white/[0.06] min-h-[40px]"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </label>

      <SaveButton saving={saving} saved={saved} disabled={!dirty} onClick={save} />
    </Card>
  )
}

function MarkupCard({ store, onSave }) {
  const current = parseFloat(store.markup_percent ?? 40) || 0
  const [value, setValue] = useState(String(current.toFixed(2)))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const parsed = parseFloat(value)
  const valid = Number.isFinite(parsed) && parsed >= 0 && parsed <= 500
  const dirty = valid && Math.abs(parsed - current) >= 0.01

  async function save() {
    if (!valid) return
    setSaving(true); setSaved(false)
    try {
      await onSave({ markup_percent: parsed })
      setSaved(true); setTimeout(() => setSaved(false), 2000)
    } catch { /* */ }
    finally { setSaving(false) }
  }

  // Live preview of what $10 at break-even becomes with this markup.
  const previewSell = valid ? (10 * (1 + parsed / 100)).toFixed(2) : '—'

  return (
    <Card icon={DollarSign} title="Your markup">
      <p className="text-[15px] text-zinc-400 mb-4">
        This is how much extra you charge customers on top of our cost. Higher markup = more profit per sale.
      </p>
      <label className="block mb-4">
        <span className="block text-[14px] font-medium text-zinc-400 mb-2">Markup percent</span>
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="decimal"
            min="0"
            max="500"
            step="0.5"
            value={value}
            onChange={e => setValue(e.target.value)}
            className="w-32 rounded-xl border border-white/[0.08] bg-[#0a0a0a] px-4 py-3 text-[20px] font-semibold text-white focus:border-[#FF6B35] focus:outline-none"
          />
          <span className="text-[20px] text-zinc-400">%</span>
        </div>
      </label>

      <div className="mb-5 rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
        <div className="text-[14px] text-zinc-400 mb-1">Example</div>
        <div className="text-[17px] text-zinc-200">
          A product that costs us <strong className="text-white">$10.00</strong> would sell in your store for{' '}
          <strong className="text-[#FF6B35]">${previewSell}</strong>.
        </div>
      </div>

      <SaveButton saving={saving} saved={saved} disabled={!dirty} onClick={save} />
    </Card>
  )
}

function ThemeCard({ store, onSave }) {
  const [picking, setPicking] = useState(false)
  const currentId = store.theme_id || 'sunset'
  const current = STOREFRONT_THEMES.find(t => t.id === currentId) || STOREFRONT_THEMES[0]
  const [saving, setSaving] = useState(null) // id being saved

  async function pick(id) {
    setSaving(id)
    try {
      await onSave({ theme_id: id })
      setPicking(false)
    } finally {
      setSaving(null)
    }
  }

  return (
    <Card icon={Palette} title="Your theme">
      <p className="text-[15px] text-zinc-400 mb-4">
        How your shop looks to customers. You can change this any time.
      </p>

      <div className="flex items-center gap-4 mb-4">
        <ThemeSwatch theme={current} />
        <div>
          <div className="text-[18px] font-semibold text-white">{current.name}</div>
          <button
            onClick={() => setPicking(v => !v)}
            className="text-[15px] text-[#FF6B35] hover:underline"
          >
            {picking ? 'Close' : 'Change theme'}
          </button>
        </div>
      </div>

      {picking && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {STOREFRONT_THEMES.map(t => {
            const isCurrent = t.id === currentId
            const isSaving = saving === t.id
            return (
              <button
                key={t.id}
                onClick={() => !isCurrent && pick(t.id)}
                disabled={isCurrent || isSaving}
                className={`flex items-center gap-3 rounded-xl border p-3 text-left min-h-[64px] ` +
                  (isCurrent
                    ? 'border-[#FF6B35] bg-[#FF6B35]/10 cursor-default'
                    : 'border-white/[0.08] hover:bg-white/[0.04]')}
              >
                <ThemeSwatch theme={t} />
                <div className="flex-1 min-w-0">
                  <div className="text-[16px] font-semibold text-white">{t.name}</div>
                  <div className="text-[13px] text-zinc-400">
                    {isCurrent ? 'Currently active' : isSaving ? 'Saving…' : 'Click to apply'}
                  </div>
                </div>
                {isSaving && <Loader2 className="h-5 w-5 animate-spin text-[#FF6B35]" />}
                {isCurrent && <Check className="h-5 w-5 text-[#FF6B35]" />}
              </button>
            )
          })}
        </div>
      )}
    </Card>
  )
}

function ThemeSwatch({ theme }) {
  const { bg, accent, card } = theme.preview || { bg: '#111', accent: '#FF6B35', card: '#222' }
  return (
    <div
      aria-hidden
      className="relative h-12 w-16 rounded-lg overflow-hidden border border-white/[0.08]"
      style={{ backgroundColor: bg }}
    >
      <div className="absolute inset-2 rounded" style={{ backgroundColor: card }} />
      <div className="absolute bottom-1 left-1 right-1 h-1.5 rounded-full" style={{ backgroundColor: accent }} />
    </div>
  )
}

function ProductsCard({ products }) {
  const count = products.length
  return (
    <Card icon={Package} title="Your products">
      <div className="flex items-center justify-between mb-4">
        <div className="text-[17px] text-zinc-300">
          You have <strong className="text-white">{count}</strong> product{count === 1 ? '' : 's'}.
        </div>
        <Link
          to="/browse"
          className="inline-flex items-center gap-2 rounded-xl border border-white/[0.12] px-4 py-2 text-[15px] font-semibold text-white hover:bg-white/[0.06] min-h-[44px]"
        >
          Browse more
        </Link>
      </div>

      {count === 0 ? (
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-6 text-center">
          <div className="text-[16px] text-zinc-400">No products added yet.</div>
        </div>
      ) : (
        <ul className="divide-y divide-white/[0.04]">
          {products.slice(0, 12).map(p => (
            <li key={p.id} className="flex items-center gap-3 py-3">
              {p.image && (
                <img src={p.image} alt="" className="h-12 w-12 rounded-lg object-cover flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-[16px] text-white truncate">{p.title}</div>
                <div className="text-[14px] text-zinc-500">US ${parseFloat(p.sale_price || 0).toFixed(2)}</div>
              </div>
            </li>
          ))}
          {count > 12 && (
            <li className="py-3 text-[14px] text-zinc-500 text-center">
              +{count - 12} more
            </li>
          )}
        </ul>
      )}
    </Card>
  )
}
