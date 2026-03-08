import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

const MARKETPLACES = [
  {
    name: 'eBay',
    initials: 'eB',
    color: '#E53238',
    desc: 'The easiest place to start. List for free, 130M+ buyers worldwide. Auctions or fixed price.',
    fees: 'Free to list. 10-15% when you sell.',
    bestFor: 'Beginners, used items, electronics, collectibles',
  },
  {
    name: 'Etsy',
    initials: 'Et',
    color: '#F56400',
    desc: 'Perfect for handmade, vintage, and creative products. 90M+ active buyers.',
    fees: '20c per listing + 6.5% when you sell.',
    bestFor: 'Print-on-demand, custom items, crafts, digital downloads',
  },
  {
    name: 'Amazon',
    initials: 'Az',
    color: '#FF9900',
    desc: 'The biggest marketplace. FBA (Fulfilled by Amazon) handles storage and shipping for you.',
    fees: '$39.99/mo + 8-15% referral fee.',
    bestFor: 'Volume sellers, branded products, serious businesses',
  },
  {
    name: 'TikTok Shop',
    initials: 'TT',
    color: '#ff0050',
    desc: 'Sell through videos and livestreams. Huge Gen Z audience. Products go viral here.',
    fees: 'Free to join. 5% when you sell.',
    bestFor: 'Trendy products, impulse buys, anything visual',
  },
  {
    name: 'Facebook Marketplace',
    initials: 'FB',
    color: '#1877F2',
    desc: 'Sell locally or ship nationwide. No listing fees. Massive audience.',
    fees: 'Free locally. 5% for shipped items.',
    bestFor: 'Local selling, furniture, clothing, quick sales',
  },
  {
    name: 'Depop',
    initials: 'Dp',
    color: '#FF2300',
    desc: 'Social-first marketplace for fashion and streetwear. Big with younger buyers.',
    fees: '10% when you sell.',
    bestFor: 'Fashion, vintage clothing, streetwear, trendy items',
  },
]

const STOREFRONTS = [
  {
    name: 'Shopify',
    initials: 'Sh',
    color: '#95BF47',
    desc: 'The #1 platform for building your own branded online store. Integrates with everything.',
    cost: 'From $39/mo',
  },
  {
    name: 'WooCommerce',
    initials: 'Wc',
    color: '#7F54B3',
    desc: 'Free WordPress plugin. Full control over your store. Thousands of extensions.',
    cost: 'Free (hosting from $2.95/mo)',
  },
  {
    name: 'Wix',
    initials: 'Wx',
    color: '#0C6EFC',
    desc: 'Drag-and-drop builder with AI design tools. Great for beginners.',
    cost: 'From $27/mo',
  },
]

function GlowCard({ initials, color, name, children }) {
  const glow = `${color}25`
  return (
    <div className="relative rounded-2xl overflow-hidden">
      <div
        className="absolute inset-0 rounded-2xl opacity-60"
        style={{ background: `linear-gradient(135deg, ${color}30, transparent 50%, ${color}15)` }}
      />
      <div
        className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-30"
        style={{ backgroundColor: color }}
      />
      <div className="relative rounded-2xl bg-[#0c0c0c]/90 border p-4" style={{ borderColor: `${color}25` }}>
        <div className="flex items-center gap-3 mb-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-xl text-xs font-extrabold tracking-tight"
            style={{
              backgroundColor: `${color}20`,
              color: color,
              boxShadow: `0 0 20px ${glow}, inset 0 0 20px ${glow}`,
            }}
          >
            {initials}
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">{name}</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }} />
              <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color }}>Supported</span>
            </div>
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}

export default function PlatformsPage() {
  const navigate = useNavigate()

  return (
    <div className="py-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/')}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.05] text-zinc-400 hover:text-white transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-xl font-heading font-bold text-white">Selling Platforms</h1>
          <p className="text-[11px] text-zinc-500">Where you can sell your products</p>
        </div>
      </div>

      {/* Intro */}
      <div className="rounded-2xl bg-[#111] border border-white/[0.06] p-5 mb-5">
        <p className="text-sm text-zinc-300 leading-relaxed">
          ToGoGo lets you sell on <span className="text-white font-semibold">every major platform</span>. Start on free marketplaces like eBay, then expand to your own store as you grow. We connect to all of them.
        </p>
      </div>

      {/* Marketplaces */}
      <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 px-1">Marketplaces</h2>
      <div className="space-y-4 mb-6">
        {MARKETPLACES.map((p) => (
          <GlowCard key={p.name} initials={p.initials} color={p.color} name={p.name}>
            <p className="text-xs text-zinc-400 leading-relaxed mb-3">{p.desc}</p>
            <div className="space-y-1.5">
              <div className="flex gap-3 items-start">
                <span className="text-[9px] font-bold uppercase tracking-wider w-[52px] flex-shrink-0" style={{ color: p.color }}>Fees</span>
                <span className="text-[11px] text-zinc-300">{p.fees}</span>
              </div>
              <div className="flex gap-3 items-start">
                <span className="text-[9px] font-bold uppercase tracking-wider w-[52px] flex-shrink-0" style={{ color: p.color }}>Best for</span>
                <span className="text-[11px] text-zinc-300">{p.bestFor}</span>
              </div>
            </div>
          </GlowCard>
        ))}
      </div>

      {/* Own store */}
      <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 px-1">Your own store</h2>
      <div className="space-y-4">
        {STOREFRONTS.map((p) => (
          <GlowCard key={p.name} initials={p.initials} color={p.color} name={p.name}>
            <p className="text-xs text-zinc-400 leading-relaxed mb-2">{p.desc}</p>
            <div className="flex gap-3 items-start">
              <span className="text-[9px] font-bold uppercase tracking-wider w-[52px] flex-shrink-0" style={{ color: p.color }}>Cost</span>
              <span className="text-[11px] text-zinc-300">{p.cost}</span>
            </div>
          </GlowCard>
        ))}
      </div>

      <div className="h-8" />
    </div>
  )
}
