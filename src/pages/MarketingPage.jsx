import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Megaphone, PenTool, Target, TrendingUp, Zap,
  Copy, Check, Share2, Instagram, Hash, FileText,
  Sparkles, BarChart3, ArrowRight,
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import Button from '../components/ui/Button'

const TEMPLATES = [
  {
    id: 'product-launch',
    title: 'Product Launch',
    desc: 'Announce a new product across your channels',
    icon: Sparkles,
    color: '#FFD23F',
    template: "New drop alert! Introducing [PRODUCT NAME] — now available in our store. Limited stock, grab yours before they're gone! Shop now: [STORE LINK] #newproduct #shopnow",
  },
  {
    id: 'flash-sale',
    title: 'Flash Sale',
    desc: 'Create urgency with a time-limited offer',
    icon: Zap,
    color: '#FF6B35',
    template: "FLASH SALE! Get [X]% off everything for the next 24 hours only. Don't miss out on these incredible deals. Shop: [STORE LINK] #flashsale #deals",
  },
  {
    id: 'testimonial',
    title: 'Customer Story',
    desc: 'Share social proof and build trust',
    icon: FileText,
    color: '#06D6A0',
    template: "\"Absolutely love my [PRODUCT]! Fast shipping and amazing quality.\" — Happy Customer. See what everyone's raving about: [STORE LINK] #review #customerexperience",
  },
  {
    id: 'seasonal',
    title: 'Seasonal Promo',
    desc: 'Capitalise on holidays and events',
    icon: Target,
    color: '#a78bfa',
    template: "This [SEASON/HOLIDAY], treat yourself or someone special! Our curated collection has something for everyone. Free shipping on all orders. Browse: [STORE LINK]",
  },
]

const SEO_TIPS = [
  { title: 'Use keywords in titles', desc: 'Include popular search terms buyers actually use.' },
  { title: 'Write detailed descriptions', desc: 'Cover features, sizing, materials — help buyers decide.' },
  { title: 'Optimise your images', desc: 'Use clean backgrounds and multiple angles for each product.' },
  { title: 'Encourage reviews', desc: 'More reviews = more trust = higher conversion rates.' },
]

const CHANNELS = [
  { name: 'Instagram', icon: Instagram, color: '#E4405F', followers: '—' },
  { name: 'TikTok', icon: Hash, color: '#000', followers: '—' },
  { name: 'Facebook', icon: Share2, color: '#1877F2', followers: '—' },
]

export default function MarketingPage() {
  const user = useAuthStore((s) => s.user)
  const [activeTab, setActiveTab] = useState('templates')
  const [copiedId, setCopiedId] = useState(null)
  const [selectedTemplate, setSelectedTemplate] = useState(null)

  const handleCopy = (template) => {
    navigator.clipboard.writeText(template.template)
    setCopiedId(template.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="py-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFD23F]/15">
          <Megaphone className="h-5 w-5 text-[#FFD23F]" />
        </div>
        <div>
          <h1 className="text-xl font-heading font-bold text-white">Marketing</h1>
          <p className="text-[10px] text-zinc-500">Grow your audience and boost sales</p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="rounded-xl bg-[#111] border border-white/[0.06] p-3 text-center">
          <BarChart3 className="h-4 w-4 text-[#FF6B35] mx-auto mb-1" />
          <p className="text-lg font-bold text-white">0</p>
          <p className="text-[9px] text-zinc-500">Campaigns</p>
        </div>
        <div className="rounded-xl bg-[#111] border border-white/[0.06] p-3 text-center">
          <TrendingUp className="h-4 w-4 text-[#06D6A0] mx-auto mb-1" />
          <p className="text-lg font-bold text-white">—</p>
          <p className="text-[9px] text-zinc-500">Reach</p>
        </div>
        <div className="rounded-xl bg-[#111] border border-white/[0.06] p-3 text-center">
          <Target className="h-4 w-4 text-[#a78bfa] mx-auto mb-1" />
          <p className="text-lg font-bold text-white">—</p>
          <p className="text-[9px] text-zinc-500">Conversions</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1 scrollbar-hide">
        {[
          { key: 'templates', label: 'Post Templates' },
          { key: 'seo', label: 'SEO Tips' },
          { key: 'channels', label: 'Channels' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-medium border transition-colors ${
              activeTab === t.key
                ? 'bg-[#FF6B35]/15 border-[#FF6B35]/30 text-[#FF6B35]'
                : 'bg-[#111] border-white/[0.06] text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Templates tab */}
      {activeTab === 'templates' && (
        <div className="space-y-3">
          {TEMPLATES.map((t) => {
            const Icon = t.icon
            return (
              <div
                key={t.id}
                className="rounded-xl bg-[#111] border border-white/[0.06] p-4 hover:border-white/[0.12] transition-all"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0"
                    style={{ backgroundColor: `${t.color}15` }}
                  >
                    <Icon className="h-4 w-4" style={{ color: t.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs font-bold text-white mb-0.5">{t.title}</h3>
                    <p className="text-[10px] text-zinc-500 mb-3">{t.desc}</p>
                    <div className="rounded-lg bg-[#0a0a0a] border border-white/[0.04] p-3 mb-3">
                      <p className="text-[10px] text-zinc-400 leading-relaxed">{t.template}</p>
                    </div>
                    <button
                      onClick={() => handleCopy(t)}
                      className="flex items-center gap-1.5 text-[10px] font-semibold transition-colors"
                      style={{ color: copiedId === t.id ? '#06D6A0' : t.color }}
                    >
                      {copiedId === t.id ? (
                        <>
                          <Check className="h-3 w-3" /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" /> Copy Template
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* SEO tab */}
      {activeTab === 'seo' && (
        <div className="space-y-3">
          {SEO_TIPS.map((tip, i) => (
            <div
              key={i}
              className="rounded-xl bg-[#111] border border-white/[0.06] p-4"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#06D6A0]/10 flex-shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold text-[#06D6A0]">{i + 1}</span>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white mb-0.5">{tip.title}</h3>
                  <p className="text-[10px] text-zinc-500 leading-relaxed">{tip.desc}</p>
                </div>
              </div>
            </div>
          ))}

          <div className="rounded-xl bg-gradient-to-br from-[#06D6A0]/5 to-transparent border border-[#06D6A0]/10 p-5 text-center">
            <PenTool className="h-5 w-5 text-[#06D6A0] mx-auto mb-2" />
            <h3 className="text-xs font-bold text-white mb-1">AI Copywriting</h3>
            <p className="text-[10px] text-zinc-500 mb-3">
              Generate SEO-optimised product descriptions automatically.
            </p>
            <span className="text-[9px] font-bold text-[#06D6A0] bg-[#06D6A0]/10 px-3 py-1 rounded-full">
              Coming Soon
            </span>
          </div>
        </div>
      )}

      {/* Channels tab */}
      {activeTab === 'channels' && (
        <div className="space-y-3">
          {CHANNELS.map((ch) => {
            const Icon = ch.icon
            return (
              <div
                key={ch.name}
                className="rounded-xl bg-[#111] border border-white/[0.06] p-4"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${ch.color}15` }}
                  >
                    <Icon className="h-5 w-5" style={{ color: ch.color }} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xs font-bold text-white">{ch.name}</h3>
                    <p className="text-[10px] text-zinc-500">Not connected</p>
                  </div>
                  <button className="px-3 py-1.5 rounded-lg bg-white/[0.04] text-[10px] font-medium text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors">
                    Connect
                  </button>
                </div>
              </div>
            )
          })}

          <div className="rounded-xl bg-gradient-to-br from-[#FFD23F]/5 to-transparent border border-[#FFD23F]/10 p-5 text-center">
            <Zap className="h-5 w-5 text-[#FFD23F] mx-auto mb-2" />
            <h3 className="text-xs font-bold text-white mb-1">Auto-Post to Socials</h3>
            <p className="text-[10px] text-zinc-500 mb-3">
              Schedule and auto-post product launches to all your channels.
            </p>
            <span className="text-[9px] font-bold text-[#FFD23F] bg-[#FFD23F]/10 px-3 py-1 rounded-full">
              Coming Soon
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
