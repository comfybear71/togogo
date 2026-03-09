import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { DUMMY_PRODUCTS, DUMMY_SUPPLIERS } from '../lib/dummyShopData'

const QUICK_STARTS = [
  { id: 'sell', emoji: '🏷️', label: 'Start Selling', border: 'hover:border-[#FF6B35]/30' },
  { id: 'trending', emoji: '🔥', label: 'Hot Products', border: 'hover:border-[#FFD23F]/30' },
  { id: 'dropship', emoji: '📦', label: 'Dropshipping', border: 'hover:border-[#06D6A0]/30' },
  { id: 'money', emoji: '💰', label: 'Side Hustle', border: 'hover:border-[#a78bfa]/30' },
]

// Real brand logos for the 3 category buttons
const TOOLS = [
  {
    id: 'suppliers',
    label: 'Suppliers',
    path: '/suppliers',
    logos: [
      { name: 'CJ', color: '#FF6B35' },
      { name: 'Ali', color: '#E53238' },
      { name: 'PF', color: '#29AB51' },
    ],
  },
  {
    id: 'platforms',
    label: 'Platforms',
    path: '/platforms',
    logos: [
      { name: 'eBay', color: '#E53238' },
      { name: 'Etsy', color: '#F56400' },
      { name: 'Amz', color: '#FF9900' },
    ],
  },
  {
    id: 'promotions',
    label: 'Marketing',
    path: '/promotions',
    logos: [
      { name: 'IG', color: '#E1306C' },
      { name: 'TT', color: '#ffffff' },
      { name: 'FB', color: '#1877F2' },
    ],
  },
]

// Pick one random product per supplier
function getRandomProductPerSupplier() {
  const supplierColors = {}
  for (const s of DUMMY_SUPPLIERS) {
    supplierColors[s.id] = s.color
  }
  const grouped = {}
  for (const p of DUMMY_PRODUCTS) {
    if (!grouped[p.supplierId]) grouped[p.supplierId] = []
    grouped[p.supplierId].push(p)
  }
  return DUMMY_SUPPLIERS.map((s) => {
    const products = grouped[s.id] || []
    const pick = products[Math.floor(Math.random() * products.length)]
    return pick ? {
      id: pick.id,
      supplier: s.name,
      image: pick.image.replace('w=400', 'w=200').replace('h=400', 'h=200'),
      title: pick.title,
      price: `$${pick.suggestedPrice.toFixed(2)}`,
      color: s.color,
    } : null
  }).filter(Boolean)
}

export default function HomePage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  // Random products — changes on each page load/refresh
  const showcaseProducts = useMemo(() => getRandomProductPerSupplier(), [])

  const handleGetStarted = () => {
    navigate('/create-store')
  }

  const letters = [
    { char: 'T', color: '#FF6B35', delay: '0.1s' },
    { char: 'o', color: '#ffffff', delay: '0.18s' },
    { char: 'G', color: '#FFD23F', delay: '0.26s' },
    { char: 'o', color: '#ffffff', delay: '0.34s' },
    { char: 'G', color: '#06D6A0', delay: '0.42s' },
    { char: 'o', color: '#ffffff', delay: '0.5s' },
  ]

  return (
    <div className="relative min-h-[100dvh] overflow-hidden">

      {/* Background orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -right-20 h-[500px] w-[500px] rounded-full opacity-[0.07]" style={{ background: 'radial-gradient(circle, #FF6B35 0%, transparent 70%)', animation: 'orb-drift 12s ease-in-out infinite' }} />
        <div className="absolute -bottom-32 -left-32 h-[600px] w-[600px] rounded-full opacity-[0.06]" style={{ background: 'radial-gradient(circle, #06D6A0 0%, transparent 70%)', animation: 'orb-drift-reverse 15s ease-in-out infinite' }} />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 h-[400px] w-[400px] rounded-full opacity-[0.04]" style={{ background: 'radial-gradient(circle, #FFD23F 0%, transparent 70%)', animation: 'orb-drift 18s ease-in-out 2s infinite' }} />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center" style={{ paddingTop: '8vh', paddingBottom: '40px', paddingLeft: '20px', paddingRight: '20px' }}>

        {/* Dots */}
        <div className="flex items-center justify-center gap-4" style={{ marginBottom: '24px' }}>
          <div className="dot-animate-1 w-2.5 h-2.5 rounded-full bg-[#FF6B35] shadow-[0_0_12px_rgba(255,107,53,0.4)]" />
          <div className="dot-animate-2 w-2.5 h-2.5 rounded-full bg-[#FFD23F] shadow-[0_0_12px_rgba(255,210,63,0.4)]" />
          <div className="dot-animate-3 w-2.5 h-2.5 rounded-full bg-[#06D6A0] shadow-[0_0_12px_rgba(6,214,160,0.4)]" />
        </div>

        {/* Logo */}
        <h1 className="font-heading text-5xl sm:text-6xl font-bold tracking-tight text-center">
          {letters.map((letter, i) => (
            <span key={i} className="letter-animate" style={{ color: letter.color, animationDelay: letter.delay, animationFillMode: 'forwards', display: 'inline-block' }}>
              <span className="letter-float" style={{ display: 'inline-block', animationDelay: `${i * 0.3}s` }}>
                {letter.char}
              </span>
            </span>
          ))}
        </h1>

        {/* Tagline */}
        <p className="fade-up text-center text-[11px] sm:text-xs tracking-[0.25em] uppercase text-zinc-500 font-semibold" style={{ marginTop: '16px', animationDelay: '0.8s' }}>
          Your shortcut to earning online
        </p>

        {/* === Tool buttons with brand logos === */}
        <div className="fade-up flex gap-3 w-full" style={{ marginTop: '32px', maxWidth: '360px', animationDelay: '0.9s' }}>
          {TOOLS.map((tool) => (
            <button
              key={tool.id}
              onClick={() => navigate(tool.path)}
              className="group flex-1 flex flex-col items-center gap-2 rounded-xl bg-[#0e0e0e] border border-white/[0.06] py-3 transition-all duration-300 hover:border-white/[0.12] active:scale-[0.97]"
            >
              {/* Mini brand logos row */}
              <div className="flex items-center gap-1">
                {tool.logos.map((logo) => (
                  <div
                    key={logo.name}
                    className="flex items-center justify-center w-6 h-6 rounded-md text-[7px] font-bold"
                    style={{ backgroundColor: `${logo.color}20`, color: logo.color }}
                  >
                    {logo.name}
                  </div>
                ))}
              </div>
              <span className="text-[10px] font-medium text-zinc-400 group-hover:text-zinc-200 transition-colors">{tool.label}</span>
            </button>
          ))}
        </div>

        {/* === $19.99 — what's included + button === */}
        <div className="fade-up w-full" style={{ marginTop: '24px', maxWidth: '360px', animationDelay: '1s' }}>
          <div className="rounded-2xl bg-[#0e0e0e] border border-white/[0.06] p-5">
            <p className="text-zinc-400 text-xs text-center mb-1">Everything automated. One price.</p>
            <div className="text-center mb-4">
              <span className="font-heading text-5xl font-bold text-white">$19.99</span>
              <span className="text-sm text-zinc-500">/mo</span>
            </div>

            {/* What's included grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-5">
              {[
                { icon: '🌐', text: 'Your own website & URL' },
                { icon: '🖥️', text: 'Hosting included' },
                { icon: '📣', text: 'Automated marketing' },
                { icon: '🛒', text: 'Auto-list on platforms' },
                { icon: '📊', text: 'Dashboard & analytics' },
                { icon: '📦', text: 'All 5 suppliers' },
                { icon: '🖨️', text: 'Print-on-demand' },
                { icon: '♾️', text: 'Unlimited products' },
              ].map((f) => (
                <div key={f.text} className="flex items-center gap-2">
                  <span className="text-xs">{f.icon}</span>
                  <span className="text-[10px] text-zinc-300">{f.text}</span>
                </div>
              ))}
            </div>

            <button
              onClick={handleGetStarted}
              className="w-full rounded-2xl bg-[#FF6B35] py-4 text-base font-bold text-white transition-all hover:bg-[#e55a2b] active:scale-[0.98]"
            >
              Create My Store
            </button>
            <p className="text-[10px] text-zinc-600 mt-2 text-center">30-second setup. Cancel anytime.</p>
            <button
              onClick={() => navigate('/setup')}
              className="w-full mt-2 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Already have platforms? Connect them instead →
            </button>
          </div>
        </div>

        {/* === Guides button === */}
        <div className="fade-up" style={{ marginTop: '24px', width: '100%', maxWidth: '360px', animationDelay: '1.1s' }}>
          <button
            onClick={() => navigate('/assistant')}
            className="group relative w-full overflow-hidden rounded-2xl p-[1px] transition-all duration-300"
            style={{ background: 'linear-gradient(135deg, #FF6B35, #FFD23F, #06D6A0)', backgroundSize: '200% 200%', animation: 'gradient-shift 4s ease infinite' }}
          >
            <div className="flex items-center justify-center gap-3 rounded-[15px] bg-[#0a0a0a] px-5 py-3.5 transition-all duration-300 group-hover:bg-[#0a0a0a]/80">
              <BookOpen className="h-4 w-4 text-[#FFD23F]" />
              <div className="text-center">
                <div className="text-sm font-semibold text-white">How do I get started?</div>
                <div className="text-[10px] text-zinc-500">Step-by-step guides</div>
              </div>
              <BookOpen className="h-4 w-4 text-[#FFD23F] opacity-40" />
            </div>
          </button>
        </div>

        {/* === Quick-Start Cards (compact row) === */}
        <div className="fade-up grid grid-cols-4 gap-2 w-full" style={{ marginTop: '12px', maxWidth: '360px', animationDelay: '1.2s' }}>
          {QUICK_STARTS.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(`/assistant?topic=${item.id}`)}
              className={`group flex flex-col items-center text-center rounded-xl bg-[#0e0e0e] border border-white/[0.06] py-2.5 px-1 transition-all duration-300 ${item.border} active:scale-[0.97]`}
            >
              <span className="text-xl block mb-1">{item.emoji}</span>
              <span className="text-[10px] font-medium text-zinc-400 group-hover:text-zinc-200 transition-colors leading-tight">{item.label}</span>
            </button>
          ))}
        </div>

        {/* === Product showcase from suppliers === */}
        <div className="fade-up w-full" style={{ marginTop: '20px', maxWidth: '360px', animationDelay: '1.3s' }}>
          <p className="text-[10px] text-zinc-600 uppercase tracking-wider text-center mb-3">Products from our suppliers</p>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {showcaseProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => navigate('/suppliers')}
                className="flex-shrink-0 w-[100px] rounded-xl bg-[#0e0e0e] border border-white/[0.06] overflow-hidden hover:border-white/[0.12] transition-all active:scale-[0.97]"
              >
                <div className="w-full h-[80px] overflow-hidden bg-[#111]">
                  <img
                    src={product.image}
                    alt={product.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      e.target.style.display = 'none'
                      e.target.parentElement.innerHTML = `<div class="w-full h-full flex items-center justify-center"><span class="text-lg font-bold" style="color:${product.color}">${product.supplier.charAt(0)}</span></div>`
                    }}
                  />
                </div>
                <div className="p-2">
                  <p className="text-[9px] text-zinc-400 truncate">{product.title}</p>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-[10px] font-bold text-white">{product.price}</span>
                    <span
                      className="text-[7px] font-bold px-1 py-0.5 rounded"
                      style={{ backgroundColor: `${product.color}20`, color: product.color }}
                    >
                      {product.supplier.split(' ')[0]}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="fade-up text-center text-[10px] text-zinc-700 tracking-wider uppercase" style={{ marginTop: '24px', animationDelay: '1.5s' }}>
          The marketplace for everything
        </p>

      </div>
    </div>
  )
}
