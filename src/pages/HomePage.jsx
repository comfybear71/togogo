import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ArrowRight, Sparkles, Truck, Megaphone, Bot } from 'lucide-react'

export default function HomePage() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [mounted, setMounted] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/browse?q=${encodeURIComponent(searchQuery.trim())}`)
    }
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
    <div className="relative flex min-h-[100dvh] flex-col items-center px-6 overflow-hidden">

      {/* ===== Animated background orbs ===== */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-20 -right-20 h-[500px] w-[500px] rounded-full opacity-[0.07]"
          style={{
            background: 'radial-gradient(circle, #FF6B35 0%, transparent 70%)',
            animation: 'orb-drift 12s ease-in-out infinite',
          }}
        />
        <div
          className="absolute -bottom-32 -left-32 h-[600px] w-[600px] rounded-full opacity-[0.06]"
          style={{
            background: 'radial-gradient(circle, #06D6A0 0%, transparent 70%)',
            animation: 'orb-drift-reverse 15s ease-in-out infinite',
          }}
        />
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 h-[400px] w-[400px] rounded-full opacity-[0.04]"
          style={{
            background: 'radial-gradient(circle, #FFD23F 0%, transparent 70%)',
            animation: 'orb-drift 18s ease-in-out 2s infinite',
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat',
            backgroundSize: '128px 128px',
          }}
        />
      </div>

      {/* ===== Top spacer ===== */}
      <div className="flex-1 min-h-[15vh]" />

      {/* ===== Brand section ===== */}
      <div className="relative z-10 w-full max-w-md text-center">

        {/* Animated dots */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className="dot-animate-1 w-2.5 h-2.5 rounded-full bg-[#FF6B35] shadow-[0_0_12px_rgba(255,107,53,0.4)]" />
          <div className="dot-animate-2 w-2.5 h-2.5 rounded-full bg-[#FFD23F] shadow-[0_0_12px_rgba(255,210,63,0.4)]" />
          <div className="dot-animate-3 w-2.5 h-2.5 rounded-full bg-[#06D6A0] shadow-[0_0_12px_rgba(6,214,160,0.4)]" />
        </div>

        {/* Animated Logo */}
        <h1 className="font-heading text-6xl sm:text-7xl lg:text-8xl font-bold tracking-tight">
          {letters.map((letter, i) => (
            <span
              key={i}
              className="letter-animate"
              style={{
                color: letter.color,
                animationDelay: letter.delay,
                animationFillMode: 'forwards',
                display: 'inline-block',
              }}
            >
              <span
                className="letter-float"
                style={{
                  display: 'inline-block',
                  animationDelay: `${i * 0.3}s`,
                }}
              >
                {letter.char}
              </span>
            </span>
          ))}
        </h1>

        {/* Tagline */}
        <p
          className="fade-up mt-6 text-[11px] sm:text-xs tracking-[0.3em] uppercase text-zinc-500 font-semibold"
          style={{ animationDelay: '0.8s' }}
        >
          Trade &middot; Swap &middot; Connect &middot; Share
        </p>
      </div>

      {/* ===== Middle spacer ===== */}
      <div className="flex-1 min-h-[8vh]" />

      {/* ===== Search + Actions section ===== */}
      <div className="relative z-10 w-full max-w-md">

        {/* Search bar */}
        <form
          onSubmit={handleSearch}
          className="fade-up"
          style={{ animationDelay: '1s' }}
        >
          <div
            className={`relative rounded-full transition-all duration-500 ${
              isFocused
                ? 'bg-[#0e0e0e] shadow-[0_0_0_1px_rgba(255,107,53,0.25),0_0_40px_rgba(255,107,53,0.06),0_0_80px_rgba(6,214,160,0.03)]'
                : 'bg-[#0e0e0e] shadow-[0_0_0_1px_rgba(255,255,255,0.06)]'
            }`}
          >
            <div className="flex items-center">
              <div className="pl-5">
                <Search
                  className={`h-4 w-4 transition-colors duration-300 ${
                    isFocused ? 'text-[#FF6B35]' : 'text-zinc-600'
                  }`}
                />
              </div>
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="Search for anything..."
                className="flex-1 bg-transparent py-3.5 px-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none"
              />
              {searchQuery.trim() && (
                <button
                  type="submit"
                  className="mr-2 flex h-8 w-8 items-center justify-center rounded-full bg-[#FF6B35] text-white transition-all hover:scale-110 hover:shadow-[0_0_20px_rgba(255,107,53,0.3)] active:scale-95"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </form>

        {/* AI Assistant Button */}
        <div
          className="fade-up mt-6"
          style={{ animationDelay: '1.2s' }}
        >
          <button
            onClick={() => navigate('/assistant')}
            className="group relative w-full overflow-hidden rounded-2xl p-[1px] transition-all duration-300"
            style={{
              background: 'linear-gradient(135deg, #FF6B35, #FFD23F, #06D6A0)',
              backgroundSize: '200% 200%',
              animation: 'gradient-shift 4s ease infinite',
            }}
          >
            <div className="flex items-center justify-center gap-3 rounded-[15px] bg-[#0a0a0a] px-6 py-4 transition-all duration-300 group-hover:bg-[#0a0a0a]/80">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF6B35]/20 to-[#06D6A0]/20 transition-transform duration-300 group-hover:scale-110">
                <Bot className="h-4.5 w-4.5 text-[#FF6B35]" />
              </div>
              <div className="text-left">
                <span className="text-sm font-semibold text-white">AI Assistant</span>
                <span className="ml-2 text-xs text-zinc-500">Ask me anything</span>
              </div>
              <Sparkles className="ml-auto h-4 w-4 text-[#FFD23F] opacity-60 transition-all duration-300 group-hover:opacity-100 group-hover:rotate-12" />
            </div>
          </button>
        </div>

        {/* Shipping + Marketing */}
        <div
          className="fade-up mt-4 flex gap-4"
          style={{ animationDelay: '1.4s' }}
        >
          <button
            onClick={() => navigate('/shipping')}
            className="group flex-1 flex items-center justify-center gap-2.5 rounded-2xl bg-[#0e0e0e] border border-white/[0.06] px-4 py-3.5 transition-all duration-300 hover:border-[#06D6A0]/30 hover:shadow-[0_0_30px_rgba(6,214,160,0.08)]"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#06D6A0]/10 transition-all duration-300 group-hover:bg-[#06D6A0]/20 group-hover:scale-110">
              <Truck className="h-4 w-4 text-[#06D6A0]" />
            </div>
            <span className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">
              Shipping API
            </span>
          </button>

          <button
            onClick={() => navigate('/marketing')}
            className="group flex-1 flex items-center justify-center gap-2.5 rounded-2xl bg-[#0e0e0e] border border-white/[0.06] px-4 py-3.5 transition-all duration-300 hover:border-[#FFD23F]/30 hover:shadow-[0_0_30px_rgba(255,210,63,0.08)]"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFD23F]/10 transition-all duration-300 group-hover:bg-[#FFD23F]/20 group-hover:scale-110">
              <Megaphone className="h-4 w-4 text-[#FFD23F]" />
            </div>
            <span className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">
              Marketing
            </span>
          </button>
        </div>
      </div>

      {/* ===== Bottom spacer with branding ===== */}
      <div className="flex-1 min-h-[6vh] flex items-end pb-8">
        <p
          className="fade-up text-[10px] text-zinc-700 tracking-wider uppercase"
          style={{ animationDelay: '1.6s' }}
        >
          The marketplace for everything
        </p>
      </div>
    </div>
  )
}
