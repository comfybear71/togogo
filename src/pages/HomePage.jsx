import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Sparkles, ArrowRight } from 'lucide-react'

const SUGGESTIONS = [
  'AirPods Pro',
  'Nike Air Max',
  'Samsung TV',
  'Dyson Vacuum',
  'PlayStation 5',
]

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

  const handleSuggestion = (text) => {
    navigate(`/browse?q=${encodeURIComponent(text)}`)
  }

  return (
    <div className="relative flex min-h-[calc(100vh-5rem)] flex-col items-center justify-center px-4">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 h-[600px] w-[900px] rounded-full bg-gradient-to-r from-[#FF6B35]/[0.04] via-[#FFD23F]/[0.03] to-[#06D6A0]/[0.04] blur-[150px]" />
        <div className="absolute bottom-1/4 left-1/3 h-[300px] w-[400px] rounded-full bg-[#FF6B35]/[0.02] blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/3 h-[300px] w-[400px] rounded-full bg-[#06D6A0]/[0.02] blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-2xl text-center">
        {/* Logo */}
        <h1 className="font-['Baloo_2'] text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight">
          <span className="text-[#FF6B35]">To</span>
          <span className="text-[#FFD23F]">Go</span>
          <span className="text-[#06D6A0]">Go</span>
        </h1>

        {/* Tagline */}
        <p className="mt-3 text-sm tracking-[0.2em] uppercase text-zinc-500 font-medium">
          Trade &middot; Swap &middot; Connect &middot; Share
        </p>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="mt-12">
          <div
            className={`relative rounded-2xl bg-[#111111] transition-all duration-300 ${
              isFocused
                ? 'shadow-[0_0_0_1px_rgba(255,107,53,0.3),0_0_40px_rgba(255,107,53,0.08)]'
                : 'shadow-[0_0_0_1px_rgba(255,255,255,0.06)]'
            }`}
          >
            <div className="flex items-center">
              <div className="pl-5">
                <Sparkles
                  className={`h-5 w-5 transition-colors duration-300 ${
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
                placeholder="What are you looking for?"
                className="flex-1 bg-transparent py-4.5 px-4 text-base text-white placeholder:text-zinc-500 focus:outline-none"
              />
              {searchQuery.trim() ? (
                <button
                  type="submit"
                  className="mr-2.5 flex h-9 w-9 items-center justify-center rounded-xl bg-[#FF6B35] text-white transition-transform hover:scale-105 active:scale-95"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  className="mr-4 text-zinc-600 hover:text-zinc-400 transition-colors"
                  onClick={() => inputRef.current?.focus()}
                >
                  <Search className="h-4.5 w-4.5" />
                </button>
              )}
            </div>
          </div>
        </form>

        {/* Suggestion chips */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => handleSuggestion(s)}
              className="rounded-full border border-white/[0.06] px-4 py-1.5 text-sm text-zinc-500 transition-all hover:border-white/[0.12] hover:text-zinc-300"
            >
              {s}
            </button>
          ))}
        </div>

        {/* Powered by AI */}
        <div className="mt-20 flex items-center justify-center gap-1.5 text-zinc-600">
          <Sparkles className="h-3 w-3" />
          <span className="text-xs">Powered by AI</span>
        </div>
      </div>
    </div>
  )
}
