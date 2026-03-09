import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Rocket, Globe, Store, Shield, Zap, Check, X, AlertCircle,
  Loader2, ArrowRight, ExternalLink, Sparkles, ShoppingCart,
  Server, CreditCard, Link2, Paintbrush, Package, Lock,
  Settings, ChevronRight, Crown, RefreshCw
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'

const API_BASE = import.meta.env.VITE_API_URL || ''

// ============================================
// STEP ICONS — mapped by provision step ID
// ============================================
const STEP_ICONS = {
  validate: Settings,
  subdomain: Globe,
  dns: Server,
  ssl: Lock,
  wordpress: Store,
  woocommerce: ShoppingCart,
  theme: Paintbrush,
  products: Package,
  payments: CreditCard,
  connect: Link2,
  finalize: Sparkles,
}

// ============================================
// PROVISION MONITOR COMPONENT
// ============================================
function ProvisionMonitor({ steps, currentStep, status, storeName, storeUrl }) {
  const completedCount = steps.filter(s => s.status === 'completed').length
  const progress = steps.length > 0 ? (completedCount / steps.length) * 100 : 0
  const isComplete = status === 'completed' || progress === 100

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        {isComplete ? (
          <>
            <div className="relative mx-auto mb-4 w-16 h-16">
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
                <Check className="h-8 w-8 text-emerald-400" />
              </div>
            </div>
            <h2 className="text-2xl font-heading font-bold text-white mb-1">
              {storeName ? `${storeName} is live!` : 'Your store is live!'}
            </h2>
            <p className="text-xs text-emerald-400 font-medium">{storeUrl}</p>
          </>
        ) : (
          <>
            <div className="relative mx-auto mb-4 w-16 h-16">
              <div className="absolute inset-0 rounded-full border-2 border-[#FF6B35]/20" />
              <svg className="absolute inset-0 w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="28" fill="none" stroke="#FF6B35" strokeWidth="3"
                  strokeDasharray={`${progress * 1.76} 176`} strokeLinecap="round"
                  className="transition-all duration-700 ease-out" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold text-white">{Math.round(progress)}%</span>
              </div>
            </div>
            <h2 className="text-xl font-heading font-bold text-white mb-1">
              Setting up your store
            </h2>
            <p className="text-xs text-zinc-500">This takes about 30 seconds...</p>
          </>
        )}
      </div>

      {/* Overall progress bar */}
      <div className="mb-6">
        <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${
              isComplete ? 'bg-emerald-500' : 'bg-gradient-to-r from-[#FF6B35] to-[#FFD23F]'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-[10px] text-zinc-600">
            Step {Math.min(completedCount + 1, steps.length)} of {steps.length}
          </span>
          <span className="text-[10px] text-zinc-600">
            {completedCount}/{steps.length} complete
          </span>
        </div>
      </div>

      {/* Steps list */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#0a0a0a] overflow-hidden">
        {steps.map((step, i) => {
          const Icon = STEP_ICONS[step.id] || Settings
          const isActive = step.status === 'in_progress'
          const isDone = step.status === 'completed'

          return (
            <div
              key={step.id}
              className={`flex items-center gap-3 px-4 py-3 transition-all duration-500 ${
                i > 0 ? 'border-t border-white/[0.04]' : ''
              } ${isActive ? 'bg-[#FF6B35]/5' : isDone ? 'bg-emerald-500/[0.03]' : ''}`}
            >
              {/* Status icon */}
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0 transition-all duration-500 ${
                isDone
                  ? 'bg-emerald-500/15'
                  : isActive
                  ? 'bg-[#FF6B35]/15'
                  : 'bg-white/[0.04]'
              }`}>
                {isDone ? (
                  <Check className="h-4 w-4 text-emerald-400" />
                ) : isActive ? (
                  <Loader2 className="h-4 w-4 text-[#FF6B35] animate-spin" />
                ) : (
                  <Icon className="h-4 w-4 text-zinc-600" />
                )}
              </div>

              {/* Label */}
              <span className={`text-sm flex-1 transition-colors duration-500 ${
                isDone
                  ? 'text-emerald-400 font-medium'
                  : isActive
                  ? 'text-white font-medium'
                  : 'text-zinc-600'
              }`}>
                {step.label}
              </span>

              {/* Status indicator */}
              {isDone && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
                  DONE
                </span>
              )}
              {isActive && (
                <div className="flex gap-0.5">
                  <div className="w-1 h-1 rounded-full bg-[#FF6B35] animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1 h-1 rounded-full bg-[#FF6B35] animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1 h-1 rounded-full bg-[#FF6B35] animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================
export default function OneClickStorePage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [phase, setPhase] = useState('input') // 'input' | 'provisioning' | 'done'

  // Input state
  const [storeName, setStoreName] = useState('')
  const [subdomain, setSubdomain] = useState('')
  const [subdomainAvailable, setSubdomainAvailable] = useState(null)
  const [checkingSubdomain, setCheckingSubdomain] = useState(false)
  const [error, setError] = useState(null)
  const [launching, setLaunching] = useState(false)

  // Provision state
  const [provisionSteps, setProvisionSteps] = useState([])
  const [provisionStatus, setProvisionStatus] = useState('pending')
  const [storeUrl, setStoreUrl] = useState('')
  const pollRef = useRef(null)
  const checkTimeoutRef = useRef(null)

  // Auto-generate subdomain from store name
  useEffect(() => {
    if (storeName) {
      const auto = storeName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
      setSubdomain(auto)
    }
  }, [storeName])

  // Debounced subdomain availability check
  useEffect(() => {
    if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current)

    if (!subdomain || subdomain.length < 2) {
      setSubdomainAvailable(null)
      return
    }

    setCheckingSubdomain(true)
    checkTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/store-provision/check-subdomain?name=${encodeURIComponent(subdomain)}`)
        const data = await res.json()
        setSubdomainAvailable(data.available)
      } catch {
        setSubdomainAvailable(null)
      } finally {
        setCheckingSubdomain(false)
      }
    }, 500)

    return () => {
      if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current)
    }
  }, [subdomain])

  // Poll for provision status
  const startPolling = useCallback(() => {
    const poll = async () => {
      try {
        const token = localStorage.getItem('togogo-token')
        const res = await fetch(`${API_BASE}/api/store-provision/status`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()

        if (data.provision) {
          setProvisionSteps(data.provision.steps || [])
          setProvisionStatus(data.provision.status)

          if (data.store?.url) setStoreUrl(data.store.url)

          if (data.provision.completed || data.status === 'active') {
            setPhase('done')
            setProvisionStatus('completed')
            if (pollRef.current) clearInterval(pollRef.current)
            // Save store info locally
            localStorage.setItem('togogo-store-name', storeName)
            localStorage.setItem('togogo-store-url', data.store?.url || `https://${subdomain}.togogo.me`)
            localStorage.setItem('togogo-store-connection', JSON.stringify({
              platform: 'woocommerce',
              shop_url: data.store?.url || `https://${subdomain}.togogo.me`,
              shop_name: storeName,
              status: 'active',
              connected_at: new Date().toISOString(),
            }))
          }
        }
      } catch {
        // Silent — polling is best-effort
      }
    }

    poll()
    pollRef.current = setInterval(poll, 1500)
  }, [storeName, subdomain])

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  // Check for existing store on mount
  useEffect(() => {
    const checkExisting = async () => {
      try {
        const token = localStorage.getItem('togogo-token')
        if (!token) return
        const res = await fetch(`${API_BASE}/api/store-provision/status`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (data.status === 'provisioning' && data.provision) {
          setStoreName(data.store?.name || '')
          setSubdomain(data.store?.subdomain || '')
          setStoreUrl(data.store?.url || '')
          setProvisionSteps(data.provision.steps || [])
          setProvisionStatus(data.provision.status)
          setPhase('provisioning')
          startPolling()
        } else if (data.status === 'active') {
          setStoreName(data.store?.name || '')
          setStoreUrl(data.store?.url || '')
          setProvisionSteps(data.provision?.steps || [])
          setProvisionStatus('completed')
          setPhase('done')
        }
      } catch {
        // No existing store — show input form
      }
    }
    checkExisting()
  }, [startPolling])

  // Launch store
  const handleLaunch = async () => {
    if (!user) {
      navigate('/auth?redirect=/create-store')
      return
    }
    if (!storeName.trim() || !subdomain.trim()) return

    setLaunching(true)
    setError(null)

    try {
      const token = localStorage.getItem('togogo-token')
      const res = await fetch(`${API_BASE}/api/store-provision/provision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          storeName: storeName.trim(),
          subdomain: subdomain.trim(),
          tier: 'pro',
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to start provisioning')
        setLaunching(false)
        return
      }

      setStoreUrl(data.url)
      setPhase('provisioning')

      // Start with initial pending steps for immediate UI feedback
      const initialSteps = [
        { id: 'validate', label: 'Validating your store details', status: 'in_progress' },
        { id: 'subdomain', label: 'Creating your subdomain', status: 'pending' },
        { id: 'dns', label: 'Configuring DNS records', status: 'pending' },
        { id: 'ssl', label: 'Provisioning SSL certificate', status: 'pending' },
        { id: 'wordpress', label: 'Installing WordPress', status: 'pending' },
        { id: 'woocommerce', label: 'Installing WooCommerce', status: 'pending' },
        { id: 'theme', label: 'Setting up your store theme', status: 'pending' },
        { id: 'products', label: 'Configuring product sync', status: 'pending' },
        { id: 'payments', label: 'Setting up payment gateway', status: 'pending' },
        { id: 'connect', label: 'Connecting to ToGoGo', status: 'pending' },
        { id: 'finalize', label: 'Finalizing your store', status: 'pending' },
      ]
      setProvisionSteps(initialSteps)
      setProvisionStatus('in_progress')

      // Start polling for real progress
      startPolling()
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLaunching(false)
    }
  }

  return (
    <div className="py-6 min-h-[80vh]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF6B35]/20 to-[#FFD23F]/20">
          <Rocket className="h-5 w-5 text-[#FF6B35]" />
        </div>
        <div>
          <h1 className="text-xl font-heading font-bold text-white">Create Your Store</h1>
          <p className="text-[10px] text-zinc-500">One click. Fully automated. Your own shop in 30 seconds.</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 mb-6 max-w-lg mx-auto">
          <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
          <p className="text-xs text-red-400 flex-1">{error}</p>
          <button onClick={() => setError(null)}><X className="h-3.5 w-3.5 text-red-400" /></button>
        </div>
      )}

      {/* ============================================ */}
      {/* PHASE: INPUT */}
      {/* ============================================ */}
      {phase === 'input' && (
        <div className="max-w-lg mx-auto">
          {/* What you get */}
          <div className="rounded-2xl border border-white/[0.06] bg-[#0a0a0a] p-5 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Crown className="h-4 w-4 text-[#FFD23F]" />
              <h3 className="text-sm font-semibold text-white">Included in your $19.99/mo plan</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: Globe, text: 'Your own .togogo.me URL' },
                { icon: Store, text: 'Full WooCommerce store' },
                { icon: Shield, text: 'Free SSL certificate' },
                { icon: Server, text: 'Hosting included' },
                { icon: Zap, text: 'Auto product sync' },
                { icon: CreditCard, text: 'Payment processing' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.03]">
                  <item.icon className="h-3.5 w-3.5 text-[#06D6A0] flex-shrink-0" />
                  <span className="text-[11px] text-zinc-400">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Store name input */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-zinc-400 mb-2">Store name</label>
            <input
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="e.g. Sarah's Boutique"
              className="w-full px-4 py-3.5 rounded-xl bg-[#111] border border-white/[0.06] text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF6B35]/40"
              autoFocus
            />
          </div>

          {/* Subdomain input */}
          <div className="mb-6">
            <label className="block text-xs font-medium text-zinc-400 mb-2">Your store URL</label>
            <div className="flex items-center rounded-xl bg-[#111] border border-white/[0.06] overflow-hidden focus-within:border-[#FF6B35]/40">
              <span className="pl-4 text-sm text-zinc-600 flex-shrink-0">https://</span>
              <input
                type="text"
                value={subdomain}
                onChange={(e) => setSubdomain(
                  e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-')
                )}
                placeholder="yourstore"
                className="flex-1 px-1 py-3.5 bg-transparent text-sm text-white placeholder-zinc-600 focus:outline-none"
              />
              <span className="pr-4 text-sm text-zinc-600 flex-shrink-0">.togogo.me</span>
            </div>

            {/* Availability indicator */}
            {subdomain.length >= 2 && (
              <div className="flex items-center gap-1.5 mt-2 ml-1">
                {checkingSubdomain ? (
                  <>
                    <Loader2 className="h-3 w-3 text-zinc-500 animate-spin" />
                    <span className="text-[10px] text-zinc-500">Checking availability...</span>
                  </>
                ) : subdomainAvailable === true ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-400" />
                    <span className="text-[10px] text-emerald-400 font-medium">
                      {subdomain}.togogo.me is available!
                    </span>
                  </>
                ) : subdomainAvailable === false ? (
                  <>
                    <X className="h-3 w-3 text-red-400" />
                    <span className="text-[10px] text-red-400">
                      Already taken. Try another name.
                    </span>
                  </>
                ) : null}
              </div>
            )}
          </div>

          {/* Launch button */}
          <button
            onClick={handleLaunch}
            disabled={launching || !storeName.trim() || !subdomain.trim() || subdomainAvailable === false || checkingSubdomain}
            className={`w-full flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl text-base font-bold transition-all ${
              storeName.trim() && subdomain.trim() && subdomainAvailable !== false && !checkingSubdomain
                ? 'bg-gradient-to-r from-[#FF6B35] to-[#e55a2b] text-white hover:shadow-lg hover:shadow-[#FF6B35]/20 hover:scale-[1.02] active:scale-[0.98]'
                : 'bg-white/[0.06] text-zinc-600 cursor-not-allowed'
            }`}
          >
            {launching ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Launching your store...
              </>
            ) : (
              <>
                <Rocket className="h-5 w-5" />
                Launch My Store
              </>
            )}
          </button>

          <p className="text-[10px] text-zinc-600 text-center mt-3">
            Fully automated. Your store will be live in ~30 seconds.
          </p>

          {/* Want your own domain? */}
          <div className="mt-8 rounded-xl border border-white/[0.06] bg-[#111] p-4">
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-[#7F54B3] flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-medium text-white">Want your own custom domain?</p>
                <p className="text-[10px] text-zinc-500">
                  Start with .togogo.me free, then upgrade to yourname.com anytime.
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-zinc-600" />
            </div>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* PHASE: PROVISIONING */}
      {/* ============================================ */}
      {phase === 'provisioning' && (
        <ProvisionMonitor
          steps={provisionSteps}
          currentStep={provisionSteps.filter(s => s.status === 'completed').length}
          status={provisionStatus}
          storeName={storeName}
          storeUrl={storeUrl}
        />
      )}

      {/* ============================================ */}
      {/* PHASE: DONE */}
      {/* ============================================ */}
      {phase === 'done' && (
        <div className="max-w-lg mx-auto">
          <ProvisionMonitor
            steps={provisionSteps}
            currentStep={provisionSteps.length}
            status="completed"
            storeName={storeName}
            storeUrl={storeUrl}
          />

          {/* Action buttons */}
          <div className="mt-8 space-y-3">
            {/* Visit store */}
            <a
              href={storeUrl || `https://${subdomain}.togogo.me`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-gradient-to-r from-[#FF6B35] to-[#e55a2b] text-white text-sm font-bold hover:shadow-lg hover:shadow-[#FF6B35]/20 transition-all"
            >
              <ExternalLink className="h-4 w-4" />
              Visit Your Store
            </a>

            {/* Quick actions */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => navigate('/suppliers')}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/[0.06] text-zinc-300 text-xs font-medium hover:bg-white/[0.1] transition-colors"
              >
                <Package className="h-3.5 w-3.5" />
                Add Products
              </button>
              <button
                onClick={() => navigate('/my-shop')}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/[0.06] text-zinc-300 text-xs font-medium hover:bg-white/[0.1] transition-colors"
              >
                <Store className="h-3.5 w-3.5" />
                My Shop
              </button>
            </div>
          </div>

          {/* How it works from here */}
          <div className="mt-8 rounded-2xl bg-gradient-to-r from-[#FF6B35]/10 to-[#FFD23F]/10 border border-[#FF6B35]/20 p-5">
            <h3 className="text-sm font-semibold text-white text-center mb-4">What happens next</h3>
            <div className="space-y-3">
              {[
                { icon: Package, text: 'Browse products on ToGoGo and click "List" to add them to your store' },
                { icon: ShoppingCart, text: 'Products appear on your store instantly — ready for customers to buy' },
                { icon: Zap, text: 'When someone buys, ToGoGo auto-orders from the supplier & ships direct' },
                { icon: Sparkles, text: 'You keep the profit. Everything is automated.' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.06] flex-shrink-0">
                    <item.icon className="h-3.5 w-3.5 text-[#FF6B35]" />
                  </div>
                  <p className="text-xs text-zinc-400">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
