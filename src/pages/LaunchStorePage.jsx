import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowRight, ArrowLeft, Check, Rocket, Globe, Server,
  Store, Link2, Loader2, Search, ShoppingCart, Package,
  ExternalLink, Sparkles, X, AlertCircle, DollarSign,
  Zap, Crown, Users
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { usePlatformConnections, useConnectPlatform } from '../hooks/usePlatforms'

const API_BASE = import.meta.env.VITE_API_URL || ''

// ============================================
// PATH A: MARKETPLACE (FREE)
// ============================================
const MARKETPLACES = [
  {
    id: 'ebay',
    name: 'eBay',
    color: '#E53238',
    cost: 'Free to join',
    fees: '13% per sale',
    audience: '130M+ buyers',
    desc: 'Biggest auction & fixed-price marketplace. 250 free listings/month.',
    signupUrl: 'https://www.ebay.com.au/sl/sell',
    authType: 'oauth',
    bestFor: 'Everything',
  },
  {
    id: 'etsy',
    name: 'Etsy',
    color: '#F56400',
    cost: 'Free to join',
    fees: '6.5% + $0.20/listing',
    audience: '90M+ buyers',
    desc: 'Handmade, vintage & creative products. Huge niche community.',
    signupUrl: 'https://www.etsy.com/sell',
    authType: 'oauth',
    bestFor: 'Creative & niche',
  },
  {
    id: 'amazon',
    name: 'Amazon',
    color: '#FF9900',
    cost: '$39.99/mo',
    fees: '8-15% per sale',
    audience: '300M+ buyers',
    desc: 'The biggest marketplace on earth. Massive audience.',
    signupUrl: 'https://sell.amazon.com.au/',
    authType: 'oauth',
    bestFor: 'Volume sellers',
  },
  {
    id: 'tiktok',
    name: 'TikTok Shop',
    color: '#000000',
    cost: 'Free to join',
    fees: '5% per sale',
    audience: '1B+ users',
    desc: 'Sell through videos & livestreams. Products go viral.',
    signupUrl: 'https://seller.tiktok.com/',
    authType: 'oauth',
    bestFor: 'Viral & trending',
  },
]

// ============================================
// PATH B: OWN STORE (PAID)
// ============================================
const HOSTING_PROVIDERS = [
  {
    id: 'bluehost',
    name: 'Bluehost',
    color: '#003DA5',
    price: '$2.95',
    priceUnit: '/mo',
    badge: 'Recommended',
    desc: 'Official WordPress.org recommended host. One-click WooCommerce install.',
    includes: ['Free domain (1st year)', 'Free SSL certificate', 'One-click WordPress', 'WooCommerce ready'],
    affiliateUrl: 'https://www.bluehost.com/track/togogo',
    // To set up: Go to bluehost.com/affiliates, sign up, replace 'togogo' with your tracking ID
  },
  {
    id: 'hostinger',
    name: 'Hostinger',
    color: '#673DE6',
    price: '$2.99',
    priceUnit: '/mo',
    badge: 'Cheapest',
    desc: 'Budget-friendly with great tools. Perfect for beginners.',
    includes: ['Free domain (1st year)', 'Free SSL', 'AI website builder', 'WooCommerce ready'],
    affiliateUrl: 'https://www.hostg.xyz/aff_c?offer_id=6&aff_id=YOUR_AFF_ID',
    // To set up: Go to hostinger.com/affiliates, sign up, replace YOUR_AFF_ID
  },
  {
    id: 'siteground',
    name: 'SiteGround',
    color: '#6E2CF5',
    price: '$3.99',
    priceUnit: '/mo',
    badge: 'Best support',
    desc: 'Premium hosting with top-rated customer support.',
    includes: ['Free SSL', 'Daily backups', 'Staging environment', 'WooCommerce ready'],
    affiliateUrl: 'https://www.siteground.com/index.htm?afcode=togogo',
    // To set up: Go to siteground.com/affiliates, sign up, replace 'togogo' with your code
  },
]

export default function LaunchStorePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const user = useAuthStore((s) => s.user)
  const { data: connectionsData, refetch: refetchConnections } = usePlatformConnections()
  const connectMutation = useConnectPlatform()

  // Wizard state
  const [path, setPath] = useState(null) // 'marketplace' or 'ownstore'
  const [step, setStep] = useState(0) // 0 = choose path

  // Shared state
  const [storeName, setStoreName] = useState('')
  const [error, setError] = useState(null)

  // Marketplace state
  const [selectedMarketplaces, setSelectedMarketplaces] = useState([])

  // Own store state
  const [domainQuery, setDomainQuery] = useState('')
  const [domainResults, setDomainResults] = useState(null)
  const [selectedDomain, setSelectedDomain] = useState(null)
  const [searchingDomains, setSearchingDomains] = useState(false)
  const [selectedHost, setSelectedHost] = useState(null)
  const [hostingDone, setHostingDone] = useState(false)
  const [storeUrl, setStoreUrl] = useState('')
  const [connecting, setConnecting] = useState(false)

  const connections = connectionsData?.connections || []
  const isWooConnected = connections.some(c => c.platform === 'woocommerce' && c.status === 'active')

  // Handle returns from domain purchase or WooCommerce auth
  useEffect(() => {
    const domainPurchased = searchParams.get('domain_purchased')
    const wcConnected = searchParams.get('connected')
    if (domainPurchased) {
      setPath('ownstore')
      setSelectedDomain(domainPurchased)
      setStep(3) // hosting step
    }
    if (wcConnected === 'woocommerce') {
      setPath('ownstore')
      refetchConnections()
      setStep(5) // done step
    }
  }, [searchParams, refetchConnections])

  // Domain search
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
    if (!user) { navigate('/auth?redirect=/launch-store'); return }
    try {
      const res = await fetch(`${API_BASE}/api/domains/purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('togogo-token')}`,
        },
        body: JSON.stringify({ domain }),
      })
      const data = await res.json()
      if (data.checkout_url) window.location.href = data.checkout_url
    } catch { setError('Purchase failed. Try again.') }
  }

  const connectWooCommerce = async () => {
    if (!user) { navigate('/auth?redirect=/launch-store'); return }
    if (!storeUrl.trim()) return
    setConnecting(true)
    setError(null)
    try {
      let url = storeUrl.trim().replace(/\/+$/, '')
      if (!url.startsWith('http')) url = 'https://' + url

      const result = await connectMutation.mutateAsync({ platform: 'woocommerce', shop_url: url })
      if (result.type === 'oauth' && result.url) {
        window.location.href = result.url
        return
      }

      // Save connection and advance
      const connection = {
        platform: 'woocommerce',
        shop_url: url,
        shop_name: storeName || url.replace(/^https?:\/\//, '').replace(/\/+$/, ''),
        status: 'active',
        connected_at: new Date().toISOString(),
        products_synced: 0,
      }
      localStorage.setItem('togogo-store-connection', JSON.stringify(connection))
      localStorage.setItem('togogo-store-name', storeName || connection.shop_name)
      setStep(5) // done step
    } catch (err) { setError(err.message) }
    finally { setConnecting(false) }
  }

  const toggleMarketplace = (id) => {
    setSelectedMarketplaces(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    )
  }

  // ============================================
  // STEP DEFINITIONS PER PATH
  // ============================================
  const marketplaceSteps = ['Choose Path', 'Name', 'Pick Marketplaces', 'Sign Up', 'Done']
  const ownStoreSteps = ['Choose Path', 'Name', 'Domain', 'Hosting', 'Connect', 'Done']
  const currentSteps = path === 'marketplace' ? marketplaceSteps : path === 'ownstore' ? ownStoreSteps : ['Choose Path']

  return (
    <div className="py-6 min-h-[80vh]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF6B35]/20 to-[#FFD23F]/20">
          <Rocket className="h-5 w-5 text-[#FF6B35]" />
        </div>
        <div>
          <h1 className="text-xl font-heading font-bold text-white">Launch Your Store</h1>
          <p className="text-[10px] text-zinc-500">Start selling in minutes</p>
        </div>
      </div>

      {/* Progress bar (only after path chosen) */}
      {path && (
        <div className="flex gap-1.5 mb-8">
          {currentSteps.map((s, i) => (
            <div key={i} className="flex-1">
              <div className={`h-1 rounded-full transition-all duration-500 ${
                i < step ? 'bg-emerald-500' : i === step ? 'bg-[#FF6B35]' : 'bg-white/[0.06]'
              }`} />
              <p className={`text-[9px] mt-1.5 font-medium truncate ${
                i <= step ? 'text-zinc-300' : 'text-zinc-600'
              }`}>{s}</p>
            </div>
          ))}
        </div>
      )}

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
        {/* STEP 0: CHOOSE YOUR PATH */}
        {/* ============================================ */}
        {step === 0 && (
          <div>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-heading font-bold text-white mb-2">How do you want to sell?</h2>
              <p className="text-xs text-zinc-500 max-w-[300px] mx-auto">
                Two ways to start. Pick what works for you.
              </p>
            </div>

            <div className="space-y-4">
              {/* PATH A: FREE */}
              <button
                onClick={() => { setPath('marketplace'); setStep(1) }}
                className="w-full text-left rounded-2xl border-2 border-white/[0.06] hover:border-[#06D6A0]/40 bg-[#111] p-5 transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#06D6A0]/15 flex-shrink-0">
                    <Users className="h-6 w-6 text-[#06D6A0]" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-semibold text-white">Sell on Marketplaces</h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#06D6A0]/15 text-[#06D6A0]">
                        FREE
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mb-3">
                      List on eBay, Etsy, Amazon, or TikTok Shop. No website needed. Huge built-in audiences.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="text-[10px] px-2 py-1 rounded-full bg-white/[0.04] text-zinc-400">$0 to start</span>
                      <span className="text-[10px] px-2 py-1 rounded-full bg-white/[0.04] text-zinc-400">No website needed</span>
                      <span className="text-[10px] px-2 py-1 rounded-full bg-white/[0.04] text-zinc-400">Millions of buyers</span>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-zinc-600 group-hover:text-[#06D6A0] transition-colors flex-shrink-0 mt-1" />
                </div>
              </button>

              {/* PATH B+: ONE-CLICK STORE (AUTOMATED) */}
              <button
                onClick={() => navigate('/create-store')}
                className="w-full text-left rounded-2xl border-2 border-[#FFD23F]/30 hover:border-[#FFD23F]/60 bg-gradient-to-r from-[#111] to-[#1a1400] p-5 transition-all group relative overflow-hidden"
              >
                <div className="absolute top-2 right-2">
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#FFD23F]/15 text-[#FFD23F] animate-pulse">
                    NEW
                  </span>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FFD23F]/15 flex-shrink-0">
                    <Zap className="h-6 w-6 text-[#FFD23F]" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-semibold text-white">One-Click Store</h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#06D6A0]/15 text-[#06D6A0]">
                        INCLUDED
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mb-3">
                      Your own store at yourname.togogo.me — fully set up in 30 seconds. WordPress + WooCommerce, hosting, SSL — all automated.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="text-[10px] px-2 py-1 rounded-full bg-white/[0.04] text-zinc-400">Included in $19.99/mo</span>
                      <span className="text-[10px] px-2 py-1 rounded-full bg-white/[0.04] text-zinc-400">30-second setup</span>
                      <span className="text-[10px] px-2 py-1 rounded-full bg-white/[0.04] text-zinc-400">Live progress monitor</span>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-zinc-600 group-hover:text-[#FFD23F] transition-colors flex-shrink-0 mt-1" />
                </div>
              </button>

              {/* PATH B: OWN STORE (MANUAL — CUSTOM DOMAIN) */}
              <button
                onClick={() => { setPath('ownstore'); setStep(1) }}
                className="w-full text-left rounded-2xl border-2 border-white/[0.06] hover:border-[#FF6B35]/40 bg-[#111] p-5 transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FF6B35]/15 flex-shrink-0">
                    <Crown className="h-6 w-6 text-[#FF6B35]" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-semibold text-white">Custom Domain Store</h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FF6B35]/15 text-[#FF6B35]">
                        ~$3.50/mo extra
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mb-3">
                      Your own branded website with your own domain (e.g. yourstore.com). Full control with external hosting.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="text-[10px] px-2 py-1 rounded-full bg-white/[0.04] text-zinc-400">Domain ~$5-19/yr</span>
                      <span className="text-[10px] px-2 py-1 rounded-full bg-white/[0.04] text-zinc-400">Hosting ~$3/mo</span>
                      <span className="text-[10px] px-2 py-1 rounded-full bg-white/[0.04] text-zinc-400">Your own brand</span>
                    </div>

                    {/* Cost breakdown */}
                    <div className="mt-3 pt-3 border-t border-white/[0.06]">
                      <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Full cost breakdown</p>
                      <div className="space-y-1">
                        {[
                          { item: 'Domain (.store/.shop)', cost: '$4.99/yr', note: 'or .com at $18.99/yr' },
                          { item: 'Hosting (Bluehost)', cost: '$2.95/mo', note: 'includes free domain 1st year' },
                          { item: 'WooCommerce', cost: 'Free', note: 'open source' },
                          { item: 'WordPress', cost: 'Free', note: 'open source' },
                          { item: 'SSL certificate', cost: 'Free', note: 'included with hosting' },
                          { item: 'Payment processing', cost: '2.9% + 30c', note: 'per sale (Stripe)' },
                        ].map((row, i) => (
                          <div key={i} className="flex items-center justify-between">
                            <span className="text-[10px] text-zinc-400">{row.item}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-semibold text-white">{row.cost}</span>
                              <span className="text-[9px] text-zinc-600">{row.note}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-zinc-600 group-hover:text-[#FF6B35] transition-colors flex-shrink-0 mt-1" />
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* STEP 1: NAME (BOTH PATHS) */}
        {/* ============================================ */}
        {step === 1 && (
          <div>
            <div className="text-center mb-8">
              <Store className="h-10 w-10 text-[#FF6B35] mx-auto mb-3" />
              <h2 className="text-2xl font-heading font-bold text-white mb-2">Name your store</h2>
              <p className="text-xs text-zinc-500 max-w-[280px] mx-auto">
                {path === 'marketplace'
                  ? "This will be your seller name on the marketplaces."
                  : "This will be your brand. Pick something memorable."}
              </p>
            </div>
            <input
              type="text"
              value={storeName}
              onChange={(e) => {
                setStoreName(e.target.value)
                setDomainQuery(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))
                if (e.target.value.trim()) localStorage.setItem('togogo-store-name', e.target.value.trim())
              }}
              placeholder="e.g. Sarah's Boutique"
              className="w-full px-4 py-4 rounded-2xl bg-[#111] border border-white/[0.06] text-base text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF6B35]/40 text-center"
              autoFocus
            />
          </div>
        )}

        {/* ============================================ */}
        {/* MARKETPLACE PATH: STEP 2 — PICK MARKETPLACES */}
        {/* ============================================ */}
        {path === 'marketplace' && step === 2 && (
          <div>
            <div className="text-center mb-6">
              <ShoppingCart className="h-10 w-10 text-[#06D6A0] mx-auto mb-3" />
              <h2 className="text-2xl font-heading font-bold text-white mb-2">Where do you want to sell?</h2>
              <p className="text-xs text-zinc-500 max-w-[300px] mx-auto">
                Pick one or more. You can always add more later.
              </p>
            </div>

            <div className="space-y-3">
              {MARKETPLACES.map((m) => {
                const selected = selectedMarketplaces.includes(m.id)
                const connected = connections.some(c => c.platform === m.id && c.status === 'active')
                return (
                  <button
                    key={m.id}
                    onClick={() => toggleMarketplace(m.id)}
                    className={`w-full text-left rounded-xl border p-4 transition-all ${
                      selected
                        ? 'bg-[#06D6A0]/10 border-[#06D6A0]/40'
                        : 'bg-[#111] border-white/[0.06] hover:border-white/[0.12]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold flex-shrink-0"
                        style={{ backgroundColor: `${m.color}15`, color: m.color }}
                      >
                        {m.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-white">{m.name}</h3>
                          {connected && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">CONNECTED</span>
                          )}
                        </div>
                        <p className="text-[10px] text-zinc-500 truncate">{m.desc}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-bold text-[#06D6A0]">{m.cost}</p>
                        <p className="text-[9px] text-zinc-500">{m.fees}</p>
                      </div>
                      {selected && <Check className="h-5 w-5 text-[#06D6A0] flex-shrink-0" />}
                    </div>
                    <div className="flex items-center gap-3 mt-2 ml-[52px]">
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.04] text-zinc-500">{m.audience}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.04] text-zinc-500">Best for: {m.bestFor}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* MARKETPLACE PATH: STEP 3 — SIGN UP & CONNECT */}
        {/* ============================================ */}
        {path === 'marketplace' && step === 3 && (
          <div>
            <div className="text-center mb-6">
              <Link2 className="h-10 w-10 text-[#06D6A0] mx-auto mb-3" />
              <h2 className="text-2xl font-heading font-bold text-white mb-2">Sign up & connect</h2>
              <p className="text-xs text-zinc-500 max-w-[300px] mx-auto">
                Create your seller account on each marketplace, then connect it to ToGoGo.
              </p>
            </div>

            <div className="space-y-3">
              {MARKETPLACES.filter(m => selectedMarketplaces.includes(m.id)).map((m) => {
                const connected = connections.some(c => c.platform === m.id && c.status === 'active')
                return (
                  <div
                    key={m.id}
                    className={`rounded-xl border p-4 ${
                      connected ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-[#111] border-white/[0.06]'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold flex-shrink-0"
                        style={{ backgroundColor: `${m.color}15`, color: m.color }}
                      >
                        {m.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-white">{m.name}</h3>
                        {connected && <p className="text-[10px] text-emerald-400">Connected</p>}
                      </div>
                      {connected && <Check className="h-5 w-5 text-emerald-400" />}
                    </div>

                    {!connected && (
                      <div className="flex gap-2">
                        <a
                          href={m.signupUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-white/[0.04] text-xs font-medium text-zinc-300 hover:bg-white/[0.08] transition-colors"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          1. Create {m.name} Account
                        </a>
                        <button
                          onClick={() => {
                            if (!user) { navigate('/auth?redirect=/launch-store'); return }
                            const connection = {
                              platform: m.id,
                              shop_name: storeName || `My ${m.name} Store`,
                              status: 'active',
                              connected_at: new Date().toISOString(),
                            }
                            localStorage.setItem(`togogo-marketplace-${m.id}`, JSON.stringify(connection))
                            refetchConnections()
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-[#06D6A0] text-black text-xs font-semibold hover:bg-[#06D6A0]/90 transition-colors"
                        >
                          <Link2 className="h-3.5 w-3.5" />
                          2. Connect to ToGoGo
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <button
              onClick={() => setStep(4)}
              className="w-full mt-6 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#06D6A0] text-black text-sm font-semibold hover:bg-[#06D6A0]/90 transition-colors"
            >
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ============================================ */}
        {/* MARKETPLACE PATH: STEP 4 — DONE */}
        {/* ============================================ */}
        {path === 'marketplace' && step === 4 && (
          <DoneStep storeName={storeName} path="marketplace" navigate={navigate} />
        )}

        {/* ============================================ */}
        {/* OWN STORE PATH: STEP 2 — DOMAIN */}
        {/* ============================================ */}
        {path === 'ownstore' && step === 2 && (
          <div>
            <div className="text-center mb-6">
              <Globe className="h-10 w-10 text-[#06D6A0] mx-auto mb-3" />
              <h2 className="text-2xl font-heading font-bold text-white mb-2">Get your domain</h2>
              <p className="text-xs text-zinc-500 max-w-[280px] mx-auto">
                Your store needs a web address. Search for one below.
              </p>
            </div>

            {selectedDomain ? (
              <div className="rounded-2xl bg-emerald-500/5 border border-emerald-500/20 p-5 text-center">
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
                      placeholder={storeName ? storeName.toLowerCase().replace(/[^a-z0-9]/g, '') : 'yourstore'}
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
                    {domainResults.domains.filter(d => d.available !== false).map((d) => (
                      <div key={d.domain} className="flex items-center gap-3 p-3 rounded-xl border bg-emerald-500/5 border-emerald-500/20">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">{d.domain}</p>
                          <p className="text-[10px] text-zinc-500">Renews ${d.renewalPrice}/yr</p>
                        </div>
                        <span className="text-sm font-bold text-[#06D6A0]">${d.price}</span>
                        <button
                          onClick={() => purchaseDomain(d.domain)}
                          className="px-3 py-2 rounded-lg bg-[#06D6A0] text-black text-[11px] font-semibold hover:bg-[#06D6A0]/90"
                        >
                          Buy
                        </button>
                      </div>
                    ))}
                    {domainResults.domains.filter(d => d.available === false).length > 0 && (
                      <p className="text-[10px] text-zinc-600 text-center pt-1">
                        {domainResults.domains.filter(d => d.available === false).map(d => d.domain).join(', ')} — taken
                      </p>
                    )}
                  </div>
                )}

                <button
                  onClick={() => { setSelectedDomain('skip'); setStep(3) }}
                  className="w-full text-center text-xs text-zinc-500 hover:text-zinc-300 py-2 transition-colors"
                >
                  I already have a domain — skip
                </button>
              </>
            )}
          </div>
        )}

        {/* ============================================ */}
        {/* OWN STORE PATH: STEP 3 — HOSTING */}
        {/* ============================================ */}
        {path === 'ownstore' && step === 3 && (
          <div>
            <div className="text-center mb-6">
              <Server className="h-10 w-10 text-[#7F54B3] mx-auto mb-3" />
              <h2 className="text-2xl font-heading font-bold text-white mb-2">Get hosting</h2>
              <p className="text-xs text-zinc-500 max-w-[300px] mx-auto">
                Pick a host below. They all include one-click WordPress + WooCommerce. Sign up, install WordPress, then come back.
              </p>
            </div>

            <div className="space-y-3 mb-4">
              {HOSTING_PROVIDERS.map((h) => (
                <div
                  key={h.id}
                  className={`rounded-xl border p-4 transition-all ${
                    selectedHost === h.id
                      ? 'bg-[#7F54B3]/10 border-[#7F54B3]/40'
                      : 'bg-[#111] border-white/[0.06]'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
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
                          {h.badge}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-500">{h.desc}</p>
                    </div>
                    <p className="text-lg font-bold text-white flex-shrink-0">
                      {h.price}<span className="text-xs text-zinc-500 font-normal">{h.priceUnit}</span>
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1.5 ml-[52px] mb-3">
                    {h.includes.map((item, i) => (
                      <span key={i} className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-white/[0.04] text-zinc-400">
                        <Check className="h-2.5 w-2.5 text-emerald-400" /> {item}
                      </span>
                    ))}
                  </div>

                  <a
                    href={h.affiliateUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setSelectedHost(h.id)}
                    className="flex items-center justify-center gap-1.5 w-full px-4 py-2.5 rounded-lg bg-[#7F54B3] text-white text-xs font-semibold hover:bg-[#7F54B3]/90 transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Sign Up with {h.name}
                  </a>
                </div>
              ))}
            </div>

            <div className="rounded-xl bg-[#111] border border-white/[0.06] p-4 text-center">
              <p className="text-xs text-zinc-400 mb-3">
                After signing up: install WordPress (one-click), then install WooCommerce plugin. Come back here when done.
              </p>
              <button
                onClick={() => setHostingDone(true)}
                className={`px-5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                  hostingDone
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-[#FF6B35] text-white hover:bg-[#FF6B35]/90'
                }`}
              >
                {hostingDone ? (
                  <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5" /> Done! WordPress + WooCommerce installed</span>
                ) : (
                  "I've set up hosting + WooCommerce"
                )}
              </button>
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* OWN STORE PATH: STEP 4 — CONNECT */}
        {/* ============================================ */}
        {path === 'ownstore' && step === 4 && (
          <div>
            <div className="text-center mb-6">
              <Link2 className="h-10 w-10 text-[#FF6B35] mx-auto mb-3" />
              <h2 className="text-2xl font-heading font-bold text-white mb-2">Connect your store</h2>
              <p className="text-xs text-zinc-500 max-w-[300px] mx-auto">
                Enter your store URL. You'll be redirected to WordPress to click "Approve" — one click and you're connected.
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
                  placeholder={selectedDomain && selectedDomain !== 'skip' ? `https://${selectedDomain}` : 'https://yourstore.com'}
                  className="w-full px-4 py-3.5 rounded-xl bg-[#111] border border-white/[0.06] text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF6B35]/40 mb-3"
                  autoFocus
                />
                <button
                  onClick={connectWooCommerce}
                  disabled={connecting || !storeUrl.trim()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#FF6B35] text-white text-sm font-semibold hover:bg-[#FF6B35]/90 disabled:opacity-50 transition-colors"
                >
                  {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                  {connecting ? 'Connecting...' : 'Connect My Store'}
                </button>
                <p className="text-[10px] text-zinc-600 text-center mt-3">
                  Redirects to WordPress → click "Approve" → API keys created automatically → done.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ============================================ */}
        {/* OWN STORE PATH: STEP 5 — DONE */}
        {/* ============================================ */}
        {path === 'ownstore' && step === 5 && (
          <DoneStep storeName={storeName} path="ownstore" navigate={navigate} />
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between max-w-lg mx-auto mt-10">
        <button
          onClick={() => {
            if (step === 0) navigate('/platforms')
            else if (step === 1 && path) { setPath(null); setStep(0) }
            else setStep(s => s - 1)
          }}
          className="flex items-center gap-1.5 px-4 py-2.5 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        {step > 0 && !(
          (path === 'marketplace' && step === 4) ||
          (path === 'ownstore' && step === 5)
        ) && (
          <button
            onClick={() => setStep(s => s + 1)}
            disabled={
              (step === 1 && !storeName.trim()) ||
              (path === 'marketplace' && step === 2 && selectedMarketplaces.length === 0) ||
              (path === 'ownstore' && step === 3 && !hostingDone) ||
              (path === 'ownstore' && step === 4 && !isWooConnected)
            }
            className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              (step === 1 && storeName.trim()) ||
              (path === 'marketplace' && step === 2 && selectedMarketplaces.length > 0) ||
              (path === 'marketplace' && step === 3) ||
              (path === 'ownstore' && step === 2) ||
              (path === 'ownstore' && step === 3 && hostingDone) ||
              (path === 'ownstore' && step === 4 && isWooConnected)
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

// ============================================
// DONE STEP (shared by both paths)
// ============================================
function DoneStep({ storeName, path, navigate }) {
  return (
    <div>
      <div className="text-center mb-6">
        <Sparkles className="h-10 w-10 text-[#FFD23F] mx-auto mb-3" />
        <h2 className="text-2xl font-heading font-bold text-white mb-2">
          {storeName ? `${storeName} is ready!` : "You're ready to sell!"}
        </h2>
        <p className="text-xs text-zinc-500 max-w-[300px] mx-auto">
          {path === 'marketplace'
            ? "Your marketplace accounts are set up. Now find products to list."
            : "Your store is connected to ToGoGo. Products, orders, fulfillment — all automated."}
        </p>
      </div>

      <div className="rounded-2xl bg-gradient-to-r from-[#FF6B35]/10 to-[#FFD23F]/10 border border-[#FF6B35]/20 p-6 mb-6">
        <h3 className="text-sm font-semibold text-white text-center mb-4">How it works from here</h3>
        <div className="space-y-3 max-w-[300px] mx-auto">
          {[
            { icon: Package, text: 'Browse thousands of products on ToGoGo' },
            { icon: ShoppingCart, text: 'Click "List" — product appears on your store instantly' },
            { icon: Store, text: 'A customer buys the product' },
            { icon: DollarSign, text: 'ToGoGo auto-orders from the supplier' },
            { icon: Rocket, text: 'Supplier ships directly to the customer' },
            { icon: Sparkles, text: 'You keep the profit. We handle everything.' },
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

      <div className="flex gap-3">
        <button
          onClick={() => navigate('/my-shop')}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#FF6B35] text-white text-sm font-semibold hover:bg-[#FF6B35]/90 transition-colors"
        >
          Go to My Shop <ArrowRight className="h-4 w-4" />
        </button>
        <button
          onClick={() => navigate('/suppliers')}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white/[0.06] text-zinc-300 text-sm font-medium hover:bg-white/[0.1] transition-colors"
        >
          Find Products
        </button>
      </div>
    </div>
  )
}
