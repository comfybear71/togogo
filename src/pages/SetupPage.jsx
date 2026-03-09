import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowRight, ArrowLeft, Check, Zap, Store, ShoppingBag,
  Globe, ExternalLink, Rocket, Package, Link2, Unlink,
  Truck, Star, Sparkles, Loader2, AlertCircle, X, KeyRound
} from 'lucide-react'
import { usePlatformConnections, useConnectPlatform, useConnectPlatformKeys, useDisconnectPlatform } from '../hooks/usePlatforms'
import { useAuthStore } from '../stores/authStore'

const ALL_PLATFORMS = [
  { id: 'woocommerce', name: 'WooCommerce', color: '#7F54B3', category: 'storefront', authType: 'wc_auth', needsStoreUrl: true, desc: 'Your own WordPress store' },
  { id: 'amazon', name: 'Amazon', color: '#FF9900', category: 'marketplace', authType: 'oauth', desc: 'Biggest marketplace' },
  { id: 'ebay', name: 'eBay', color: '#E53238', category: 'marketplace', authType: 'oauth', desc: 'Auctions & fixed' },
  { id: 'etsy', name: 'Etsy', color: '#F56400', category: 'marketplace', authType: 'oauth', desc: 'Handmade & creative' },
  { id: 'tiktok', name: 'TikTok Shop', color: '#000000', category: 'marketplace', authType: 'oauth', desc: 'Social commerce' },
  { id: 'facebook', name: 'Facebook Marketplace', color: '#1877F2', category: 'marketplace', authType: 'oauth', desc: 'Local & shipping' },
  { id: 'depop', name: 'Depop', color: '#FF2300', category: 'marketplace', authType: 'api_keys', desc: 'Fashion & streetwear' },
  { id: 'instagram', name: 'Instagram', color: '#E1306C', category: 'marketing', authType: 'oauth', desc: 'Photos, stories & reels' },
  { id: 'facebook-marketing', name: 'Facebook', color: '#1877F2', category: 'marketing', authType: 'oauth', desc: 'Pages, groups & ads' },
  { id: 'tiktok-marketing', name: 'TikTok', color: '#ff0050', category: 'marketing', authType: 'oauth', desc: 'Viral short videos' },
  { id: 'pinterest', name: 'Pinterest', color: '#E60023', category: 'marketing', authType: 'oauth', desc: 'Visual discovery & pins' },
  { id: 'youtube', name: 'YouTube', color: '#FF0000', category: 'marketing', authType: 'oauth', desc: 'Product videos & shorts' },
  { id: 'x-twitter', name: 'X (Twitter)', color: '#ffffff', category: 'marketing', authType: 'oauth', desc: 'Announcements & deals' },
]

const PRODUCT_TYPES = [
  { id: 'dropship', label: 'Dropship Products', desc: 'Sell products shipped directly from suppliers', icon: Truck },
  { id: 'pod', label: 'Print on Demand', desc: 'Custom printed t-shirts, mugs, phone cases', icon: Package },
  { id: 'handmade', label: 'Handmade / Own Products', desc: 'Products you make or source yourself', icon: Star },
  { id: 'digital', label: 'Digital Products', desc: 'Downloads, courses, templates, art', icon: Sparkles },
]

const STEPS = [
  { id: 'platforms', title: 'Choose Platforms', subtitle: 'Where will you sell?' },
  { id: 'products', title: 'Product Type', subtitle: 'What will you sell?' },
  { id: 'connect', title: 'Connect', subtitle: "Let's connect your platforms" },
]

export default function SetupPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const user = useAuthStore((s) => s.user)
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedPlatforms, setSelectedPlatforms] = useState([])
  const [selectedProducts, setSelectedProducts] = useState([])
  const [connectingPlatform, setConnectingPlatform] = useState(null)
  const [apiKeyModal, setApiKeyModal] = useState(null)
  const [shopNameModal, setShopNameModal] = useState(null)
  const [apiKeyForm, setApiKeyForm] = useState({})
  const [shopNameInput, setShopNameInput] = useState('')
  const [storeUrlModal, setStoreUrlModal] = useState(null)
  const [storeUrlInput, setStoreUrlInput] = useState('')
  const [error, setError] = useState(null)

  const { data: connectionsData, refetch: refetchConnections } = usePlatformConnections()
  const connectMutation = useConnectPlatform()
  const connectKeysMutation = useConnectPlatformKeys()
  const disconnectMutation = useDisconnectPlatform()

  const connections = connectionsData?.connections || []

  // Handle OAuth redirect back
  useEffect(() => {
    const connected = searchParams.get('connected')
    const errorParam = searchParams.get('error')
    const platform = searchParams.get('platform')

    if (connected) {
      refetchConnections()
      setCurrentStep(2)
    }
    if (errorParam) {
      setError(`Failed to connect ${platform || 'platform'}: ${errorParam}`)
    }
  }, [searchParams, refetchConnections])

  // Pre-select platform from URL param
  useEffect(() => {
    const preselected = searchParams.get('platform')
    if (preselected && !searchParams.get('error')) {
      const found = ALL_PLATFORMS.find(
        (p) => p.name.toLowerCase() === preselected.toLowerCase()
      )
      if (found && !selectedPlatforms.includes(found.id)) {
        setSelectedPlatforms([found.id])
      }
    }
  }, [searchParams])

  const isConnected = (platformId) =>
    connections.some((c) => c.platform === platformId && c.status === 'active')

  const togglePlatform = (id) => {
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
  }

  const toggleProduct = (id) => {
    setSelectedProducts((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
  }

  const handleConnect = async (platform) => {
    setError(null)
    const platformData = ALL_PLATFORMS.find((p) => p.id === platform)

    // Pop-up shop doesn't need connection
    if (platformData?.authType === 'none') {
      return
    }

    // Shopify needs shop name first
    if (platformData?.needsShopName) {
      setShopNameModal(platform)
      return
    }

    // WooCommerce needs store URL, then auto-redirects to WC Auth
    if (platformData?.needsStoreUrl) {
      setStoreUrlModal(platform)
      setStoreUrlInput('')
      return
    }

    // API key platforms show a form
    if (platformData?.authType === 'api_keys') {
      setApiKeyModal(platform)
      setApiKeyForm({})
      return
    }

    // OAuth platforms — start the flow
    await startOAuthConnect(platform)
  }

  const startOAuthConnect = async (platform, shopName, shopUrl) => {
    setConnectingPlatform(platform)
    try {
      const result = await connectMutation.mutateAsync({
        platform,
        shop_name: shopName,
        shop_url: shopUrl,
      })

      if (result.type === 'oauth' && result.url) {
        // Redirect to platform's OAuth page
        window.location.href = result.url
      } else if (result.type === 'api_keys') {
        setApiKeyModal(platform)
        setApiKeyForm({})
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setConnectingPlatform(null)
    }
  }

  const handleApiKeySubmit = async (platform) => {
    setConnectingPlatform(platform)
    try {
      await connectKeysMutation.mutateAsync({
        platform,
        api_key: apiKeyForm.api_key,
        api_secret: apiKeyForm.api_secret,
        store_url: apiKeyForm.store_url,
      })
      setApiKeyModal(null)
      setApiKeyForm({})
      refetchConnections()
    } catch (err) {
      setError(err.message)
    } finally {
      setConnectingPlatform(null)
    }
  }

  const handleShopNameSubmit = () => {
    if (!shopNameInput.trim()) return
    setShopNameModal(null)
    startOAuthConnect(shopNameModal, shopNameInput.trim().replace('.myshopify.com', ''))
    setShopNameInput('')
  }

  const handleStoreUrlSubmit = () => {
    if (!storeUrlInput.trim()) return
    let url = storeUrlInput.trim().replace(/\/+$/, '')
    if (!url.startsWith('http')) url = 'https://' + url
    setStoreUrlModal(null)
    startOAuthConnect(storeUrlModal, null, url)
    setStoreUrlInput('')
  }

  const handleDisconnect = async (platform) => {
    try {
      await disconnectMutation.mutateAsync(platform)
      refetchConnections()
    } catch (err) {
      setError(err.message)
    }
  }

  const canAdvance =
    (currentStep === 0 && selectedPlatforms.length > 0) ||
    (currentStep === 1 && selectedProducts.length > 0) ||
    currentStep === 2

  const selectedPlatformData = ALL_PLATFORMS.filter((p) =>
    selectedPlatforms.includes(p.id)
  )

  const connectedCount = selectedPlatforms.filter((id) => isConnected(id) || ALL_PLATFORMS.find((p) => p.id === id)?.authType === 'none').length

  return (
    <div className="py-6 min-h-[80vh]">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FF6B35]/15">
            <Rocket className="h-5 w-5 text-[#FF6B35]" />
          </div>
          <div>
            <h1 className="text-xl font-heading font-bold text-white">Quick Setup</h1>
            <p className="text-xs text-zinc-500">
              Step {currentStep + 1} of {STEPS.length}
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/platforms')}
          className="text-xs text-zinc-500 hover:text-white transition-colors"
        >
          Skip for now
        </button>
      </div>

      {/* Progress bar */}
      <div className="flex gap-2 max-w-lg mx-auto mb-8">
        {STEPS.map((step, i) => (
          <div key={step.id} className="flex-1 flex flex-col gap-1.5">
            <div
              className={`h-1 rounded-full transition-all duration-500 ${
                i <= currentStep ? 'bg-[#FF6B35]' : 'bg-white/[0.06]'
              }`}
            />
            <span
              className={`text-[10px] font-medium ${
                i <= currentStep ? 'text-[#FF6B35]' : 'text-zinc-600'
              }`}
            >
              {step.title}
            </span>
          </div>
        ))}
      </div>

      {/* Error banner */}
      {error && (
        <div className="max-w-lg mx-auto mb-6 flex items-center gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
          <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
          <p className="text-xs text-red-400 flex-1">{error}</p>
          <button onClick={() => setError(null)}>
            <X className="h-3.5 w-3.5 text-red-400" />
          </button>
        </div>
      )}

      {/* Step title */}
      <div className="text-center mb-8">
        <h2 className="font-heading text-2xl font-bold text-white mb-2">
          {STEPS[currentStep].subtitle}
        </h2>
        {currentStep === 0 && (
          <p className="text-xs text-zinc-500 max-w-[300px] mx-auto">
            Select all the platforms you want to sell on. We'll connect them for you.
          </p>
        )}
        {currentStep === 1 && (
          <p className="text-xs text-zinc-500 max-w-[300px] mx-auto">
            What type of products will you sell? Pick all that apply.
          </p>
        )}
        {currentStep === 2 && (
          <p className="text-xs text-zinc-500 max-w-[300px] mx-auto">
            Click 'Connect' and we'll handle the rest. No need to leave ToGoGo.
          </p>
        )}
      </div>

      {/* Step content */}
      <div className="max-w-lg mx-auto mb-10">
        {/* Step 1: Select platforms */}
        {currentStep === 0 && (
          <div>
            {/* One-Click ToGoGo Store — featured prominently */}
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">
              Fastest Option
            </p>
            <button
              onClick={() => navigate('/create-store')}
              className="w-full mb-6 rounded-2xl bg-gradient-to-r from-[#FF6B35]/15 to-[#FFD23F]/10 border border-[#FF6B35]/30 p-5 text-left transition-all hover:border-[#FF6B35]/50 hover:shadow-lg hover:shadow-[#FF6B35]/5"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FF6B35]/20">
                  <Zap className="h-6 w-6 text-[#FF6B35]" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-bold text-white">One-Click ToGoGo Store</p>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#06D6A0]/15 text-[#06D6A0]">30 sec setup</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Get your own storefront at <strong className="text-zinc-300">yourname.togogo.me</strong> — with products, checkout & hosting included. No code needed.
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-[#FF6B35] flex-shrink-0" />
              </div>
            </button>

            {/* Your Own Store — WooCommerce */}
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">
              Your Own Store
            </p>
            <div className="mb-6">
              {ALL_PLATFORMS.filter((p) => p.category === 'storefront').map((p) => {
                const connected = isConnected(p.id)
                return (
                  <button
                    key={p.id}
                    onClick={() => togglePlatform(p.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 text-left ${
                      selectedPlatforms.includes(p.id)
                        ? 'bg-[#7F54B3]/10 border-[#7F54B3]/40'
                        : 'bg-[#111] border-white/[0.06] hover:border-white/[0.12]'
                    }`}
                  >
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-xl flex-shrink-0 text-sm font-bold"
                      style={{ backgroundColor: `${p.color}15`, color: p.color }}
                    >
                      W
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-white">{p.name}</p>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#7F54B3]/15 text-[#7F54B3]">Recommended</span>
                        {connected && (
                          <div className="h-2 w-2 rounded-full bg-emerald-400 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-0.5">{p.desc} — we build and host it for you</p>
                    </div>
                    {selectedPlatforms.includes(p.id) && (
                      <Check className="h-5 w-5 text-[#7F54B3] flex-shrink-0" />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Marketplaces & Marketing */}
            {[
              { key: 'marketplace', label: 'Marketplaces' },
              { key: 'marketing', label: 'Marketing Channels' },
            ].map((group) => (
              <div key={group.key}>
                <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                  {group.label}
                </p>
                <div className="grid grid-cols-2 gap-2 mb-6">
                  {ALL_PLATFORMS.filter((p) => p.category === group.key).map((p) => {
                    const connected = isConnected(p.id)
                    return (
                      <button
                        key={p.id}
                        onClick={() => togglePlatform(p.id)}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 text-left ${
                          selectedPlatforms.includes(p.id)
                            ? 'bg-[#FF6B35]/10 border-[#FF6B35]/40'
                            : 'bg-[#111] border-white/[0.06] hover:border-white/[0.12]'
                        }`}
                      >
                        <div
                          className="flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0 text-sm font-bold"
                          style={{ backgroundColor: `${p.color}15`, color: p.color }}
                        >
                          {p.name.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-semibold text-white truncate">{p.name}</p>
                            {connected && (
                              <div className="h-2 w-2 rounded-full bg-emerald-400 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-[10px] text-zinc-500 truncate">{p.desc}</p>
                        </div>
                        {selectedPlatforms.includes(p.id) && (
                          <Check className="h-4 w-4 text-[#FF6B35] flex-shrink-0" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Step 2: Product types */}
        {currentStep === 1 && (
          <div className="space-y-3">
            {PRODUCT_TYPES.map((pt) => (
              <button
                key={pt.id}
                onClick={() => toggleProduct(pt.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 text-left ${
                  selectedProducts.includes(pt.id)
                    ? 'bg-[#FF6B35]/10 border-[#FF6B35]/40'
                    : 'bg-[#111] border-white/[0.06] hover:border-white/[0.12]'
                }`}
              >
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl flex-shrink-0 ${
                    selectedProducts.includes(pt.id) ? 'bg-[#FF6B35]/15' : 'bg-white/[0.04]'
                  }`}
                >
                  <pt.icon
                    className={`h-5 w-5 ${
                      selectedProducts.includes(pt.id) ? 'text-[#FF6B35]' : 'text-zinc-500'
                    }`}
                  />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">{pt.label}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{pt.desc}</p>
                </div>
                {selectedProducts.includes(pt.id) && (
                  <Check className="h-5 w-5 text-[#FF6B35] flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Step 3: Connect platforms */}
        {currentStep === 2 && (
          <div className="space-y-3">
            {selectedPlatformData.map((p) => {
              const connected = isConnected(p.id)
              const isConnecting = connectingPlatform === p.id
              const isPopup = p.authType === 'none'

              return (
                <div
                  key={p.id}
                  className={`rounded-xl border p-4 transition-all duration-300 ${
                    connected || isPopup
                      ? 'bg-emerald-500/5 border-emerald-500/20'
                      : 'bg-[#111] border-white/[0.06]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0 text-sm font-bold"
                      style={{ backgroundColor: `${p.color}15`, color: p.color }}
                    >
                      {p.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-white">{p.name}</h3>
                        {(connected || isPopup) && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
                            {isPopup ? 'Ready' : 'Connected'}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-500">{p.desc}</p>
                    </div>

                    {isPopup ? (
                      <Check className="h-5 w-5 text-emerald-400" />
                    ) : connected ? (
                      <button
                        onClick={() => handleDisconnect(p.id)}
                        disabled={disconnectMutation.isPending}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.04] text-xs font-medium text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Unlink className="h-3.5 w-3.5" />
                        Disconnect
                      </button>
                    ) : (
                      <button
                        onClick={() => handleConnect(p.id)}
                        disabled={isConnecting}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#FF6B35] text-white text-xs font-semibold hover:bg-[#FF6B35]/90 transition-colors disabled:opacity-50"
                      >
                        {isConnecting ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Link2 className="h-3.5 w-3.5" />
                        )}
                        {isConnecting ? 'Connecting...' : 'Connect'}
                      </button>
                    )}
                  </div>

                  {/* Show connection details */}
                  {connected && (
                    <div className="mt-2 ml-[52px]">
                      {connections
                        .filter((c) => c.platform === p.id && c.status === 'active')
                        .map((c) => (
                          <p key={c.id} className="text-[10px] text-zinc-500">
                            {c.shop_name && `Store: ${c.shop_name}`}
                            {c.products_synced > 0 && ` · ${c.products_synced} products synced`}
                          </p>
                        ))}
                    </div>
                  )}
                </div>
              )
            })}

            {/* All done summary */}
            {connectedCount === selectedPlatforms.length && selectedPlatforms.length > 0 && (
              <div className="rounded-xl bg-gradient-to-r from-[#FF6B35]/10 to-[#FFD23F]/10 border border-[#FF6B35]/20 p-6 text-center mt-6">
                <Sparkles className="h-8 w-8 text-[#FFD23F] mx-auto mb-3" />
                <h3 className="text-lg font-heading font-bold text-white mb-2">
                  You're All Set!
                </h3>
                <p className="text-xs text-zinc-400 mb-4 max-w-[260px] mx-auto">
                  Your platforms are connected. Find products and we'll list them everywhere for you.
                </p>
                <button
                  onClick={() => navigate('/suppliers')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF6B35] text-white text-sm font-semibold hover:bg-[#FF6B35]/90 transition-colors"
                >
                  Find Products <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between max-w-lg mx-auto">
        <button
          onClick={() => {
            if (currentStep === 0) navigate('/platforms')
            else setCurrentStep((s) => s - 1)
          }}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {currentStep < STEPS.length - 1 ? (
          <button
            onClick={() => setCurrentStep((s) => s + 1)}
            disabled={!canAdvance}
            className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              canAdvance
                ? 'bg-[#FF6B35] text-white hover:bg-[#FF6B35]/90'
                : 'bg-white/[0.04] text-zinc-600 cursor-not-allowed'
            }`}
          >
            Continue <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={() => navigate('/suppliers')}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#FF6B35] text-white text-sm font-semibold hover:bg-[#FF6B35]/90 transition-colors"
          >
            Find Products <Rocket className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Shopify shop name modal */}
      {shopNameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-[#111] border border-white/[0.08] p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#95BF47]/15">
                <Store className="h-5 w-5 text-[#95BF47]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Connect Shopify</h3>
                <p className="text-[10px] text-zinc-500">Enter your Shopify store name</p>
              </div>
            </div>
            <div className="mb-4">
              <div className="flex items-center rounded-xl bg-[#0a0a0a] border border-white/[0.06] overflow-hidden">
                <input
                  type="text"
                  value={shopNameInput}
                  onChange={(e) => setShopNameInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleShopNameSubmit()}
                  placeholder="mystore"
                  className="flex-1 px-3 py-3 bg-transparent text-sm text-white placeholder-zinc-600 focus:outline-none"
                  autoFocus
                />
                <span className="text-xs text-zinc-500 pr-3">.myshopify.com</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setShopNameModal(null); setShopNameInput('') }}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-400 bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleShopNameSubmit}
                disabled={!shopNameInput.trim()}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#95BF47] hover:bg-[#95BF47]/90 transition-colors disabled:opacity-50"
              >
                Connect
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WooCommerce store URL modal */}
      {storeUrlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-[#111] border border-white/[0.08] p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7F54B3]/15">
                <Globe className="h-5 w-5 text-[#7F54B3]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Connect WooCommerce</h3>
                <p className="text-[10px] text-zinc-500">Enter your WordPress store URL</p>
              </div>
            </div>
            <div className="mb-3">
              <input
                type="text"
                value={storeUrlInput}
                onChange={(e) => setStoreUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleStoreUrlSubmit()}
                placeholder="https://yourstore.com"
                className="w-full px-3 py-3 rounded-xl bg-[#0a0a0a] border border-white/[0.06] text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/[0.15]"
                autoFocus
              />
            </div>
            <p className="text-[10px] text-zinc-600 mb-4">
              You'll be redirected to your WordPress site to approve the connection. API keys are generated automatically — no copy-pasting needed.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => { setStoreUrlModal(null); setStoreUrlInput('') }}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-400 bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleStoreUrlSubmit}
                disabled={!storeUrlInput.trim()}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#7F54B3] hover:bg-[#7F54B3]/90 transition-colors disabled:opacity-50"
              >
                Connect
              </button>
            </div>
          </div>
        </div>
      )}

      {/* API keys modal (PrestaShop, Depop, etc.) */}
      {apiKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-[#111] border border-white/[0.08] p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FF6B35]/15">
                <KeyRound className="h-5 w-5 text-[#FF6B35]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Connect {ALL_PLATFORMS.find((p) => p.id === apiKeyModal)?.name}
                </h3>
                <p className="text-[10px] text-zinc-500">Enter your API credentials</p>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              {apiKeyModal === 'prestashop' && (
                <>
                  <input
                    type="text"
                    value={apiKeyForm.store_url || ''}
                    onChange={(e) => setApiKeyForm((f) => ({ ...f, store_url: e.target.value }))}
                    placeholder="https://yourstore.com"
                    className="w-full px-3 py-3 rounded-xl bg-[#0a0a0a] border border-white/[0.06] text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/[0.15]"
                  />
                  <input
                    type="text"
                    value={apiKeyForm.api_key || ''}
                    onChange={(e) => setApiKeyForm((f) => ({ ...f, api_key: e.target.value }))}
                    placeholder="Webservice Key"
                    className="w-full px-3 py-3 rounded-xl bg-[#0a0a0a] border border-white/[0.06] text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/[0.15]"
                  />
                </>
              )}
              {apiKeyModal !== 'prestashop' && (
                <input
                  type="text"
                  value={apiKeyForm.api_key || ''}
                  onChange={(e) => setApiKeyForm((f) => ({ ...f, api_key: e.target.value }))}
                  placeholder="API Key"
                  className="w-full px-3 py-3 rounded-xl bg-[#0a0a0a] border border-white/[0.06] text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/[0.15]"
                />
              )}
            </div>

            <p className="text-[10px] text-zinc-600 mb-4">
              Your credentials are encrypted and stored securely. We only use them to list products and sync orders.
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => { setApiKeyModal(null); setApiKeyForm({}) }}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-400 bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleApiKeySubmit(apiKeyModal)}
                disabled={!apiKeyForm.api_key || connectingPlatform}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#FF6B35] hover:bg-[#FF6B35]/90 transition-colors disabled:opacity-50"
              >
                {connectingPlatform ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Link2 className="h-4 w-4" />
                )}
                {connectingPlatform ? 'Connecting...' : 'Connect'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
