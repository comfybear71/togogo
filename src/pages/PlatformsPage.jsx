import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

const MARKETPLACES = [
  {
    name: 'eBay',
    emoji: '🏷️',
    color: '#E53238',
    desc: 'The easiest place to start. List for free, 130M+ buyers worldwide. Auctions or fixed price.',
    fees: 'Free to list. 10-15% when you sell.',
    bestFor: 'Beginners, used items, electronics, collectibles',
  },
  {
    name: 'Etsy',
    emoji: '🎨',
    color: '#F56400',
    desc: 'Perfect for handmade, vintage, and creative products. 90M+ active buyers.',
    fees: '20c per listing + 6.5% when you sell.',
    bestFor: 'Print-on-demand, custom items, crafts, digital downloads',
  },
  {
    name: 'Amazon',
    emoji: '📦',
    color: '#FF9900',
    desc: 'The biggest marketplace. FBA (Fulfilled by Amazon) handles storage and shipping for you.',
    fees: '$39.99/mo + 8-15% referral fee.',
    bestFor: 'Volume sellers, branded products, serious businesses',
  },
  {
    name: 'TikTok Shop',
    emoji: '🎵',
    color: '#000000',
    desc: 'Sell through videos and livestreams. Huge Gen Z audience. Products go viral here.',
    fees: 'Free to join. 5% when you sell.',
    bestFor: 'Trendy products, impulse buys, anything visual',
  },
  {
    name: 'Facebook Marketplace',
    emoji: '👥',
    color: '#1877F2',
    desc: 'Sell locally or ship nationwide. No listing fees. Massive audience.',
    fees: 'Free locally. 5% for shipped items.',
    bestFor: 'Local selling, furniture, clothing, quick sales',
  },
  {
    name: 'Depop',
    emoji: '👗',
    color: '#FF2300',
    desc: 'Social-first marketplace for fashion and streetwear. Big with younger buyers.',
    fees: '10% when you sell.',
    bestFor: 'Fashion, vintage clothing, streetwear, trendy items',
  },
]

const STOREFRONTS = [
  {
    name: 'Shopify',
    emoji: '🛒',
    desc: 'The #1 platform for building your own branded online store. Integrates with everything.',
    cost: 'From $39/mo',
  },
  {
    name: 'WooCommerce',
    emoji: '🔧',
    desc: 'Free WordPress plugin. Full control over your store. Thousands of extensions.',
    cost: 'Free (hosting from $2.95/mo)',
  },
  {
    name: 'Wix',
    emoji: '✨',
    desc: 'Drag-and-drop builder with AI design tools. Great for beginners.',
    cost: 'From $27/mo',
  },
]

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
      <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 px-1">Marketplaces (sell where the buyers already are)</h2>
      <div className="space-y-3 mb-6">
        {MARKETPLACES.map((p) => (
          <div key={p.name} className="rounded-2xl bg-[#111] border border-white/[0.06] p-4">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xl">{p.emoji}</span>
              <h3 className="text-sm font-bold text-white">{p.name}</h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed mb-2">{p.desc}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <span className="text-[10px] text-zinc-500"><span className="text-zinc-300 font-medium">Fees:</span> {p.fees}</span>
              <span className="text-[10px] text-zinc-500"><span className="text-zinc-300 font-medium">Best for:</span> {p.bestFor}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Own store */}
      <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 px-1">Your own store (build your brand)</h2>
      <div className="space-y-3">
        {STOREFRONTS.map((p) => (
          <div key={p.name} className="rounded-2xl bg-[#111] border border-white/[0.06] p-4">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xl">{p.emoji}</span>
              <div>
                <h3 className="text-sm font-bold text-white">{p.name}</h3>
                <span className="text-[10px] text-zinc-500">{p.cost}</span>
              </div>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">{p.desc}</p>
          </div>
        ))}
      </div>

      <div className="h-20" />
    </div>
  )
}
