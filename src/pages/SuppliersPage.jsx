import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

const SUPPLIERS = [
  {
    name: 'CJ Dropshipping',
    initials: 'CJ',
    color: '#FF6B35',
    glow: 'rgba(255,107,53,0.15)',
    what: 'Massive product catalogue with warehouses worldwide. Fast shipping, quality control, and custom packaging.',
    products: 'Electronics, fashion, home, beauty, gadgets — millions of products',
    shipping: '5-15 days (US/EU warehouses available for 3-5 day delivery)',
    cost: 'Free to use. You only pay per product when you sell.',
  },
  {
    name: 'AliExpress',
    initials: 'Ali',
    color: '#E53238',
    glow: 'rgba(229,50,56,0.15)',
    what: 'The world\'s biggest wholesale marketplace. Endless product selection at rock-bottom prices.',
    products: 'Literally everything — 100+ million products across every category',
    shipping: '7-20 days standard, 3-7 days with AliExpress Premium',
    cost: 'Free. Buy at wholesale prices, sell at retail.',
  },
  {
    name: 'Printful',
    initials: 'PF',
    color: '#29AB51',
    glow: 'rgba(41,171,81,0.15)',
    what: 'Print-on-demand. Upload your designs, they print and ship when someone orders. Zero inventory.',
    products: 'T-shirts, hoodies, mugs, phone cases, posters, hats, bags, and more',
    shipping: '3-5 business days (printed in US, EU, or AU)',
    cost: 'Free to use. You pay per item only when a customer orders.',
  },
  {
    name: 'Printify',
    initials: 'Pi',
    color: '#39B54A',
    glow: 'rgba(57,181,74,0.15)',
    what: 'Print-on-demand with 80+ print providers worldwide. More options and competitive pricing.',
    products: 'Apparel, accessories, home decor, drinkware, stationery',
    shipping: '3-7 business days (multiple print locations)',
    cost: 'Free plan available. Premium plan $29/mo for up to 20% cheaper products.',
  },
  {
    name: 'Gooten',
    initials: 'Go',
    color: '#00A9E0',
    glow: 'rgba(0,169,224,0.15)',
    what: 'Enterprise print-on-demand with automated routing to the nearest manufacturer.',
    products: 'Apparel, wall art, photo books, home goods, accessories',
    shipping: '3-8 business days (smart routing for fastest delivery)',
    cost: 'Free to use. Pay per product when orders come in.',
  },
]

export default function SuppliersPage() {
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
          <h1 className="text-xl font-heading font-bold text-white">Our Suppliers</h1>
          <p className="text-[11px] text-zinc-500">Who we work with to get you products</p>
        </div>
      </div>

      {/* Intro */}
      <div className="rounded-2xl bg-[#111] border border-white/[0.06] p-5 mb-5">
        <p className="text-sm text-zinc-300 leading-relaxed">
          ToGoGo connects you to <span className="text-white font-semibold">5 world-class suppliers</span> so you can sell anything without buying stock upfront. When a customer buys from you, the supplier ships directly to them. You keep the profit.
        </p>
      </div>

      {/* Supplier cards */}
      <div className="space-y-4">
        {SUPPLIERS.map((s) => (
          <div
            key={s.name}
            className="relative rounded-2xl overflow-hidden"
          >
            {/* Glowing border effect */}
            <div
              className="absolute inset-0 rounded-2xl opacity-60"
              style={{
                background: `linear-gradient(135deg, ${s.color}30, transparent 50%, ${s.color}15)`,
              }}
            />
            <div
              className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-30"
              style={{ backgroundColor: s.color }}
            />

            <div className="relative rounded-2xl bg-[#0c0c0c]/90 border border-white/[0.08] p-5" style={{ borderColor: `${s.color}25` }}>
              {/* Logo + Name */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="flex items-center justify-center w-11 h-11 rounded-xl text-sm font-extrabold tracking-tight"
                  style={{
                    backgroundColor: `${s.color}20`,
                    color: s.color,
                    boxShadow: `0 0 20px ${s.glow}, inset 0 0 20px ${s.glow}`,
                  }}
                >
                  {s.initials}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{s.name}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color, boxShadow: `0 0 6px ${s.color}` }} />
                    <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: s.color }}>Active Partner</span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-zinc-400 leading-relaxed mb-4">{s.what}</p>

              {/* Info rows with colored accents */}
              <div className="space-y-2.5">
                <div className="flex gap-3 items-start">
                  <span
                    className="text-[9px] font-bold uppercase tracking-wider w-[60px] flex-shrink-0 pt-0.5"
                    style={{ color: s.color }}
                  >
                    Products
                  </span>
                  <span className="text-[11px] text-zinc-300 leading-relaxed">{s.products}</span>
                </div>
                <div className="flex gap-3 items-start">
                  <span
                    className="text-[9px] font-bold uppercase tracking-wider w-[60px] flex-shrink-0 pt-0.5"
                    style={{ color: s.color }}
                  >
                    Shipping
                  </span>
                  <span className="text-[11px] text-zinc-300 leading-relaxed">{s.shipping}</span>
                </div>
                <div className="flex gap-3 items-start">
                  <span
                    className="text-[9px] font-bold uppercase tracking-wider w-[60px] flex-shrink-0 pt-0.5"
                    style={{ color: s.color }}
                  >
                    Cost
                  </span>
                  <span className="text-[11px] text-zinc-300 leading-relaxed">{s.cost}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="h-20" />
    </div>
  )
}
