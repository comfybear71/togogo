import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

const SUPPLIERS = [
  {
    name: 'CJ Dropshipping',
    emoji: '📦',
    color: '#FF6B35',
    what: 'Massive product catalogue with warehouses worldwide. Fast shipping, quality control, and custom packaging.',
    products: 'Electronics, fashion, home, beauty, gadgets — millions of products',
    shipping: '5-15 days (US/EU warehouses available for 3-5 day delivery)',
    cost: 'Free to use. You only pay per product when you sell.',
  },
  {
    name: 'AliExpress',
    emoji: '🛒',
    color: '#E53238',
    what: 'The world\'s biggest wholesale marketplace. Endless product selection at rock-bottom prices.',
    products: 'Literally everything — 100+ million products across every category',
    shipping: '7-20 days standard, 3-7 days with AliExpress Premium',
    cost: 'Free. Buy at wholesale prices, sell at retail.',
  },
  {
    name: 'Printful',
    emoji: '🎨',
    color: '#29AB51',
    what: 'Print-on-demand. Upload your designs, they print and ship when someone orders. Zero inventory.',
    products: 'T-shirts, hoodies, mugs, phone cases, posters, hats, bags, and more',
    shipping: '3-5 business days (printed in US, EU, or AU)',
    cost: 'Free to use. You pay per item only when a customer orders.',
  },
  {
    name: 'Printify',
    emoji: '🖨️',
    color: '#39B54A',
    what: 'Print-on-demand with 80+ print providers worldwide. More options and competitive pricing.',
    products: 'Apparel, accessories, home decor, drinkware, stationery',
    shipping: '3-7 business days (multiple print locations)',
    cost: 'Free plan available. Premium plan $29/mo for up to 20% cheaper products.',
  },
  {
    name: 'Gooten',
    emoji: '🏭',
    color: '#00A9E0',
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
      <div className="space-y-3">
        {SUPPLIERS.map((s) => (
          <div key={s.name} className="rounded-2xl bg-[#111] border border-white/[0.06] p-5">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">{s.emoji}</span>
              <h3 className="text-sm font-bold text-white">{s.name}</h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed mb-3">{s.what}</p>
            <div className="space-y-2">
              <div className="flex gap-2">
                <span className="text-[10px] text-zinc-600 uppercase tracking-wider w-16 flex-shrink-0 pt-0.5">Products</span>
                <span className="text-[11px] text-zinc-300">{s.products}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-[10px] text-zinc-600 uppercase tracking-wider w-16 flex-shrink-0 pt-0.5">Shipping</span>
                <span className="text-[11px] text-zinc-300">{s.shipping}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-[10px] text-zinc-600 uppercase tracking-wider w-16 flex-shrink-0 pt-0.5">Cost</span>
                <span className="text-[11px] text-zinc-300">{s.cost}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="h-20" />
    </div>
  )
}
