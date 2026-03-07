import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ArrowRight } from 'lucide-react'

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

  return (
    <div className="relative flex min-h-[calc(100vh-5rem)] flex-col items-center justify-center px-4">
      {/* Subtle ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[900px] rounded-full bg-gradient-to-br from-[#FF6B35]/[0.03] via-[#FFD23F]/[0.02] to-[#06D6A0]/[0.03] blur-[180px]" />
      </div>

      <div className="relative z-10 w-full max-w-xl text-center">
        {/* Three dots */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-3 h-3 rounded-full bg-[#FF6B35]" />
          <div className="w-3 h-3 rounded-full bg-[#FFD23F]" />
          <div className="w-3 h-3 rounded-full bg-[#06D6A0]" />
        </div>

        {/* Logo */}
        <h1 className="font-heading text-6xl sm:text-7xl lg:text-8xl font-bold tracking-tight">
          <span className="text-[#FF6B35]">T</span>
          <span className="text-white">o</span>
          <span className="text-[#FFD23F]">G</span>
          <span className="text-white">o</span>
          <span className="text-[#06D6A0]">G</span>
          <span className="text-white">o</span>
        </h1>

        {/* Tagline */}
        <p className="mt-3 text-xs sm:text-sm tracking-[0.25em] uppercase text-zinc-500 font-medium">
          Trade &middot; Swap &middot; Connect &middot; Share
        </p>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="mt-10">
          <div
            className={`relative rounded-full bg-[#111111] transition-all duration-300 ${
              isFocused
                ? 'shadow-[0_0_0_1px_rgba(255,107,53,0.3),0_0_30px_rgba(255,107,53,0.06)]'
                : 'shadow-[0_0_0_1px_rgba(255,255,255,0.06)]'
            }`}
          >
            <div className="flex items-center">
              <div className="pl-5">
                <Search
                  className={`h-4.5 w-4.5 transition-colors duration-300 ${
                    isFocused ? 'text-zinc-400' : 'text-zinc-600'
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
                className="flex-1 bg-transparent py-4 px-4 text-base text-white placeholder:text-zinc-500 focus:outline-none"
              />
              {searchQuery.trim() && (
                <button
                  type="submit"
                  className="mr-2 flex h-9 w-9 items-center justify-center rounded-full bg-[#FF6B35] text-white transition-transform hover:scale-105 active:scale-95"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </form>

        {/* Two action buttons */}
        <div className="mt-8 flex items-center justify-center gap-3">
          <button
            onClick={() => navigate('/shipping')}
            className="px-6 py-2.5 text-sm font-medium text-zinc-300 bg-[#111] border border-white/[0.06] rounded-full hover:bg-[#161616] hover:border-white/[0.1] transition-all"
          >
            Shipping API
          </button>
          <button
            onClick={() => navigate('/marketing')}
            className="px-6 py-2.5 text-sm font-medium text-zinc-300 bg-[#111] border border-white/[0.06] rounded-full hover:bg-[#161616] hover:border-white/[0.1] transition-all"
          >
            Marketing
          </button>
        </div>
      </div>
    </div>
  )
}
