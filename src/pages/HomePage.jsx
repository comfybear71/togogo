import { useNavigate } from 'react-router-dom'
import { Check } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'

const EVERYTHING = [
  'Every product in the world',
  'Every platform in the world',
  'Every type of marketing',
  'Unlimited listings',
  'AI assistant',
  'All suppliers unlocked',
  'Print-on-demand included',
  'Advanced analytics',
]

export default function HomePage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  const handleGetStarted = () => {
    if (user) {
      navigate('/profile')
    } else {
      navigate('/auth')
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

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center" style={{ paddingTop: '10vh', paddingBottom: '40px', paddingLeft: '20px', paddingRight: '20px' }}>

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

        {/* Price card */}
        <div className="fade-up w-full" style={{ marginTop: '48px', maxWidth: '360px', animationDelay: '1s' }}>
          <div className="relative rounded-2xl border border-[#FF6B35]/30 bg-[#0e0e0e] p-8 text-center">

            {/* Price */}
            <div className="mb-2">
              <span className="font-heading text-5xl font-bold text-white">$19.99</span>
              <span className="text-sm text-zinc-500">/mo</span>
            </div>
            <p className="text-sm text-zinc-400 mb-6">One plan. Everything included.</p>

            {/* What you get */}
            <ul className="space-y-3 text-left mb-8">
              {EVERYTHING.map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <Check className="h-4 w-4 flex-shrink-0 text-[#06D6A0]" />
                  <span className="text-sm text-zinc-300">{item}</span>
                </li>
              ))}
            </ul>

            {/* CTA */}
            <button
              onClick={handleGetStarted}
              className="w-full rounded-xl bg-[#FF6B35] py-4 text-base font-bold text-white transition-all hover:bg-[#e55a2b] active:scale-[0.98]"
            >
              Get Started
            </button>

            <p className="text-[10px] text-zinc-600 mt-3">Cancel anytime. No long-term commitment.</p>
          </div>
        </div>

        {/* Footer */}
        <p className="fade-up text-center text-[10px] text-zinc-700 tracking-wider uppercase" style={{ marginTop: '40px', animationDelay: '1.4s' }}>
          The marketplace for everything
        </p>

      </div>
    </div>
  )
}
