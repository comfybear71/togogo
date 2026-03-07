import { Store, ArrowRight, Users, Percent, BarChart3, Palette } from 'lucide-react'

const PLATFORMS = [
  {
    name: 'Shopify',
    desc: 'Build your own branded store with full control over design and pricing',
    tags: ['Own Store', 'Dropshipping'],
    color: '#06D6A0',
    bestFor: 'Best for building a brand',
    url: 'https://shopify.com',
  },
  {
    name: 'eBay',
    desc: 'Massive audience for new and used items. Auctions or fixed price',
    tags: ['Marketplace', 'Auctions'],
    color: '#FF6B35',
    bestFor: 'Best for used/vintage items',
    url: 'https://ebay.com',
  },
  {
    name: 'Amazon',
    desc: 'The biggest marketplace. FBA handles storage, packing, and shipping',
    tags: ['Marketplace', 'FBA'],
    color: '#FFD23F',
    bestFor: 'Best for volume sellers',
    url: 'https://sell.amazon.com',
  },
  {
    name: 'Etsy',
    desc: 'Perfect for handmade, vintage, and creative products',
    tags: ['Handmade', 'Creative'],
    color: '#FF6B35',
    bestFor: 'Best for crafters & artists',
    url: 'https://etsy.com',
  },
  {
    name: 'Facebook Marketplace',
    desc: 'Sell locally or ship nationwide. No listing fees',
    tags: ['Local', 'Free Listings'],
    color: '#a78bfa',
    bestFor: 'Best for beginners',
    url: 'https://facebook.com/marketplace',
  },
  {
    name: 'Depop',
    desc: 'Social-first marketplace popular with Gen Z for fashion and streetwear',
    tags: ['Fashion', 'Social'],
    color: '#06D6A0',
    bestFor: 'Best for trendy fashion',
    url: 'https://depop.com',
  },
]

const FEATURES = [
  { icon: Percent, title: 'Fee Comparison', desc: 'Compare listing fees, commissions, and costs', color: '#FF6B35' },
  { icon: Users, title: 'Audience Reach', desc: 'See how many buyers each platform attracts', color: '#06D6A0' },
  { icon: Palette, title: 'Niche Fit', desc: 'Find which platform suits your product type', color: '#FFD23F' },
  { icon: BarChart3, title: 'Seller Tools', desc: 'Analytics, ads, and listing optimisation', color: '#a78bfa' },
]

export default function PlatformsPage() {
  return (
    <div className="py-6">
      {/* Page title */}
      <div className="flex items-center gap-3 mb-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFD23F]/15">
          <Store className="h-5 w-5 text-[#FFD23F]" />
        </div>
        <h1 className="text-xl font-heading font-bold text-white">Selling Platforms</h1>
      </div>

      {/* Hero */}
      <div className="text-center mb-10">
        <h2 className="font-heading text-3xl font-bold text-white mb-4">
          Where to Sell
        </h2>
        <p className="text-sm text-zinc-500 max-w-[300px] mx-auto leading-relaxed">
          Compare the top platforms to sell your products. Find the right fit for your niche, budget, and audience.
        </p>
      </div>

      {/* Platform cards */}
      <div className="space-y-3 max-w-lg mx-auto mb-10">
        {PLATFORMS.map((p) => (
          <a
            key={p.name}
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-4 rounded-2xl bg-[#111] border border-white/[0.06] p-4 hover:border-white/[0.12] transition-all duration-300"
          >
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl flex-shrink-0 text-lg font-bold"
              style={{ backgroundColor: `${p.color}15`, color: p.color }}
            >
              {p.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="text-sm font-semibold text-white">{p.name}</h3>
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed">{p.desc}</p>
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: `${p.color}15`, color: p.color }}
                >
                  {p.bestFor}
                </span>
                {p.tags.map((tag) => (
                  <span key={tag} className="text-[10px] font-medium text-zinc-400 bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-zinc-600 group-hover:text-white transition-colors flex-shrink-0" />
          </a>
        ))}
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
    </div>
  )
}
