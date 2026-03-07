import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Truck, Package, Globe, Clock, Calculator } from 'lucide-react'

const FEATURES = [
  {
    icon: Calculator,
    title: 'Rate Calculator',
    desc: 'Compare rates across carriers instantly',
    color: '#FF6B35',
  },
  {
    icon: Globe,
    title: 'International',
    desc: 'Ship worldwide with customs handled',
    color: '#06D6A0',
  },
  {
    icon: Clock,
    title: 'Live Tracking',
    desc: 'Real-time updates for every parcel',
    color: '#FFD23F',
  },
  {
    icon: Package,
    title: 'Bulk Shipping',
    desc: 'Discounted rates for high volume',
    color: '#FF6B35',
  },
]

export default function ShippingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-[100dvh] bg-[#050505] px-6 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-10">
        <button
          onClick={() => navigate('/')}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] text-zinc-400 hover:text-white hover:bg-white/[0.1] transition-all"
        >
          <ArrowLeft className="h-4.5 w-4.5" />
        </button>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#06D6A0]/15">
            <Truck className="h-5 w-5 text-[#06D6A0]" />
          </div>
          <h1 className="text-xl font-heading font-bold text-white">Shipping API</h1>
        </div>
      </div>

      {/* Hero */}
      <div className="text-center mb-12">
        <h2 className="font-heading text-3xl font-bold text-white mb-4">
          Ship Smarter
        </h2>
        <p className="text-sm text-zinc-500 max-w-[280px] mx-auto leading-relaxed">
          Integrated shipping API with real-time rates, tracking, and label generation across major carriers.
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
            Shipping API integration coming soon. Stay tuned for rate comparison, label generation, and automated tracking.
          </p>
          <span className="inline-block text-xs font-medium text-[#06D6A0] bg-[#06D6A0]/10 px-4 py-1.5 rounded-full">
            Coming Soon
          </span>
        </div>
      </div>
    </div>
  )
}
