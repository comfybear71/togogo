import { useNavigate } from 'react-router-dom'
import { Sparkles } from 'lucide-react'

const QUICK_STARTS = [
  {
    id: 'sell',
    emoji: '🏷️',
    label: 'Start Selling',
    sub: 'From home, today',
    gradient: 'from-[#FF6B35]/20 to-[#FF6B35]/5',
    border: 'hover:border-[#FF6B35]/30',
    glow: 'rgba(255,107,53,0.08)',
    prompt: "I'm new to selling online and I want to start earning money from home. I don't know what to sell or where to start. Can you help me pick easy products I can sell today with very little money? Walk me through it step by step, keep it super simple.",
  },
  {
    id: 'trending',
    emoji: '🔥',
    label: 'Hot Products',
    sub: 'What\'s selling now',
    gradient: 'from-[#FFD23F]/20 to-[#FFD23F]/5',
    border: 'hover:border-[#FFD23F]/30',
    glow: 'rgba(255,210,63,0.08)',
    prompt: "Show me the hottest trending products that are selling well right now. I want to know what's popular so I can start selling them. Give me specific product ideas with estimated profit margins. Keep it simple and practical.",
  },
  {
    id: 'dropship',
    emoji: '📦',
    label: 'Dropshipping',
    sub: 'No stock needed',
    gradient: 'from-[#06D6A0]/20 to-[#06D6A0]/5',
    border: 'hover:border-[#06D6A0]/30',
    glow: 'rgba(6,214,160,0.08)',
    prompt: "I want to try dropshipping but I have no experience. Explain it to me like I'm a complete beginner. How do I start without buying any stock? What products should I dropship and where do I sell them? Make it really simple.",
  },
  {
    id: 'money',
    emoji: '💰',
    label: 'Side Hustle Ideas',
    sub: 'Easy extra income',
    gradient: 'from-[#a78bfa]/20 to-[#a78bfa]/5',
    border: 'hover:border-[#a78bfa]/30',
    glow: 'rgba(167,139,250,0.08)',
    prompt: "I'm sitting at home and I need ideas to make extra money. I'm not very tech-savvy. Give me simple side hustle ideas I can start today — things like selling items, flipping products, or offering services. Keep it practical and beginner-friendly.",
  },
]

const TOOLS = [
  {
    id: 'suppliers',
    emoji: '🏭',
    label: 'Suppliers',
    path: '/suppliers',
  },
  {
    id: 'platforms',
    emoji: '🛍️',
    label: 'Platforms',
    path: '/platforms',
  },
  {
    id: 'promotions',
    emoji: '📣',
    label: 'Promotions',
    path: '/promotions',
  },
]

export default function HomePage() {
  const navigate = useNavigate()

  const handleQuickStart = (prompt) => {
    navigate(`/assistant?start=${encodeURIComponent(prompt)}`)
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

        {/* New tagline — speaks to HER */}
        <p className="fade-up text-center text-[11px] sm:text-xs tracking-[0.25em] uppercase text-zinc-500 font-semibold" style={{ marginTop: '16px', animationDelay: '0.8s' }}>
          Your shortcut to earning online
        </p>

        {/* === "What do you want to do?" === */}
        <h2 className="fade-up font-heading text-lg sm:text-xl font-bold text-white text-center" style={{ marginTop: '40px', animationDelay: '0.9s' }}>
          Tap to get started
        </h2>
        <p className="fade-up text-xs text-zinc-500 text-center" style={{ marginTop: '6px', animationDelay: '0.95s' }}>
          No experience needed — we'll guide you
        </p>

        {/* === Visual Quick-Start Cards === */}
        <div className="fade-up grid grid-cols-2 gap-3 w-full" style={{ marginTop: '24px', maxWidth: '360px', animationDelay: '1s' }}>
          {QUICK_STARTS.map((item) => (
            <button
              key={item.id}
              onClick={() => handleQuickStart(item.prompt)}
              className={`quick-card group relative flex flex-col items-center text-center rounded-2xl bg-[#0e0e0e] border border-white/[0.06] p-5 transition-all duration-300 ${item.border} active:scale-[0.97]`}
            >
              {/* Glow on hover */}
              <div
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: `radial-gradient(circle at center, ${item.glow}, transparent 70%)` }}
              />
              <div className="relative">
                <span className="text-4xl block mb-3">{item.emoji}</span>
                <span className="text-sm font-semibold text-white block leading-tight">{item.label}</span>
                <span className="text-[10px] text-zinc-500 block mt-1">{item.sub}</span>
              </div>
            </button>
          ))}
        </div>

        {/* === AI Assistant — the power behind it all === */}
        <div className="fade-up" style={{ marginTop: '24px', width: '100%', maxWidth: '360px', animationDelay: '1.2s' }}>
          <button
            onClick={() => navigate('/assistant')}
            className="group relative w-full overflow-hidden rounded-2xl p-[1px] transition-all duration-300"
            style={{ background: 'linear-gradient(135deg, #FF6B35, #FFD23F, #06D6A0)', backgroundSize: '200% 200%', animation: 'gradient-shift 4s ease infinite' }}
          >
            <div className="flex items-center justify-center gap-3 rounded-[15px] bg-[#0a0a0a] px-5 py-4 transition-all duration-300 group-hover:bg-[#0a0a0a]/80">
              <Sparkles className="h-4.5 w-4.5 text-[#FFD23F]" />
              <div className="text-center">
                <div className="text-sm font-semibold text-white">Ask me anything</div>
                <div className="text-[10px] text-zinc-500">AI-powered help</div>
              </div>
              <Sparkles className="h-4.5 w-4.5 text-[#FFD23F] opacity-40" />
            </div>
          </button>
        </div>

        {/* === Tool buttons row === */}
        <div className="fade-up flex gap-3 w-full" style={{ marginTop: '16px', maxWidth: '360px', animationDelay: '1.4s' }}>
          {TOOLS.map((tool) => (
            <button
              key={tool.id}
              onClick={() => navigate(tool.path)}
              className="group flex-1 flex flex-col items-center gap-1.5 rounded-2xl bg-[#0e0e0e] border border-white/[0.06] py-3 transition-all duration-300 hover:border-white/[0.12] active:scale-[0.97]"
            >
              <span className="text-lg">{tool.emoji}</span>
              <span className="text-[11px] font-medium text-zinc-400 group-hover:text-zinc-200 transition-colors">{tool.label}</span>
            </button>
          ))}
        </div>

        {/* Footer */}
        <p className="fade-up text-center text-[10px] text-zinc-700 tracking-wider uppercase" style={{ marginTop: '40px', animationDelay: '1.6s' }}>
          The marketplace for everything
        </p>

      </div>
    </div>
  )
}
