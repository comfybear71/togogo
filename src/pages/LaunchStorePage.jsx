import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowRight, ArrowLeft, Check, Rocket, Globe, Server,
  Store, Link2, Loader2, Search, ShoppingCart, Package,
  ExternalLink, Sparkles, X, AlertCircle
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { usePlatformConnections, useConnectPlatform } from '../hooks/usePlatforms'

const API_BASE = import.meta.env.VITE_API_URL || ''

// Hosting providers with affiliate links
// Revenue: $50-65 per referral signup
const HOSTING_PROVIDERS = [
  {
    id: 'hostinger',
    name: 'Hostinger',
    color: '#673DE6',
    price: '$2.99/mo',
    feature: 'Cheapest',
    desc: 'One-click WordPress install. Best for beginners.',
    affiliateUrl: 'https://www.hostg.xyz/aff_c?offer_id=6&aff_id=YOUR_AFF_ID',
    commission: '~$60/referral',
  },
  {
    id: 'bluehost',
    name: 'Bluehost',
    color: '#003DA5',
    price: '$2.95/mo',
    feature: 'Recommended by WordPress',
    desc: 'Official WordPress.org recommended host.',
    affiliateUrl: 'https://www.bluehost.com/track/togogo',
    commission: '~$65/referral',
  },
  {
    id: 'siteground',
    name: 'SiteGround',
    color: '#6E2CF5',
    price: '$3.99/mo',
    feature: 'Best support',
    desc: 'Premium support. Great uptime and speed.',
    affiliateUrl: 'https://www.siteground.com/index.htm?afcode=togogo',
    commission: '~$50/referral',
  },
]

const STEPS = [
  { id: 'name', title: 'Name Your Store' },
  { id: 'domain', title: 'Get Your Domain' },
  { id: 'hosting', title: 'Get Hosting' },
  { id: 'connect', title: 'Connect' },
  { id: 'products', title: 'Add Products' },
]

export default function LaunchStorePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const session = useAuthStore((s) => s.session)
  const { data: connectionsData, refetch: refetchConnections } = usePlatformConnections()
  const connectMutation = useConnectPlatform()

  const [step, setStep] = useState(0)
  const [storeName, setStoreName] = useState('')
  const [domainQuery, setDomainQuery] = useState('')
  const [domainResults, setDomainResults] = useState(null)
  const [selectedDomain, setSelectedDomain] = useState(null)
  const [searchingDomains, setSearchingDomains] = useState(false)
  const [selectedHost, setSelectedHost] = useState(null)
  const [hostingDone, setHostingDone] = useState(false)
  const [storeUrl, setStoreUrl] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState(null)

  const connections = connectionsData?.connections || []
  const isWooConnected = connections.some(c => c.platform === 'woocommerce' && c.status === 'active')

  // Handle returning from domain purchase or WooCommerce auth
  useEffect(() => {
    const domainPurchased = searchParams.get('domain_purchased')
    const wcConnected = searchParams.get('connected')

    if (domainPurchased) {
      setSelectedDomain(domainPurchased)
      setStep(2) // Move to hosting step
    }
    if (wcConnected === 'woocommerce') {
      refetchConnections()
      setStep(4) // Move to products step
    }
  }, [searchParams, refetchConnections])

  // Auto-generate domain query from store name
  useEffect(() => {
    if (storeName && !domainQuery) {
      setDomainQuery(storeName.toLowerCase().replace(/[^a-z0-9]/g, ''))
    }
  }, [storeName])

  const searchDomains = async () => {
    if (!domainQuery.trim()) return
    setSearchingDomains(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/domains/search?q=${encodeURIComponent(domainQuery.trim())}`)
      const data = await res.json()
      setDomainResults(data)
    } catch {
      setError('Domain search failed. Try again.')
    } finally {
      setSearchingDomains(false)
    }
  }

  const purchaseDomain = async (domain) => {
    if (!session) {
      navigate('/auth?redirect=/launch-store')
      return
    }
    const token = session?.access_token
    try {
      const res = await fetch(`${API_BASE}/api/domains/purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ domain }),
      })
      const data = await res.json()
      if (data.checkout_url) {
        window.location.href = data.checkout_url
      }
    } catch (err) {
      setError('Purchase failed. Try again.')
    }
  }

  const connectWooCommerce = async () => {
    if (!session) {
      navigate('/auth?redirect=/launch-store')
      return
    }
    if (!storeUrl.trim()) return

    setConnecting(true)
    setError(null)
    try {
      let url = storeUrl.trim().replace(/\/+$/, '')
      if (!url.startsWith('http')) url = 'https://' + url

      const result = await connectMutation.mutateAsync({
        platform: 'woocommerce',
        shop_url: url,
      })

      if (result.type === 'oauth' && result.url) {
        window.location.href = result.url
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setConnecting(false)
    }
  }

  return (
    <div className="py-6 min-h-[80vh]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF6B35]/20 to-[#FFD23F]/20">
            <Rocket className="h-5 w-5 text-[#FF6B35]" />
          </div>
          <div>
            <h1 className="text-xl font-heading font-bold text-white">Launch Your Store</h1>
            <p className="text-[10px] text-zinc-500">5 minutes to your own online shop</p>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="flex gap-1.5 mb-8">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex-1">
            <div
              className={`h-1 rounded-full transition-all duration-500 ${
                i < step ? 'bg-emerald-500' : i === step ? 'bg-[#FF6B35]' : 'bg-white/[0.06]'
              }`}
            />
            <p className={`text-[9px] mt-1.5 font-medium ${
              i <= step ? 'text-zinc-300' : 'text-zinc-600'
            }`}>
              {s.title}
            </p>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 mb-6">
          <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
          <p className="text-xs text-red-400 flex-1">{error}</p>
          <button onClick={() => setError(null)}><X className="h-3.5 w-3.5 text-red-400" /></button>
        </div>
      )}

      <div className="max-w-lg mx-auto">
        {/* ============================================ */}
        {/* STEP 1: NAME YOUR STORE */}
        {/* ============================================ */}
        {step === 0 && (
          <div>
            <div className="text-center mb-8">
              <Store className="h-10 w-10 text-[#FF6B35] mx-auto mb-3" />
              <h2 className="text-2xl font-heading font-bold text-white mb-2">What's your store called?</h2>
              <p className="text-xs text-zinc-500 max-w-[280px] mx-auto">
                Pick a name for your shop. This will be your brand.
              </p>
            </div>
            <input
              type="text"
              value={storeName}
              onChange={(e) => { setStoreName(e.target.value); setDomainQuery(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '')) }}
              placeholder="e.g. Sarah's Boutique"
              className="w-full px-4 py-4 rounded-2xl bg-[#111] border border-white/[0.06] text-base text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF6B35]/40 text-center"
              autoFocus
            />
          </div>
        )}

        {/* ============================================ */}
        {/* STEP 2: GET YOUR DOMAIN */}
        {/* ============================================ */}
        {step === 1 && (
          <div>
            <div className="text-center mb-6">
              <Globe className="h-10 w-10 text-[#06D6A0] mx-auto mb-3" />
              <h2 className="text-2xl font-heading font-bold text-white mb-2">Get your domain</h2>
              <p className="text-xs text-zinc-500 max-w-[280px] mx-auto">
                Your store needs a web address. Search for one below.
              </p>
            </div>

            {selectedDomain ? (
              <div className="rounded-2xl bg-emerald-500/5 border border-emerald-500/20 p-5 text-center mb-4">
                <Check className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-white">{selectedDomain}</p>
                <p className="text-[10px] text-emerald-400 mt-1">Domain secured!</p>
              </div>
            ) : (
              <>
                <div className="flex gap-2 mb-4">
                  <div className="flex-1 flex items-center rounded-xl bg-[#111] border border-white/[0.06] overflow-hidden">
                    <Search className="h-4 w-4 text-zinc-600 ml-3" />
                    <input
                      type="text"
                      value={domainQuery}
                      onChange={(e) => setDomainQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && searchDomains()}
                      placeholder="yourstore"
                      className="flex-1 px-2 py-3 bg-transparent text-sm text-white placeholder-zinc-600 focus:outline-none"
                      autoFocus
                    />
                  </div>
                  <button
                    onClick={searchDomains}
                    disabled={searchingDomains}
                    className="px-4 rounded-xl bg-[#06D6A0] text-black text-xs font-semibold hover:bg-[#06D6A0]/90 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {searchingDomains ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                    Search
                  </button>
                </div>

                {domainResults && (
                  <div className="space-y-2 mb-4">
                    {domainResults.domains.map((d) => (
                      <div
                        key={d.domain}
                        className={`flex items-center gap-3 p-3 rounded-xl border ${
                          d.available
                            ? 'bg-emerald-500/5 border-emerald-500/20'
                            : 'bg-white/[0.02] border-white/[0.04] opacity-50'
                        }`}
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">{d.domain}</p>
                          {d.available && <p className="text-[10px] text-zinc-500">Renews ${d.renewalPrice}/yr</p>}
                        </div>
                        {d.available && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-[#06D6A0]">${d.price}</span>
                            <button
                              onClick={() => purchaseDomain(d.domain)}
                              className="px-3 py-2 rounded-lg bg-[#06D6A0] text-black text-[11px] font-semibold hover:bg-[#06D6A0]/90"
                            >
                              Buy
                            </button>
                          </div>
                        )}
                        {d.available === false && (
                          <span className="text-[9px] font-bold text-red-400">TAKEN</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => { setSelectedDomain('skip'); setStep(2) }}
                  className="w-full text-center text-xs text-zinc-500 hover:text-zinc-300 py-2 transition-colors"
                >
                  I already have a domain — skip this step
                </button>
              </>
            )}
          </div>
        )}

        {/* ============================================ */}
        {/* STEP 3: GET HOSTING */}
        {/* ============================================ */}
        {step === 2 && (
          <div>
            <div className="text-center mb-6">
              <Server className="h-10 w-10 text-[#7F54B3] mx-auto mb-3" />
              <h2 className="text-2xl font-heading font-bold text-white mb-2">Get hosting</h2>
              <p className="text-xs text-zinc-500 max-w-[300px] mx-auto">
                Your store needs a home on the internet. Pick a hosting provider below — they all include one-click WordPress + WooCommerce install.
              </p>
            </div>

            <div className="space-y-3 mb-6">
              {HOSTING_PROVIDERS.map((h) => (
                <div
                  key={h.id}
                  className={`rounded-xl border p-4 transition-all ${
                    selectedHost === h.id
                      ? 'bg-[#7F54B3]/10 border-[#7F54B3]/40'
                      : 'bg-[#111] border-white/[0.06] hover:border-white/[0.12]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold flex-shrink-0"
                      style={{ backgroundColor: `${h.color}15`, color: h.color }}
                    >
                      {h.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-white">{h.name}</h3>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#FFD23F]/15 text-[#FFD23F]">
                          {h.feature}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-500">{h.desc}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-white">{h.price}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <a
                      href={h.affiliateUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setSelectedHost(h.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#7F54B3] text-white text-xs font-semibold hover:bg-[#7F54B3]/90 transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Sign Up with {h.name}
                    </a>
                  </div>
                </div>
              ))}
            </div>

            {!hostingDone && (
              <div className="rounded-xl bg-[#111] border border-white/[0.06] p-4 text-center">
                <p className="text-xs text-zinc-400 mb-3">
                  After signing up with your host, install WordPress + WooCommerce (one-click), then come back here.
                </p>
                <button
                  onClick={() => setHostingDone(true)}
                  className="px-5 py-2.5 rounded-xl bg-[#FF6B35] text-white text-xs font-semibold hover:bg-[#FF6B35]/90 transition-colors"
                >
                  I've set up hosting + WooCommerce
                </button>
              </div>
            )}

            {hostingDone && (
              <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-4 text-center">
                <Check className="h-6 w-6 text-emerald-400 mx-auto mb-2" />
                <p className="text-xs text-emerald-400 font-medium">Hosting ready! Let's connect your store.</p>
              </div>
            )}
          </div>
        )}

        {/* ============================================ */}
        {/* STEP 4: CONNECT WOOCOMMERCE */}
        {/* ============================================ */}
        {step === 3 && (
          <div>
            <div className="text-center mb-6">
              <Link2 className="h-10 w-10 text-[#FF6B35] mx-auto mb-3" />
              <h2 className="text-2xl font-heading font-bold text-white mb-2">Connect your store</h2>
              <p className="text-xs text-zinc-500 max-w-[300px] mx-auto">
                Enter your store URL and we'll connect automatically. You'll be redirected to your WordPress site to click "Approve" — that's it.
              </p>
            </div>

            {isWooConnected ? (
              <div className="rounded-2xl bg-emerald-500/5 border border-emerald-500/20 p-6 text-center">
                <Check className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-emerald-400">Store connected!</h3>
                <p className="text-[10px] text-zinc-500 mt-1">
                  {connections.find(c => c.platform === 'woocommerce')?.shop_name}
                </p>
              </div>
            ) : (
              <div>
                <input
                  type="text"
                  value={storeUrl}
                  onChange={(e) => setStoreUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && connectWooCommerce()}
                  placeholder={selectedDomain && selectedDomain !== 'skip'
                    ? `https://${selectedDomain}`
                    : 'https://yourstore.com'}
                  className="w-full px-4 py-3.5 rounded-xl bg-[#111] border border-white/[0.06] text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF6B35]/40 mb-3"
                  autoFocus
                />
                <button
                  onClick={connectWooCommerce}
                  disabled={connecting || !storeUrl.trim()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#FF6B35] text-white text-sm font-semibold hover:bg-[#FF6B35]/90 disabled:opacity-50 transition-colors"
                >
                  {connecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Link2 className="h-4 w-4" />
                  )}
                  {connecting ? 'Connecting...' : 'Connect My Store'}
                </button>
                <p className="text-[10px] text-zinc-600 text-center mt-3">
                  You'll be redirected to WordPress to approve. API keys are created automatically.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ============================================ */}
        {/* STEP 5: ADD PRODUCTS */}
        {/* ============================================ */}
        {step === 4 && (
          <div>
            <div className="text-center mb-6">
              <Sparkles className="h-10 w-10 text-[#FFD23F] mx-auto mb-3" />
              <h2 className="text-2xl font-heading font-bold text-white mb-2">Your store is live!</h2>
              <p className="text-xs text-zinc-500 max-w-[300px] mx-auto">
                {storeName ? `${storeName} is` : "Your store is"} connected to ToGoGo. Browse products and list them on your store with one click. Every time a customer buys, we handle the rest.
              </p>
            </div>

            <div className="rounded-2xl bg-gradient-to-r from-[#FF6B35]/10 to-[#FFD23F]/10 border border-[#FF6B35]/20 p-6 text-center mb-6">
              <h3 className="text-sm font-semibold text-white mb-3">How it works from here</h3>
              <div className="space-y-3 text-left max-w-[300px] mx-auto">
                {[
                  { icon: Package, text: 'Browse products on ToGoGo' },
                  { icon: ShoppingCart, text: 'Click "List on my store" — product appears on your site' },
                  { icon: Store, text: 'Customer buys on your store' },
                  { icon: Rocket, text: 'ToGoGo auto-fulfills from the supplier' },
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

            <button
              onClick={() => navigate('/suppliers')}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#FF6B35] text-white text-sm font-semibold hover:bg-[#FF6B35]/90 transition-colors"
            >
              Find Products to Sell <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between max-w-lg mx-auto mt-10">
        <button
          onClick={() => {
            if (step === 0) navigate('/platforms')
            else setStep(s => s - 1)
          }}
          className="flex items-center gap-1.5 px-4 py-2.5 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        {step < 4 && (
          <button
            onClick={() => setStep(s => s + 1)}
            disabled={
              (step === 0 && !storeName.trim()) ||
              (step === 2 && !hostingDone) ||
              (step === 3 && !isWooConnected)
            }
            className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              (step === 0 && storeName.trim()) ||
              step === 1 ||
              (step === 2 && hostingDone) ||
              (step === 3 && isWooConnected)
                ? 'bg-[#FF6B35] text-white hover:bg-[#FF6B35]/90'
                : 'bg-white/[0.04] text-zinc-600 cursor-not-allowed'
            }`}
          >
            Continue <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
