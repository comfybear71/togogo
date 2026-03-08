import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Store, ArrowRight, Check, Search, Link2, BookOpen,
  ShoppingBag, Globe, Zap, ExternalLink, Gift
} from 'lucide-react'
import { usePlatformConnections } from '../hooks/usePlatforms'

const API_BASE = import.meta.env.VITE_API_URL || ''

// Referral links — every signup through Togogo earns us a commission
const PLATFORMS = [
  {
    name: 'Shopify',
    desc: 'Build your own branded store. The #1 platform for dropshipping.',
    color: '#95BF47',
    bestFor: 'Building a brand',
    category: 'storefront',
    url: 'https://shopify.com',
    referralUrl: 'https://shopify.pxf.io/togogo',
    fees: '2.9% + 30c',
    monthly: '$39/mo',
    free: false,
  },
  {
    name: 'WooCommerce',
    desc: 'Free WordPress plugin with thousands of extensions.',
    color: '#7F54B3',
    bestFor: 'WordPress users',
    category: 'storefront',
    url: 'https://woocommerce.com',
    referralUrl: 'https://woocommerce.com/?aff=togogo',
    fees: 'Gateway fees only',
    monthly: 'Free',
    free: true,
  },
  {
    name: 'Squarespace',
    desc: 'Beautiful templates with built-in commerce.',
    color: '#000000',
    bestFor: 'Visual brands',
    category: 'storefront',
    url: 'https://squarespace.com',
    referralUrl: 'https://squarespace.syuh.net/togogo',
    fees: '0-3%',
    monthly: '$33/mo',
    free: false,
  },
  {
    name: 'BigCommerce',
    desc: 'Enterprise-grade platform. No transaction fees.',
    color: '#34313F',
    bestFor: 'Scaling up',
    category: 'storefront',
    url: 'https://bigcommerce.com',
    referralUrl: 'https://bigcommerce.pxf.io/togogo',
    fees: '0% tx fees',
    monthly: '$39/mo',
    free: false,
  },
  {
    name: 'Wix',
    desc: 'Drag-and-drop builder with AI design tools.',
    color: '#0C6EFC',
    bestFor: 'Beginners',
    category: 'storefront',
    url: 'https://wix.com',
    referralUrl: 'https://wix.pxf.io/togogo',
    fees: '2.9% + 30c',
    monthly: '$27/mo',
    free: false,
  },
  {
    name: 'PrestaShop',
    desc: 'Free open-source. Self-hosted. Popular in Europe.',
    color: '#DF0067',
    bestFor: 'EU sellers',
    category: 'storefront',
    url: 'https://prestashop.com',
    referralUrl: 'https://prestashop.com/?ref=togogo',
    fees: 'Gateway fees only',
    monthly: 'Free',
    free: true,
  },
  {
    name: 'Big Cartel',
    desc: 'Simple store for artists. Free plan up to 5 products.',
    color: '#222222',
    bestFor: 'Artists & makers',
    category: 'storefront',
    url: 'https://bigcartel.com',
    referralUrl: 'https://bigcartel.com/?ref=togogo',
    fees: '0% tx fees',
    monthly: 'Free',
    free: true,
  },
  {
    name: 'Amazon',
    desc: 'Biggest marketplace. FBA handles shipping for you.',
    color: '#FF9900',
    bestFor: 'Volume sellers',
    category: 'marketplace',
    url: 'https://sell.amazon.com',
    referralUrl: 'https://sell.amazon.com/?ref=togogo',
    fees: '8-15%',
    monthly: '$39.99/mo',
    free: false,
  },
  {
    name: 'eBay',
    desc: 'Huge audience. Auctions or fixed price listings.',
    color: '#E53238',
    bestFor: 'Used & vintage',
    category: 'marketplace',
    url: 'https://ebay.com',
    referralUrl: 'https://ebay.pxf.io/togogo',
    fees: '10-15%',
    monthly: 'Free',
    free: true,
  },
  {
    name: 'Etsy',
    desc: 'Handmade, vintage, and creative products.',
    color: '#F56400',
    bestFor: 'Crafters & artists',
    category: 'marketplace',
    url: 'https://etsy.com',
    referralUrl: 'https://etsy.me/togogo',
    fees: '6.5% + 20c',
    monthly: 'Free',
    free: true,
  },
  {
    name: 'TikTok Shop',
    desc: 'Sell through videos and livestreams. Gen Z audience.',
    color: '#000000',
    bestFor: 'Viral products',
    category: 'marketplace',
    url: 'https://seller.tiktok.com',
    referralUrl: 'https://seller.tiktok.com/?ref=togogo',
    fees: '5%',
    monthly: 'Free',
    free: true,
  },
  {
    name: 'Facebook Marketplace',
    desc: 'Sell locally or ship nationwide. No listing fees.',
    color: '#1877F2',
    bestFor: 'Local selling',
    category: 'marketplace',
    url: 'https://facebook.com/marketplace',
    referralUrl: null,
    fees: '5%',
    monthly: 'Free',
    free: true,
  },
  {
    name: 'Depop',
    desc: 'Social-first marketplace for fashion and streetwear.',
    color: '#FF2300',
    bestFor: 'Trendy fashion',
    category: 'marketplace',
    url: 'https://depop.com',
    referralUrl: 'https://depop.com/?ref=togogo',
    fees: '10%',
    monthly: 'Free',
    free: true,
  },
  {
    name: 'Pop-Up Shop',
    desc: 'Sell in person at markets, fairs, and events.',
    color: '#9333EA',
    bestFor: 'Local events',
    category: 'other',
    url: null,
    referralUrl: null,
    fees: 'Varies',
    monthly: 'Free',
    free: true,
  },
]

const CATEGORIES = [
  { id: 'all', label: 'All', icon: Globe },
  { id: 'storefront', label: 'Own Store', icon: Store },
  { id: 'marketplace', label: 'Marketplaces', icon: ShoppingBag },
  { id: 'other', label: 'Other', icon: Zap },
]

export default function PlatformsPage() {
  const navigate = useNavigate()
  const [activeCategory, setActiveCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [adminReferralLinks, setAdminReferralLinks] = useState({})
  const { data: connectionsData } = usePlatformConnections()
  const connections = connectionsData?.connections || []

  // Fetch dynamic referral links set by admin
  useEffect(() => {
    fetch(`${API_BASE}/api/admin/public/referral-links`)
      .then((res) => res.ok ? res.json() : {})
      .then((data) => setAdminReferralLinks(data))
      .catch(() => {})
  }, [])

  const isConnected = (name) =>
    connections.some((c) => c.platform_name === name && c.status === 'active')

  // Merge admin referral links over hardcoded defaults
  const getReferralUrl = (platform) => {
    const slug = platform.name.toLowerCase().replace(/\s+/g, '')
    return adminReferralLinks[slug] || adminReferralLinks[platform.name.toLowerCase()] || platform.referralUrl
  }

  const filteredPlatforms = PLATFORMS.filter((p) => {
    const matchesCategory = activeCategory === 'all' || p.category === activeCategory
    const matchesSearch =
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.desc.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <div className="py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFD23F]/15">
            <Store className="h-5 w-5 text-[#FFD23F]" />
          </div>
          <div>
            <h1 className="text-xl font-heading font-bold text-white">Selling Platforms</h1>
            <p className="text-[10px] text-zinc-500">
              {connections.filter((c) => c.status === 'active').length} connected
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/setup')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FF6B35] text-white text-xs font-semibold hover:bg-[#FF6B35]/90 transition-colors"
        >
          <Zap className="h-3.5 w-3.5" />
          Quick Setup
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search platforms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#111] border border-white/[0.06] text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/[0.15] transition-colors"
          />
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto scrollbar-hide pb-1">
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

      {/* Platform cards */}
      <div className="space-y-3 mb-8">
        {filteredPlatforms.map((p) => {
          const connected = isConnected(p.name)
          const slug = p.name.toLowerCase().replace(/\s+/g, '-')

          return (
            <div
              key={p.name}
              className={`rounded-2xl border p-4 transition-all duration-300 ${
                connected
                  ? 'bg-emerald-500/[0.03] border-emerald-500/20'
                  : 'bg-[#111] border-white/[0.06] hover:border-white/[0.12]'
              }`}
            >
              {/* Top: icon + name + badge + fees */}
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl flex-shrink-0 text-base font-bold"
                  style={{ backgroundColor: `${p.color}15`, color: p.color }}
                >
                  {p.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-white">{p.name}</h3>
                    {connected && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 uppercase tracking-wide">
                        Connected
                      </span>
                    )}
                    {!connected && p.free && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 uppercase tracking-wide">
                        Free
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-relaxed mt-0.5">{p.desc}</p>
                </div>
              </div>

              {/* Info row */}
              <div className="flex items-center gap-2 mb-3 ml-14">
                <span
                  className="text-[10px] font-semibold px-2 py-1 rounded-lg"
                  style={{ backgroundColor: `${p.color}12`, color: p.color }}
                >
                  {p.bestFor}
                </span>
                <span className="text-[10px] text-zinc-500 font-medium">{p.fees}</span>
                <span className="text-[10px] text-zinc-600">·</span>
                <span className="text-[10px] text-zinc-500 font-medium">{p.monthly}</span>
              </div>

              {/* 2x2 Button grid — clean and tidy */}
              <div className="grid grid-cols-2 gap-2 ml-14">
                {/* Row 1: Guide + Sign Up */}
                <button
                  onClick={() => navigate(`/guide/${slug}`)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-[11px] font-medium text-zinc-400 hover:text-white hover:border-white/[0.15] transition-all"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  Setup Guide
                </button>

                {getReferralUrl(p) ? (
                  <a
                    href={getReferralUrl(p)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#FFD23F]/10 border border-[#FFD23F]/20 text-[11px] font-semibold text-[#FFD23F] hover:bg-[#FFD23F]/15 transition-all"
                  >
                    <Gift className="h-3.5 w-3.5" />
                    Sign Up Free
                  </a>
                ) : p.url ? (
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-[11px] font-medium text-zinc-400 hover:text-white hover:border-white/[0.15] transition-all"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Visit Site
                  </a>
                ) : (
                  <div />
                )}

                {/* Row 2: Visit + Connect */}
                {getReferralUrl(p) && p.url ? (
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-[11px] font-medium text-zinc-400 hover:text-white hover:border-white/[0.15] transition-all"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Visit Site
                  </a>
                ) : (
                  <div />
                )}

                <button
                  onClick={() => navigate(`/setup?platform=${encodeURIComponent(p.name)}`)}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-[11px] font-semibold transition-all ${
                    connected
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                      : 'bg-[#FF6B35] text-white hover:bg-[#FF6B35]/90'
                  }`}
                >
                  {connected ? (
                    <><Check className="h-3.5 w-3.5" /> Connected</>
                  ) : (
                    <><Link2 className="h-3.5 w-3.5" /> Connect</>
                  )}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Bottom CTA */}
      <div className="rounded-2xl bg-gradient-to-r from-[#FF6B35]/10 to-[#FFD23F]/10 border border-[#FF6B35]/20 p-5 text-center">
        <p className="text-sm font-semibold text-white mb-1">Not sure where to start?</p>
        <p className="text-xs text-zinc-500 mb-3">Our AI assistant can recommend the best platforms for your products.</p>
        <button
          onClick={() => navigate('/assistant?start=' + encodeURIComponent("I want to start selling online but I'm not sure which platform to use. Can you help me pick the right one? I'm a complete beginner."))}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FF6B35] text-white text-xs font-semibold hover:bg-[#FF6B35]/90 transition-colors"
        >
          Ask AI for Help <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
