import { Megaphone, Target, TrendingUp, Zap, PenTool } from 'lucide-react'

const FEATURES = [
  {
    icon: PenTool,
    title: 'AI Copywriting',
    desc: 'Generate product descriptions & ad copy',
    color: '#FFD23F',
  },
  {
    icon: Target,
    title: 'Audience Targeting',
    desc: 'Find your ideal customers automatically',
    color: '#FF6B35',
  },
  {
    icon: TrendingUp,
    title: 'SEO Optimisation',
    desc: 'Rank higher with smart keyword tools',
    color: '#06D6A0',
  },
  {
    icon: Zap,
    title: 'Campaign Builder',
    desc: 'Launch multi-channel campaigns fast',
    color: '#FFD23F',
  },
]

export default function MarketingPage() {
  return (
    <div className="py-6">
      {/* Page title */}
      <div className="flex items-center gap-3 mb-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFD23F]/15">
          <Megaphone className="h-5 w-5 text-[#FFD23F]" />
        </div>
        <h1 className="text-xl font-heading font-bold text-white">Marketing</h1>
      </div>

      {/* Hero */}
      <div className="text-center mb-12">
        <h2 className="font-heading text-3xl font-bold text-white mb-4">
          Grow Your Sales
        </h2>
        <p className="text-sm text-zinc-500 max-w-[280px] mx-auto leading-relaxed">
          AI-powered marketing tools to help you reach more customers and boost conversions.
        </p>
      </div>

      {/* Feature cards */}
      <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="group rounded-2xl bg-[#111] border border-white/[0.06] p-5 hover:border-white/[0.12] transition-all duration-300"
          >
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl mb-4 transition-transform duration-300 group-hover:scale-110"
              style={{ backgroundColor: `${f.color}15` }}
            >
              <f.icon className="h-5 w-5" style={{ color: f.color }} />
            </div>
            <h3 className="text-sm font-semibold text-white mb-1.5">{f.title}</h3>
            <p className="text-xs text-zinc-500 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="mt-12 text-center">
        <div className="inline-block rounded-2xl bg-[#111] border border-white/[0.06] px-8 py-6 max-w-sm">
          <p className="text-sm text-zinc-400 mb-4 leading-relaxed">
            Marketing suite coming soon. AI copywriting, campaign management, and analytics — all in one place.
          </p>
          <span className="inline-block text-xs font-medium text-[#FFD23F] bg-[#FFD23F]/10 px-4 py-1.5 rounded-full">
            Coming Soon
          </span>
        </div>
      </div>
    </div>
  )
}

