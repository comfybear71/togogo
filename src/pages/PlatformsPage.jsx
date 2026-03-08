import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Store, ArrowRight, Users, Percent, BarChart3, Palette,
  ExternalLink, Check, Search, Link2,
  ShoppingBag, Globe, Zap
} from 'lucide-react'
import { usePlatformConnections } from '../hooks/usePlatforms'

const PLATFORMS = [
  // Storefronts - Build your own store
  {
    name: 'Shopify',
    desc: 'Build your own branded store with full control over design and pricing. The #1 platform for dropshipping.',
    tags: ['Own Store', 'Dropshipping', 'Apps'],
    color: '#95BF47',
    bestFor: 'Best for building a brand',
    category: 'storefront',
    url: 'https://shopify.com',
    fees: '2.9% + 30c',
    monthlyFrom: '$39/mo',
    setup: { difficulty: 'Easy', time: '~30 min' },
  },
  {
    name: 'WooCommerce',
    desc: 'Free WordPress plugin. Full control over your store with thousands of extensions.',
    tags: ['WordPress', 'Self-Hosted', 'Open Source'],
    color: '#7F54B3',
    bestFor: 'Best for WordPress users',
    category: 'storefront',
    url: 'https://woocommerce.com',
    fees: 'Payment gateway fees only',
    monthlyFrom: 'Free plugin',
    setup: { difficulty: 'Medium', time: '~1 hour' },
  },
  {
    name: 'Squarespace',
    desc: 'Beautiful templates with built-in commerce. Great for visually-driven brands.',
    tags: ['Design', 'Templates', 'All-in-One'],
    color: '#000000',
    bestFor: 'Best for beautiful stores',
    category: 'storefront',
    url: 'https://squarespace.com',
    fees: '3% (Basic) or 0%',
    monthlyFrom: '$33/mo',
    setup: { difficulty: 'Easy', time: '~45 min' },
  },
  {
    name: 'BigCommerce',
    desc: 'Enterprise-grade platform with built-in features. No transaction fees on any plan.',
    tags: ['Enterprise', 'Scalable', 'No Tx Fees'],
    color: '#34313F',
    bestFor: 'Best for scaling up',
    category: 'storefront',
    url: 'https://bigcommerce.com',
    fees: '0% transaction fees',
    monthlyFrom: '$39/mo',
    setup: { difficulty: 'Medium', time: '~1 hour' },
  },
  {
    name: 'Wix',
    desc: 'Drag-and-drop store builder with AI design tools. Quick to set up and beginner-friendly.',
    tags: ['Drag & Drop', 'AI Builder', 'Beginner'],
    color: '#0C6EFC',
    bestFor: 'Best for beginners',
    category: 'storefront',
    url: 'https://wix.com',
    fees: '2.9% + 30c',
    monthlyFrom: '$27/mo',
    setup: { difficulty: 'Easy', time: '~20 min' },
  },
  {
    name: 'PrestaShop',
    desc: 'Free open-source ecommerce. Self-hosted with full customisation. Popular in Europe.',
    tags: ['Open Source', 'Self-Hosted', 'EU Popular'],
    color: '#DF0067',
    bestFor: 'Best for EU sellers',
    category: 'storefront',
    url: 'https://prestashop.com',
    fees: 'Payment gateway fees only',
    monthlyFrom: 'Free (self-hosted)',
    setup: { difficulty: 'Advanced', time: '~2 hours' },
  },
  {
    name: 'Big Cartel',
    desc: 'Simple store for artists and makers. Free plan for up to 5 products.',
    tags: ['Artists', 'Simple', 'Free Tier'],
    color: '#222222',
    bestFor: 'Best for artists & makers',
    category: 'storefront',
    url: 'https://bigcartel.com',
    fees: '0% transaction fees',
    monthlyFrom: 'Free (5 products)',
    setup: { difficulty: 'Easy', time: '~15 min' },
  },

  // Marketplaces - Sell on existing audiences
  {
    name: 'Amazon',
    desc: 'The biggest marketplace. FBA handles storage, packing, and shipping for you.',
    tags: ['Marketplace', 'FBA', 'Massive Reach'],
    color: '#FF9900',
    bestFor: 'Best for volume sellers',
    category: 'marketplace',
    url: 'https://sell.amazon.com',
    fees: '8-15% referral fee',
    monthlyFrom: '$39.99/mo (Pro)',
    setup: { difficulty: 'Medium', time: '~1 hour' },
  },
  {
    name: 'eBay',
    desc: 'Massive audience for new and used items. Auctions or fixed price listings.',
    tags: ['Marketplace', 'Auctions', 'Global'],
    color: '#E53238',
    bestFor: 'Best for used/vintage items',
    category: 'marketplace',
    url: 'https://ebay.com',
    fees: '10-15% final value',
    monthlyFrom: 'Free (250 listings)',
    setup: { difficulty: 'Easy', time: '~30 min' },
  },
  {
    name: 'Etsy',
    desc: 'Perfect for handmade, vintage, and creative products. Built-in audience of buyers.',
    tags: ['Handmade', 'Creative', 'POD'],
    color: '#F56400',
    bestFor: 'Best for crafters & artists',
    category: 'marketplace',
    url: 'https://etsy.com',
    fees: '6.5% + 20c listing',
    monthlyFrom: 'Free (pay per listing)',
    setup: { difficulty: 'Easy', time: '~30 min' },
  },
  {
    name: 'TikTok Shop',
    desc: 'Sell directly through TikTok videos and live streams. Massive Gen Z audience.',
    tags: ['Social Commerce', 'Live Selling', 'Viral'],
    color: '#000000',
    bestFor: 'Best for viral products',
    category: 'marketplace',
    url: 'https://seller.tiktok.com',
    fees: '5% + payment fee',
    monthlyFrom: 'Free',
    setup: { difficulty: 'Easy', time: '~30 min' },
  },
  {
    name: 'Facebook Marketplace',
    desc: 'Sell locally or ship nationwide. No listing fees. Huge built-in audience.',
    tags: ['Local', 'Free Listings', 'Social'],
    color: '#1877F2',
    bestFor: 'Best for local selling',
    category: 'marketplace',
    url: 'https://facebook.com/marketplace',
    fees: '5% or $0.40 min',
    monthlyFrom: 'Free',
    setup: { difficulty: 'Easy', time: '~15 min' },
  },
  {
    name: 'Depop',
    desc: 'Social-first marketplace popular with Gen Z for fashion and streetwear.',
    tags: ['Fashion', 'Social', 'Gen Z'],
    color: '#FF2300',
    bestFor: 'Best for trendy fashion',
    category: 'marketplace',
    url: 'https://depop.com',
    fees: '10% seller fee',
    monthlyFrom: 'Free',
    setup: { difficulty: 'Easy', time: '~15 min' },
  },

  // Pop-Up / Events
  {
    name: 'Pop-Up Shop',
    desc: 'Sell in person at markets, fairs, and pop-up events. Use Togogo for inventory & POS.',
    tags: ['In-Person', 'Events', 'Markets'],
    color: '#9333EA',
    bestFor: 'Best for local events',
    category: 'other',
    url: null,
    fees: 'Varies by event',
    monthlyFrom: 'No platform fee',
    setup: { difficulty: 'Easy', time: '~10 min' },
  },
]

const CATEGORIES = [
  { id: 'all', label: 'All Platforms', icon: Globe },
  { id: 'storefront', label: 'Your Own Store', icon: Store },
  { id: 'marketplace', label: 'Marketplaces', icon: ShoppingBag },
  { id: 'other', label: 'Other', icon: Zap },
]

const FEATURES = [
  { icon: Percent, title: 'Fee Comparison', desc: 'Compare listing fees, commissions, and monthly costs', color: '#FF6B35' },
  { icon: Users, title: 'Audience Reach', desc: 'See how many buyers each platform attracts', color: '#06D6A0' },
  { icon: Palette, title: 'Niche Fit', desc: 'Find which platform suits your product type', color: '#FFD23F' },
  { icon: BarChart3, title: 'Seller Tools', desc: 'Analytics, ads, and listing optimisation', color: '#a78bfa' },
]

export default function PlatformsPage() {
  const navigate = useNavigate()
  const [activeCategory, setActiveCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const { data: connectionsData } = usePlatformConnections()
  const connections = connectionsData?.connections || []

  const isConnected = (name) =>
    connections.some((c) => c.platform_name === name && c.status === 'active')

  const filteredPlatforms = PLATFORMS.filter((p) => {
    const matchesCategory = activeCategory === 'all' || p.category === activeCategory
    const matchesSearch =
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesCategory && matchesSearch
  })

  return (
    <div className="py-6">
      {/* Page title */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFD23F]/15">
            <Store className="h-5 w-5 text-[#FFD23F]" />
          </div>
          <h1 className="text-xl font-heading font-bold text-white">Selling Platforms</h1>
        </div>
        <button
          onClick={() => navigate('/setup')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FF6B35] text-white text-sm font-semibold hover:bg-[#FF6B35]/90 transition-colors"
        >
          <Zap className="h-4 w-4" />
          Quick Setup
        </button>
      </div>

      {/* Hero */}
      <div className="text-center mb-8">
        <h2 className="font-heading text-3xl font-bold text-white mb-4">
          Where Will You Sell?
        </h2>
        <p className="text-sm text-zinc-500 max-w-[340px] mx-auto leading-relaxed">
          Choose your selling platforms. We'll help you set everything up so you can start selling fast.
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-lg mx-auto mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
        <input
          type="text"
          placeholder="Search platforms..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#111] border border-white/[0.06] text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/[0.15] transition-colors"
        />
      </div>

      {/* Category filter tabs */}
      <div className="flex gap-2 max-w-lg mx-auto mb-6 overflow-x-auto scrollbar-hide pb-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
              activeCategory === cat.id
                ? 'bg-[#FF6B35] text-white'
                : 'bg-[#111] text-zinc-400 border border-white/[0.06] hover:border-white/[0.12]'
            }`}
          >
            <cat.icon className="h-3.5 w-3.5" />
            {cat.label}
          </button>
        ))}
      </div>

      {/* Platform count */}
      <div className="max-w-lg mx-auto mb-4">
        <p className="text-xs text-zinc-500">
          {filteredPlatforms.length} platform{filteredPlatforms.length !== 1 ? 's' : ''} available
        </p>
      </div>

      {/* Platform cards */}
      <div className="space-y-3 max-w-lg mx-auto mb-10">
        {filteredPlatforms.map((p) => (
          <div
            key={p.name}
            className="group rounded-2xl bg-[#111] border border-white/[0.06] p-4 hover:border-white/[0.12] transition-all duration-300"
          >
            <div className="flex items-center gap-4">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl flex-shrink-0 text-lg font-bold"
                style={{ backgroundColor: `${p.color}15`, color: p.color }}
              >
                {p.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="text-sm font-semibold text-white">{p.name}</h3>
                  {isConnected(p.name) && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
                      CONNECTED
                    </span>
                  )}
                  {!isConnected(p.name) && (p.monthlyFrom === 'Free' || p.monthlyFrom.includes('Free')) ? (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
                      FREE
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed">{p.desc}</p>
              </div>
            </div>

            {/* Pricing & Setup info */}
            <div className="flex items-center gap-3 mt-3 ml-16">
              <span className="text-[10px] font-medium text-zinc-400 bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded-full">
                {p.fees}
              </span>
              <span className="text-[10px] font-medium text-zinc-400 bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded-full">
                {p.monthlyFrom}
              </span>
              <span className="text-[10px] font-medium text-zinc-400 bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded-full">
                Setup: {p.setup.time}
              </span>
            </div>

            {/* Tags & actions */}
            <div className="flex items-center justify-between mt-3 ml-16">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: `${p.color}15`, color: p.color }}
                >
                  {p.bestFor}
                </span>
                {p.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] font-medium text-zinc-400 bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {p.url && (
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] font-semibold text-zinc-400 hover:text-white transition-colors"
                  >
                    Visit <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                <button
                  onClick={() => navigate(`/setup?platform=${encodeURIComponent(p.name)}`)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-colors ${
                    isConnected(p.name)
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'bg-[#FF6B35]/15 text-[#FF6B35] hover:bg-[#FF6B35]/25'
                  }`}
                >
                  {isConnected(p.name) ? (
                    <><Check className="h-3 w-3" /> Connected</>
                  ) : (
                    <><Link2 className="h-3 w-3" /> Connect</>
                  )}
                </button>
              </div>
            </div>
          </div>
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
