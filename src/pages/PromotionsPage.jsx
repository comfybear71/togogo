import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

const CHANNELS = [
  {
    name: 'Instagram',
    initials: 'IG',
    color: '#E1306C',
    desc: 'Post product photos, stories, and reels. Best for visual products. Huge audience.',
    approach: 'Product photos, behind-the-scenes stories, reels showcasing products in use, hashtag strategy to reach new buyers.',
  },
  {
    name: 'Facebook',
    initials: 'FB',
    color: '#1877F2',
    desc: 'Share to pages, groups, and Marketplace. Reach local and global buyers.',
    approach: 'Facebook Marketplace listings, group posting, page content, targeted sharing in buy/sell groups.',
  },
  {
    name: 'TikTok',
    initials: 'TT',
    color: '#ff0050',
    desc: 'Short videos that go viral. Products sell fast here — especially trendy items.',
    approach: 'Product showcase videos, trending sound pairing, unboxing content, TikTok Shop integration.',
  },
  {
    name: 'Pinterest',
    initials: 'Pi',
    color: '#E60023',
    desc: 'Visual discovery platform. People come here specifically looking to buy things.',
    approach: 'Rich product pins, board organisation by category, SEO-optimised descriptions for long-term discovery.',
  },
  {
    name: 'YouTube',
    initials: 'YT',
    color: '#FF0000',
    desc: 'Product reviews and shorts. Great for building trust and showing products in detail.',
    approach: 'YouTube Shorts for quick showcases, product review videos, comparison content, unboxing.',
  },
  {
    name: 'X (Twitter)',
    initials: 'X',
    color: '#ffffff',
    desc: 'Quick product announcements and deal sharing. Good for building a following.',
    approach: 'New product tweets, deal announcements, engaging with trending topics, building community.',
  },
]

const STRATEGIES = [
  { title: 'Auto-Scheduling', initials: 'AS', color: '#FF6B35', desc: 'Set your posting schedule and ToGoGo handles the rest. Posts go out automatically across all your connected channels.' },
  { title: 'Smart Captions', initials: 'SC', color: '#FFD23F', desc: 'Pre-written caption templates and hashtag sets for every product category. Just pick a template and post.' },
  { title: 'Cross-Platform', initials: 'CP', color: '#06D6A0', desc: 'One product, every platform. ToGoGo formats your posts correctly for each platform so you only do the work once.' },
  { title: 'Analytics', initials: 'An', color: '#a78bfa', desc: 'See which posts and platforms drive the most clicks and sales. Focus your time on what actually works.' },
]

export default function PromotionsPage() {
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
          <h1 className="text-xl font-heading font-bold text-white">Marketing</h1>
          <p className="text-[11px] text-zinc-500">How we help you promote your products</p>
        </div>
      </div>

      {/* Intro */}
      <div className="rounded-2xl bg-[#111] border border-white/[0.06] p-5 mb-5">
        <p className="text-sm text-zinc-300 leading-relaxed">
          ToGoGo helps you promote your products across <span className="text-white font-semibold">every major social media platform</span>. We handle the formatting, scheduling, and tracking so you can focus on picking great products.
        </p>
      </div>

      {/* Channels */}
      <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 px-1">Channels we support</h2>
      <div className="space-y-4 mb-6">
        {CHANNELS.map((ch) => {
          const glow = `${ch.color}25`
          return (
            <div key={ch.name} className="relative rounded-2xl overflow-hidden">
              <div className="absolute inset-0 rounded-2xl opacity-60" style={{ background: `linear-gradient(135deg, ${ch.color}30, transparent 50%, ${ch.color}15)` }} />
              <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-30" style={{ backgroundColor: ch.color }} />
              <div className="relative rounded-2xl bg-[#0c0c0c]/90 border p-4" style={{ borderColor: `${ch.color}25` }}>
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="flex items-center justify-center w-10 h-10 rounded-xl text-xs font-extrabold tracking-tight"
                    style={{ backgroundColor: `${ch.color}20`, color: ch.color, boxShadow: `0 0 20px ${glow}, inset 0 0 20px ${glow}` }}
                  >
                    {ch.initials}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{ch.name}</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ch.color, boxShadow: `0 0 6px ${ch.color}` }} />
                      <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: ch.color }}>Connected</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed mb-3">{ch.desc}</p>
                <div className="flex gap-3 items-start">
                  <span className="text-[9px] font-bold uppercase tracking-wider w-[65px] flex-shrink-0" style={{ color: ch.color }}>Approach</span>
                  <span className="text-[11px] text-zinc-300 leading-relaxed">{ch.approach}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Marketing tools */}
      <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 px-1">Marketing tools included</h2>
      <div className="grid grid-cols-2 gap-3">
        {STRATEGIES.map((s) => {
          const glow = `${s.color}25`
          return (
            <div key={s.title} className="relative rounded-2xl overflow-hidden">
              <div className="absolute inset-0 rounded-2xl opacity-40" style={{ background: `linear-gradient(135deg, ${s.color}25, transparent 60%)` }} />
              <div className="relative rounded-2xl bg-[#0c0c0c]/90 border p-4" style={{ borderColor: `${s.color}20` }}>
                <div
                  className="flex items-center justify-center w-9 h-9 rounded-lg text-[10px] font-extrabold mb-3"
                  style={{ backgroundColor: `${s.color}20`, color: s.color, boxShadow: `0 0 16px ${glow}` }}
                >
                  {s.initials}
                </div>
                <h3 className="text-xs font-bold text-white mb-1">{s.title}</h3>
                <p className="text-[10px] text-zinc-400 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="h-8" />
    </div>
  )
}
