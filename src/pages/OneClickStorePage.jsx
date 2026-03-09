import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Rocket, Globe, Store, Shield, Zap, Check, X, AlertCircle,
  Loader2, ArrowRight, ExternalLink, Sparkles, ShoppingCart,
  Server, CreditCard, Link2, Paintbrush, Package, Lock,
  Settings, ChevronRight, Crown, RefreshCw, Clock
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import DeployProgress from '../components/ui/DeployProgress'

const API_BASE = import.meta.env.VITE_API_URL || ''

// ============================================
// MAIN PAGE COMPONENT
// ============================================
export default function OneClickStorePage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const user = useAuthStore((s) => s.user)

  // Phase: 'input' | 'deploying' | 'done'
  const [phase, setPhase] = useState('input')

  // Input state
  const [storeName, setStoreName] = useState('')
  const [subdomain, setSubdomain] = useState('')
  const [subdomainAvailable, setSubdomainAvailable] = useState(null)
  const [checkingSubdomain, setCheckingSubdomain] = useState(false)
  const [error, setError] = useState(null)
  const [launching, setLaunching] = useState(false)

  // Deploy state
  const [storeUrl, setStoreUrl] = useState('')
  const [paymentComplete, setPaymentComplete] = useState(false)
  const [paymentCancelled, setPaymentCancelled] = useState(false)
  const checkTimeoutRef = useRef(null)

  // Restore store name if returning from auth or payment
  useEffect(() => {
    const pending = sessionStorage.getItem('togogo-pending-store-name')
    if (pending && !storeName) {
      setStoreName(pending)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Handle payment callbacks from Stripe redirect
  useEffect(() => {
    const paymentStatus = searchParams.get('payment')
    const pendingDeploy = sessionStorage.getItem('togogo-deploy-active')

    if (paymentStatus === 'success' && pendingDeploy) {
      // Payment succeeded — resume deploy from payment step
      const savedName = sessionStorage.getItem('togogo-pending-store-name') || ''
      const savedSub = sessionStorage.getItem('togogo-pending-subdomain') || ''
      if (savedName) setStoreName(savedName)
      if (savedSub) setSubdomain(savedSub)
      setStoreUrl(`https://${savedSub}.togogo.me`)
      setPhase('deploying')
      setPaymentComplete(true)
      setSearchParams({}, { replace: true })
      sessionStorage.removeItem('togogo-deploy-active')
    } else if (paymentStatus === 'cancelled') {
      // Payment cancelled — delete the store
      const savedName = sessionStorage.getItem('togogo-pending-store-name') || ''
      if (savedName) setStoreName(savedName)
      setPhase('deploying')
      setPaymentCancelled(true)
      setSearchParams({}, { replace: true })
      sessionStorage.removeItem('togogo-deploy-active')
      sessionStorage.removeItem('togogo-pending-store-name')
      sessionStorage.removeItem('togogo-pending-subdomain')
      // Call API to delete the provisioned store
      deleteProvisionedStore()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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

  // Delete provisioned store on payment cancellation
  const deleteProvisionedStore = async () => {
    try {
      const token = localStorage.getItem('togogo-token')
      if (!token) return
      await fetch(`${API_BASE}/api/store-provision/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })
    } catch {
      // Silent — best effort cleanup
    }
    // Clean up local storage
    localStorage.removeItem('togogo-store-name')
    localStorage.removeItem('togogo-store-url')
    localStorage.removeItem('togogo-store-connection')
  }

  // Start the deployment sequence (pre-payment)
  const handleLaunch = async () => {
    if (!user) {
      if (storeName) sessionStorage.setItem('togogo-pending-store-name', storeName)
      navigate('/auth?redirect=/create-store&tab=signup')
      return
    }
    if (!storeName.trim() || !subdomain.trim()) return

    setLaunching(true)
    setError(null)

    try {
      // Kick off provisioning in the background
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
        setError(data.error || 'Failed to start store provisioning')
        setLaunching(false)
        return
      }

      if (data.url) setStoreUrl(data.url)

      // Save state for payment redirect return
      sessionStorage.setItem('togogo-pending-store-name', storeName.trim())
      sessionStorage.setItem('togogo-pending-subdomain', subdomain.trim())

      // Start the deploy progress UI!
      setPhase('deploying')
    } catch {
      setError('Failed to connect. Please check your connection and try again.')
    } finally {
      setLaunching(false)
    }
  }

  // Called by DeployProgress when it reaches the payment step
  const handlePaymentNeeded = useCallback(async () => {
    // If already returning from successful payment, skip
    if (paymentComplete) return

    try {
      const token = localStorage.getItem('togogo-token')
      sessionStorage.setItem('togogo-deploy-active', 'true')

      const res = await fetch(`${API_BASE}/api/subscriptions/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          storeName: storeName.trim(),
          subdomain: subdomain.trim(),
        }),
      })

      const data = await res.json()

      // Already subscribed — skip payment, continue
      if (data.alreadySubscribed) {
        setPaymentComplete(true)
        return
      }

      if (data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url
        return
      }

      // No checkout URL returned — treat as error
      setError('Payment setup failed. Please try again.')
    } catch {
      setError('Payment setup failed. Please try again.')
    }
  }, [storeName, subdomain, paymentComplete])

  // Called when entire deploy sequence completes
  const handleDeployComplete = useCallback(() => {
    // Save store info
    localStorage.setItem('togogo-store-name', storeName)
    localStorage.setItem('togogo-store-url', storeUrl || `https://${subdomain}.togogo.me`)
    localStorage.setItem('togogo-store-connection', JSON.stringify({
      platform: 'togogo-store',
      shop_url: storeUrl || `https://${subdomain}.togogo.me`,
      shop_name: storeName,
      status: 'active',
      connected_at: new Date().toISOString(),
    }))
    sessionStorage.removeItem('togogo-pending-store-name')
    sessionStorage.removeItem('togogo-pending-subdomain')
    sessionStorage.removeItem('togogo-deploy-active')
    setPhase('done')
  }, [storeName, subdomain, storeUrl])

  // Open control panel
  const handleOpenPanel = useCallback(() => {
    navigate('/my-shop')
  }, [navigate])

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
                { icon: Store, text: 'Full in-house storefront' },
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

          {/* Sign-in notice */}
          {!user && storeName.trim() && subdomain.trim() && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[#FF6B35]/10 border border-[#FF6B35]/20 mb-4">
              <Lock className="h-4 w-4 text-[#FF6B35] flex-shrink-0" />
              <p className="text-[11px] text-zinc-300">
                You'll need to <span className="text-[#FF6B35] font-medium">create an account</span> and subscribe to launch your store.
              </p>
            </div>
          )}

          {/* Flow steps indicator */}
          {storeName.trim() && subdomain.trim() && (
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-medium ${user ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/[0.06] text-zinc-400'}`}>
                {user ? <Check className="h-3 w-3" /> : <span className="w-4 h-4 rounded-full border border-zinc-600 flex items-center justify-center text-[8px]">1</span>}
                Account
              </div>
              <ArrowRight className="h-3 w-3 text-zinc-600" />
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-medium bg-white/[0.06] text-zinc-400">
                <span className="w-4 h-4 rounded-full border border-zinc-600 flex items-center justify-center text-[8px]">2</span>
                Deploy
              </div>
              <ArrowRight className="h-3 w-3 text-zinc-600" />
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-medium bg-white/[0.06] text-zinc-400">
                <span className="w-4 h-4 rounded-full border border-zinc-600 flex items-center justify-center text-[8px]">3</span>
                Payment
              </div>
              <ArrowRight className="h-3 w-3 text-zinc-600" />
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-medium bg-white/[0.06] text-zinc-400">
                <span className="w-4 h-4 rounded-full border border-zinc-600 flex items-center justify-center text-[8px]">4</span>
                Live!
              </div>
            </div>
          )}

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
                {user ? 'Preparing deployment...' : 'Redirecting...'}
              </>
            ) : !user ? (
              <>
                <Lock className="h-5 w-5" />
                Create Account & Launch Store
              </>
            ) : (
              <>
                <Rocket className="h-5 w-5" />
                Launch My Store
              </>
            )}
          </button>

          <p className="text-[10px] text-zinc-600 text-center mt-3">
            Store deploys first, then payment. $19.99/mo via Stripe. Cancel anytime.
          </p>

          {/* Custom domain CTA */}
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
      {/* PHASE: DEPLOYING — The cinematic progress */}
      {/* ============================================ */}
      {phase === 'deploying' && (
        <DeployProgress
          storeName={storeName}
          storeUrl={storeUrl || `https://${subdomain}.togogo.me`}
          onPaymentNeeded={handlePaymentNeeded}
          paymentComplete={paymentComplete}
          paymentCancelled={paymentCancelled}
          onComplete={handleDeployComplete}
          onOpenPanel={handleOpenPanel}
        />
      )}

      {/* ============================================ */}
      {/* PHASE: DONE — Store is live */}
      {/* ============================================ */}
      {phase === 'done' && (
        <div className="max-w-lg mx-auto">
          <DeployProgress
            storeName={storeName}
            storeUrl={storeUrl || `https://${subdomain}.togogo.me`}
            paymentComplete={true}
            onOpenPanel={handleOpenPanel}
          />

          {/* Action buttons */}
          <div className="mt-8 space-y-3">
            <a
              href={storeUrl || `https://${subdomain}.togogo.me`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-gradient-to-r from-[#FF6B35] to-[#e55a2b] text-white text-sm font-bold hover:shadow-lg hover:shadow-[#FF6B35]/20 transition-all"
            >
              <ExternalLink className="h-4 w-4" />
              Visit Your Store
            </a>

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
                Control Panel
              </button>
            </div>
          </div>

          {/* How it works */}
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
