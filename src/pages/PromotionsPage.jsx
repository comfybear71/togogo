import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Megaphone, ArrowRight, BookOpen, Check, Clock, Zap,
  Instagram, Twitter, Facebook, Youtube, Play,
  Calendar, BarChart3, Sparkles, Settings, ChevronRight,
  AlertCircle, Shield, Globe
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'

const SOCIAL_CHANNELS = [
  {
    id: 'instagram',
    name: 'Instagram',
    icon: Instagram,
    color: '#E1306C',
    desc: 'Auto-post product photos & reels',
    status: 'coming_soon',
    features: ['Product photo posts', 'Story promotions', 'Reel templates', 'Hashtag optimization'],
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: Facebook,
    color: '#1877F2',
    desc: 'Share to pages, groups & marketplace',
    status: 'coming_soon',
    features: ['Page posts', 'Group sharing', 'Marketplace listings', 'Event promotions'],
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: Play,
    color: '#000000',
    desc: 'Auto-create product showcase videos',
    status: 'coming_soon',
    features: ['Product showcases', 'Trending sound pairing', 'Auto-captions', 'Shop tag integration'],
  },
  {
    id: 'twitter',
    name: 'X (Twitter)',
    icon: Twitter,
    color: '#000000',
    desc: 'Tweet new products & deals automatically',
    status: 'coming_soon',
    features: ['New product tweets', 'Deal announcements', 'Thread campaigns', 'Auto-engagement'],
  },
  {
    id: 'pinterest',
    name: 'Pinterest',
    icon: Globe,
    color: '#E60023',
    desc: 'Pin products for long-term discovery',
    status: 'coming_soon',
    features: ['Rich product pins', 'Board organization', 'SEO-optimized descriptions', 'Seasonal campaigns'],
  },
  {
    id: 'youtube',
    name: 'YouTube',
    icon: Youtube,
    color: '#FF0000',
    desc: 'Auto-generate product review shorts',
    status: 'coming_soon',
    features: ['YouTube Shorts', 'Product reviews', 'Unboxing templates', 'Channel management'],
  },
]

const PROMO_FEATURES = [
  {
    icon: Calendar,
    title: 'Auto-Scheduling',
    desc: 'Set it and forget it. Togogo posts your products on a schedule across all your social channels. CRON jobs run automatically.',
    color: '#FF6B35',
  },
  {
    icon: Sparkles,
    title: 'AI Captions & Hashtags',
    desc: "Our AI writes engaging captions, picks trending hashtags, and optimises post timing for maximum reach. You don't write a thing.",
    color: '#FFD23F',
  },
  {
    icon: BarChart3,
    title: 'Performance Tracking',
    desc: 'See which posts drive the most clicks and sales. We auto-adjust your strategy based on what works.',
    color: '#06D6A0',
  },
  {
    icon: Megaphone,
    title: 'Cross-Platform',
    desc: 'One product, every platform. Togogo formats and posts to Instagram, Facebook, TikTok, X, Pinterest, and YouTube simultaneously.',
    color: '#a78bfa',
  },
]

const SETUP_STEPS = [
  {
    title: 'Connect your social accounts',
    detail: "Link your Instagram, Facebook, TikTok, X, Pinterest, and YouTube accounts. Togogo uses official APIs to post on your behalf. You authorise once and we handle the rest.",
    tip: "Start with Instagram and Facebook — they're the easiest to set up and reach the most buyers.",
  },
  {
    title: 'Choose products to promote',
    detail: "Pick which products from your store you want promoted. You can promote everything automatically, or hand-pick specific items. Togogo will rotate through them so your feed stays fresh.",
    tip: "New products get the most engagement. Set Togogo to auto-promote any new product you add.",
  },
  {
    title: 'Set your schedule',
    detail: "Choose how often Togogo posts — daily, every other day, or weekly. Pick the times that work best for your audience. Our AI will suggest optimal times based on your audience's activity.",
    tip: "Posting 3-5 times per week is the sweet spot. Too much and people tune out, too little and they forget you.",
  },
  {
    title: 'Review and launch',
    detail: "Preview your first few posts before they go live. Togogo generates the images, captions, and hashtags. Make any tweaks you want, then hit launch. From then on, it's fully automatic.",
    tip: "You can always pause, edit, or stop promotions at any time. You're in full control.",
  },
]

export default function PromotionsPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [expandedStep, setExpandedStep] = useState(0)

  return (
    <div className="py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#a78bfa]/15">
            <Megaphone className="h-5 w-5 text-[#a78bfa]" />
          </div>
          <div>
            <h1 className="text-xl font-heading font-bold text-white">Promotions</h1>
            <p className="text-[10px] text-zinc-500">Auto-market your products everywhere</p>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-[#a78bfa]/10 via-[#FF6B35]/5 to-[#FFD23F]/10 border border-[#a78bfa]/20 p-6 mb-6 text-center">
        <div className="text-4xl mb-3">📣</div>
        <h2 className="font-heading text-2xl font-bold text-white mb-2">
          Promote While You Sleep
        </h2>
        <p className="text-xs text-zinc-400 leading-relaxed max-w-[300px] mx-auto">
          Togogo automatically promotes your products across all social media platforms.
          Set it up once — we handle the posting, captions, hashtags, and scheduling.
        </p>
      </div>

      {/* How it works features */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        {PROMO_FEATURES.map((f) => (
          <div
            key={f.title}
            className="rounded-xl bg-[#111] border border-white/[0.06] p-4 hover:border-white/[0.12] transition-all"
          >
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg mb-3"
              style={{ backgroundColor: `${f.color}15` }}
            >
              <f.icon className="h-4 w-4" style={{ color: f.color }} />
            </div>
            <h3 className="text-xs font-semibold text-white mb-1">{f.title}</h3>
            <p className="text-[10px] text-zinc-500 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* Social channels */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-white mb-4">
          Supported Channels
        </h3>
        <div className="space-y-2">
          {SOCIAL_CHANNELS.map((ch) => (
            <div
              key={ch.id}
              className="rounded-xl bg-[#111] border border-white/[0.06] p-4 hover:border-white/[0.12] transition-all"
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
                  style={{ backgroundColor: `${ch.color}15` }}
                >
                  <ch.icon className="h-4.5 w-4.5" style={{ color: ch.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-white">{ch.name}</h4>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#FFD23F]/15 text-[#FFD23F] uppercase tracking-wide">
                      Coming Soon
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-0.5">{ch.desc}</p>
                </div>
              </div>
              {/* Feature list */}
              <div className="flex flex-wrap gap-1.5 mt-3 ml-[52px]">
                {ch.features.map((feat) => (
                  <span
                    key={feat}
                    className="text-[10px] font-medium text-zinc-500 bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded-lg"
                  >
                    {feat}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Setup guide */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="h-4 w-4 text-[#FF6B35]" />
          <h3 className="text-sm font-semibold text-white">How to Set Up Promotions</h3>
        </div>
        <div className="space-y-2">
          {SETUP_STEPS.map((step, i) => {
            const isExpanded = expandedStep === i
            return (
              <div
                key={i}
                className={`rounded-xl border transition-all duration-300 ${
                  isExpanded
                    ? 'bg-[#111] border-[#a78bfa]/20'
                    : 'bg-[#0e0e0e] border-white/[0.06] hover:border-white/[0.12]'
                }`}
              >
                <button
                  onClick={() => setExpandedStep(isExpanded ? -1 : i)}
                  className="w-full flex items-center gap-3 p-4 text-left"
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0 text-xs font-bold transition-colors ${
                      isExpanded
                        ? 'bg-[#a78bfa] text-white'
                        : 'bg-white/[0.06] text-zinc-400'
                    }`}
                  >
                    {i + 1}
                  </div>
                  <span className={`text-sm font-medium flex-1 ${isExpanded ? 'text-white' : 'text-zinc-300'}`}>
                    {step.title}
                  </span>
                  <ChevronRight
                    className={`h-4 w-4 text-zinc-500 transition-transform duration-200 flex-shrink-0 ${
                      isExpanded ? 'rotate-90' : ''
                    }`}
                  />
                </button>
                {isExpanded && (
                  <div className="px-4 pb-4 ml-11">
                    <p className="text-xs text-zinc-400 leading-relaxed mb-3">
                      {step.detail}
                    </p>
                    {step.tip && (
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-[#a78bfa]/5 border border-[#a78bfa]/10">
                        <span className="text-xs">💡</span>
                        <p className="text-[11px] text-[#a78bfa]/80 leading-relaxed">
                          <strong className="text-[#a78bfa]">Tip:</strong> {step.tip}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* CTA */}
      <div className="rounded-2xl bg-gradient-to-r from-[#a78bfa]/10 to-[#FF6B35]/10 border border-[#a78bfa]/20 p-5 text-center">
        <Sparkles className="h-8 w-8 text-[#FFD23F] mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-white mb-2">Auto-Promotions Coming Soon</h3>
        <p className="text-xs text-zinc-500 mb-4 max-w-[280px] mx-auto">
          We're building the automated promotion engine. Connect your platforms now so you're ready to promote the moment it launches.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => navigate('/platforms')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FF6B35] text-white text-xs font-semibold hover:bg-[#FF6B35]/90 transition-colors"
          >
            Connect Platforms <ArrowRight className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => navigate('/suppliers')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.06] text-zinc-300 text-xs font-semibold hover:bg-white/[0.1] transition-colors"
          >
            Find Products
          </button>
        </div>
      </div>
    </div>
  )
}
