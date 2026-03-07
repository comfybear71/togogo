import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ArrowRight, Sparkles, Truck, Megaphone, Bot } from 'lucide-react'

export default function HomePage() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef(null)

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
    <div className="relative min-h-[100dvh] overflow-hidden">

      {/* Background orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -right-20 h-[500px] w-[500px] rounded-full opacity-[0.07]" style={{ background: 'radial-gradient(circle, #FF6B35 0%, transparent 70%)', animation: 'orb-drift 12s ease-in-out infinite' }} />
        <div className="absolute -bottom-32 -left-32 h-[600px] w-[600px] rounded-full opacity-[0.06]" style={{ background: 'radial-gradient(circle, #06D6A0 0%, transparent 70%)', animation: 'orb-drift-reverse 15s ease-in-out infinite' }} />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 h-[400px] w-[400px] rounded-full opacity-[0.04]" style={{ background: 'radial-gradient(circle, #FFD23F 0%, transparent 70%)', animation: 'orb-drift 18s ease-in-out 2s infinite' }} />
      </div>

      {/* Content — positioned upper-center, not dead center */}
      <div className="relative z-10 flex flex-col items-center" style={{ paddingTop: '15vh', paddingBottom: '40px', paddingLeft: '24px', paddingRight: '24px' }}>

        {/* Dots */}
        <div className="flex items-center justify-center gap-4" style={{ marginBottom: '32px' }}>
          <div className="dot-animate-1 w-2.5 h-2.5 rounded-full bg-[#FF6B35] shadow-[0_0_12px_rgba(255,107,53,0.4)]" />
          <div className="dot-animate-2 w-2.5 h-2.5 rounded-full bg-[#FFD23F] shadow-[0_0_12px_rgba(255,210,63,0.4)]" />
          <div className="dot-animate-3 w-2.5 h-2.5 rounded-full bg-[#06D6A0] shadow-[0_0_12px_rgba(6,214,160,0.4)]" />
        </div>

        {/* Logo */}
        <h1 className="font-heading text-6xl sm:text-7xl font-bold tracking-tight text-center">
          {letters.map((letter, i) => (
            <span key={i} className="letter-animate" style={{ color: letter.color, animationDelay: letter.delay, animationFillMode: 'forwards', display: 'inline-block' }}>
              <span className="letter-float" style={{ display: 'inline-block', animationDelay: `${i * 0.3}s` }}>
                {letter.char}
              </span>
            </span>
          ))}
        </h1>

        {/* Tagline */}
        <p className="fade-up text-center text-[11px] sm:text-xs tracking-[0.3em] uppercase text-zinc-500 font-semibold" style={{ marginTop: '20px', animationDelay: '0.8s' }}>
          Trade &middot; Swap &middot; Connect &middot; Share
        </p>

        {/* === Search — narrower, centrepiece === */}
        <form onSubmit={handleSearch} className="fade-up" style={{ marginTop: '56px', width: '75%', maxWidth: '260px', animationDelay: '1s' }}>
          <div className={`relative rounded-full transition-all duration-500 ${isFocused ? 'bg-[#222] shadow-[0_0_0_1px_rgba(255,107,53,0.25),0_0_40px_rgba(255,107,53,0.06)]' : 'bg-[#222] shadow-[0_0_0_1px_rgba(255,255,255,0.1)]'}`}>
            <div className="flex items-center">
              <div className="pl-5">
                <Search className={`h-4.5 w-4.5 transition-colors duration-300 ${isFocused ? 'text-[#FF6B35]' : 'text-zinc-500'}`} />
              </div>
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="Search for anything..."
                className="flex-1 bg-transparent py-6 px-3 text-sm text-white placeholder:text-zinc-400 focus:outline-none"
              />
              {searchQuery.trim() && (
                <button type="submit" className="mr-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-[#FF6B35] text-white transition-all hover:scale-110 active:scale-95">
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </form>

        {/* === AI Assistant — narrower to match === */}
        <div className="fade-up" style={{ marginTop: '28px', width: '75%', maxWidth: '260px', animationDelay: '1.2s' }}>
          <button
            onClick={() => navigate('/assistant')}
            className="group relative w-full overflow-hidden rounded-2xl p-[1px] transition-all duration-300"
            style={{ background: 'linear-gradient(135deg, #FF6B35, #FFD23F, #06D6A0)', backgroundSize: '200% 200%', animation: 'gradient-shift 4s ease infinite' }}
          >
            <div className="flex items-center gap-3 rounded-[15px] bg-[#0a0a0a] px-5 py-5 transition-all duration-300 group-hover:bg-[#0a0a0a]/80">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF6B35]/20 to-[#06D6A0]/20">
                <Bot className="h-4.5 w-4.5 text-[#FF6B35]" />
              </div>
              <div className="text-left flex-1">
                <div className="text-sm font-semibold text-white">AI Assistant</div>
                <div className="text-[11px] text-zinc-500">Ask me anything</div>
              </div>
              <Sparkles className="h-4 w-4 text-[#FFD23F] opacity-60" />
            </div>
          </button>
        </div>

        {/* === Shipping + Marketing — same width === */}
        <div className="fade-up flex gap-3" style={{ marginTop: '20px', width: '75%', maxWidth: '260px', animationDelay: '1.4s' }}>
          <button
            onClick={() => navigate('/shipping')}
            className="group flex-1 flex items-center gap-2 rounded-2xl bg-[#0e0e0e] border border-white/[0.06] pl-3 pr-4 py-3 transition-all duration-300 hover:border-[#06D6A0]/30"
          >
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-[#06D6A0]/10">
              <Truck className="h-3.5 w-3.5 text-[#06D6A0]" />
            </div>
            <span className="text-sm font-medium text-zinc-300">Shipping</span>
          </button>

          <button
            onClick={() => navigate('/marketing')}
            className="group flex-1 flex items-center gap-2 rounded-2xl bg-[#0e0e0e] border border-white/[0.06] pl-3 pr-4 py-3 transition-all duration-300 hover:border-[#FFD23F]/30"
          >
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-[#FFD23F]/10">
              <Megaphone className="h-3.5 w-3.5 text-[#FFD23F]" />
            </div>
            <span className="text-sm font-medium text-zinc-300">Marketing</span>
          </button>
        </div>

        {/* Footer */}
        <p className="fade-up text-center text-[10px] text-zinc-700 tracking-wider uppercase" style={{ marginTop: '56px', animationDelay: '1.6s' }}>
          The marketplace for everything
        </p>

      </div>
    </div>
  )
}
