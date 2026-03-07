import { Factory, Star, DollarSign, ShieldCheck, Globe, ArrowRight } from 'lucide-react'

const SUPPLIERS = [
  {
    name: 'AliExpress',
    desc: 'Millions of products, low prices, direct from manufacturers',
    tags: ['Dropshipping', 'Wholesale'],
    color: '#FF6B35',
    url: 'https://aliexpress.com',
  },
  {
    name: 'Spocket',
    desc: 'US/EU suppliers with fast shipping, auto-sync with your store',
    tags: ['Dropshipping', 'Fast Shipping'],
    color: '#06D6A0',
    url: 'https://spocket.co',
  },
  {
    name: 'CJ Dropshipping',
    desc: 'Product sourcing, warehousing, and global fulfilment',
    tags: ['Dropshipping', 'Fulfilment'],
    color: '#FFD23F',
    url: 'https://cjdropshipping.com',
  },
  {
    name: 'Alibaba',
    desc: 'Bulk wholesale from verified manufacturers worldwide',
    tags: ['Wholesale', 'Bulk Orders'],
    color: '#FF6B35',
    url: 'https://alibaba.com',
  },
  {
    name: 'Printful',
    desc: 'Print-on-demand: custom t-shirts, mugs, posters & more',
    tags: ['Print on Demand', 'Custom'],
    color: '#a78bfa',
    url: 'https://printful.com',
  },
  {
    name: 'Wholesale Central',
    desc: 'Directory of verified wholesalers across every category',
    tags: ['Wholesale', 'Directory'],
    color: '#06D6A0',
    url: 'https://wholesalecentral.com',
  },
]

const FEATURES = [
  { icon: DollarSign, title: 'Price Comparison', desc: 'Compare costs across suppliers instantly', color: '#FF6B35' },
  { icon: Star, title: 'Reliability Ratings', desc: 'See real reviews and fulfilment scores', color: '#FFD23F' },
  { icon: ShieldCheck, title: 'Verified Suppliers', desc: 'Only trusted, vetted suppliers listed', color: '#06D6A0' },
  { icon: Globe, title: 'Ship Worldwide', desc: 'Suppliers with global reach and fast delivery', color: '#a78bfa' },
]

export default function SuppliersPage() {
  return (
    <div className="py-6">
      {/* Page title */}
      <div className="flex items-center gap-3 mb-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FF6B35]/15">
          <Factory className="h-5 w-5 text-[#FF6B35]" />
        </div>
        <h1 className="text-xl font-heading font-bold text-white">Suppliers</h1>
      </div>

      {/* Hero */}
      <div className="text-center mb-10">
        <h2 className="font-heading text-3xl font-bold text-white mb-4">
          Find Products to Sell
        </h2>
        <p className="text-sm text-zinc-500 max-w-[300px] mx-auto leading-relaxed">
          Browse top suppliers for dropshipping, wholesale, and print-on-demand. Start selling without holding stock.
        </p>
      </div>

      {/* Supplier cards */}
      <div className="space-y-3 max-w-lg mx-auto mb-10">
        {SUPPLIERS.map((s) => (
          <a
            key={s.name}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-4 rounded-2xl bg-[#111] border border-white/[0.06] p-4 hover:border-white/[0.12] transition-all duration-300"
          >
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl flex-shrink-0 text-lg font-bold"
              style={{ backgroundColor: `${s.color}15`, color: s.color }}
            >
              {s.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-white mb-0.5">{s.name}</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">{s.desc}</p>
              <div className="flex gap-1.5 mt-2">
                {s.tags.map((tag) => (
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
