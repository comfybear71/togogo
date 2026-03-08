import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowRight, ArrowLeft, Check, Zap, Store, ShoppingBag,
  Globe, ExternalLink, Rocket, ChevronRight, Package,
  CreditCard, Truck, Star, Sparkles
} from 'lucide-react'

const ALL_PLATFORMS = [
  { id: 'shopify', name: 'Shopify', color: '#95BF47', category: 'storefront', signupUrl: 'https://shopify.com/free-trial', desc: 'Own branded store' },
  { id: 'woocommerce', name: 'WooCommerce', color: '#7F54B3', category: 'storefront', signupUrl: 'https://woocommerce.com/start', desc: 'WordPress store' },
  { id: 'squarespace', name: 'Squarespace', color: '#000000', category: 'storefront', signupUrl: 'https://squarespace.com', desc: 'Beautiful templates' },
  { id: 'bigcommerce', name: 'BigCommerce', color: '#34313F', category: 'storefront', signupUrl: 'https://bigcommerce.com/start-your-trial', desc: 'Enterprise scale' },
  { id: 'wix', name: 'Wix', color: '#0C6EFC', category: 'storefront', signupUrl: 'https://wix.com/ecommerce/website', desc: 'Drag & drop builder' },
  { id: 'prestashop', name: 'PrestaShop', color: '#DF0067', category: 'storefront', signupUrl: 'https://prestashop.com/editions', desc: 'Open source (EU)' },
  { id: 'bigcartel', name: 'Big Cartel', color: '#222222', category: 'storefront', signupUrl: 'https://bigcartel.com/signup', desc: 'Artists & makers' },
  { id: 'amazon', name: 'Amazon', color: '#FF9900', category: 'marketplace', signupUrl: 'https://sell.amazon.com', desc: 'Biggest marketplace' },
  { id: 'ebay', name: 'eBay', color: '#E53238', category: 'marketplace', signupUrl: 'https://ebay.com/sl/sell', desc: 'Auctions & fixed' },
  { id: 'etsy', name: 'Etsy', color: '#F56400', category: 'marketplace', signupUrl: 'https://etsy.com/sell', desc: 'Handmade & creative' },
  { id: 'tiktok', name: 'TikTok Shop', color: '#000000', category: 'marketplace', signupUrl: 'https://seller.tiktok.com', desc: 'Social commerce' },
  { id: 'facebook', name: 'Facebook Marketplace', color: '#1877F2', category: 'marketplace', signupUrl: 'https://facebook.com/marketplace/create', desc: 'Local & shipping' },
  { id: 'depop', name: 'Depop', color: '#FF2300', category: 'marketplace', signupUrl: 'https://depop.com/sell', desc: 'Fashion & streetwear' },
  { id: 'popup', name: 'Pop-Up Shop', color: '#9333EA', category: 'other', signupUrl: null, desc: 'In-person events' },
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
  { id: 'connect', title: 'Set Up & Connect', subtitle: 'Get started on each platform' },
]

export default function SetupPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedPlatforms, setSelectedPlatforms] = useState([])
  const [selectedProducts, setSelectedProducts] = useState([])
  const [completedSetups, setCompletedSetups] = useState([])

  // Pre-select platform from URL param
  useEffect(() => {
    const preselected = searchParams.get('platform')
    if (preselected) {
      const found = ALL_PLATFORMS.find(
        (p) => p.name.toLowerCase() === preselected.toLowerCase()
      )
      if (found && !selectedPlatforms.includes(found.id)) {
        setSelectedPlatforms([found.id])
      }
    }
  }, [searchParams])

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

  const markSetupDone = (id) => {
    setCompletedSetups((prev) =>
      prev.includes(id) ? prev : [...prev, id]
    )
  }

  const canAdvance =
    (currentStep === 0 && selectedPlatforms.length > 0) ||
    (currentStep === 1 && selectedProducts.length > 0) ||
    currentStep === 2

  const selectedPlatformData = ALL_PLATFORMS.filter((p) =>
    selectedPlatforms.includes(p.id)
  )

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

      {/* Step title */}
      <div className="text-center mb-8">
        <h2 className="font-heading text-2xl font-bold text-white mb-2">
          {STEPS[currentStep].subtitle}
        </h2>
        {currentStep === 0 && (
          <p className="text-xs text-zinc-500 max-w-[300px] mx-auto">
            Select all the platforms you want to sell on. You can always add more later.
          </p>
        )}
        {currentStep === 1 && (
          <p className="text-xs text-zinc-500 max-w-[300px] mx-auto">
            What type of products will you sell? Pick all that apply.
          </p>
        )}
        {currentStep === 2 && (
          <p className="text-xs text-zinc-500 max-w-[300px] mx-auto">
            Click each platform to open their signup. Come back and mark it done when you're set up.
          </p>
        )}
      </div>

      {/* Step content */}
      <div className="max-w-lg mx-auto mb-10">
        {/* Step 1: Select platforms */}
        {currentStep === 0 && (
          <div>
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">
              Your Own Store
            </p>
            <div className="grid grid-cols-2 gap-2 mb-6">
              {ALL_PLATFORMS.filter((p) => p.category === 'storefront').map((p) => (
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
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{p.name}</p>
                    <p className="text-[10px] text-zinc-500 truncate">{p.desc}</p>
                  </div>
                  {selectedPlatforms.includes(p.id) && (
                    <Check className="h-4 w-4 text-[#FF6B35] flex-shrink-0 ml-auto" />
                  )}
                </button>
              ))}
            </div>

            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">
              Marketplaces
            </p>
            <div className="grid grid-cols-2 gap-2 mb-6">
              {ALL_PLATFORMS.filter((p) => p.category === 'marketplace').map((p) => (
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
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{p.name}</p>
                    <p className="text-[10px] text-zinc-500 truncate">{p.desc}</p>
                  </div>
                  {selectedPlatforms.includes(p.id) && (
                    <Check className="h-4 w-4 text-[#FF6B35] flex-shrink-0 ml-auto" />
                  )}
                </button>
              ))}
            </div>

            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">
              Other
            </p>
            <div className="grid grid-cols-2 gap-2">
              {ALL_PLATFORMS.filter((p) => p.category === 'other').map((p) => (
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
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{p.name}</p>
                    <p className="text-[10px] text-zinc-500 truncate">{p.desc}</p>
                  </div>
                  {selectedPlatforms.includes(p.id) && (
                    <Check className="h-4 w-4 text-[#FF6B35] flex-shrink-0 ml-auto" />
                  )}
                </button>
              ))}
            </div>
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

        {/* Step 3: Connect / Setup checklist */}
        {currentStep === 2 && (
          <div className="space-y-3">
            {selectedPlatformData.map((p) => {
              const isDone = completedSetups.includes(p.id)
              return (
                <div
                  key={p.id}
                  className={`rounded-xl border p-4 transition-all duration-300 ${
                    isDone
                      ? 'bg-emerald-500/5 border-emerald-500/20'
                      : 'bg-[#111] border-white/[0.06]'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0 text-sm font-bold"
                      style={{ backgroundColor: `${p.color}15`, color: p.color }}
                    >
                      {p.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-white">{p.name}</h3>
                        {isDone && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
                            Connected
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-500">{p.desc}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-[52px]">
                    {p.signupUrl ? (
                      <a
                        href={p.signupUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.06] text-xs font-semibold text-white hover:bg-white/[0.1] transition-colors"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Open {p.name}
                      </a>
                    ) : (
                      <span className="text-xs text-zinc-500 italic">
                        No signup needed — manage through Togogo
                      </span>
                    )}
                    <button
                      onClick={() => markSetupDone(p.id)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                        isDone
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-[#FF6B35]/15 text-[#FF6B35] hover:bg-[#FF6B35]/25'
                      }`}
                    >
                      <Check className="h-3.5 w-3.5" />
                      {isDone ? 'Done' : 'Mark Done'}
                    </button>
                  </div>
                </div>
              )
            })}

            {/* All done summary */}
            {completedSetups.length === selectedPlatforms.length && selectedPlatforms.length > 0 && (
              <div className="rounded-xl bg-gradient-to-r from-[#FF6B35]/10 to-[#FFD23F]/10 border border-[#FF6B35]/20 p-6 text-center mt-6">
                <Sparkles className="h-8 w-8 text-[#FFD23F] mx-auto mb-3" />
                <h3 className="text-lg font-heading font-bold text-white mb-2">
                  You're All Set!
                </h3>
                <p className="text-xs text-zinc-400 mb-4 max-w-[260px] mx-auto">
                  All your platforms are connected. Head to Suppliers to find products to sell.
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
    </div>
  )
}
