import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

const CHANNELS = [
  {
    name: 'Instagram',
    emoji: '📸',
    desc: 'Post product photos, stories, and reels. Best for visual products. Huge audience.',
    approach: 'Product photos, behind-the-scenes stories, reels showcasing products in use, hashtag strategy to reach new buyers.',
  },
  {
    name: 'Facebook',
    emoji: '👥',
    desc: 'Share to pages, groups, and Marketplace. Reach local and global buyers.',
    approach: 'Facebook Marketplace listings, group posting, page content, targeted sharing in buy/sell groups.',
  },
  {
    name: 'TikTok',
    emoji: '🎵',
    desc: 'Short videos that go viral. Products sell fast here — especially trendy items.',
    approach: 'Product showcase videos, trending sound pairing, unboxing content, TikTok Shop integration.',
  },
  {
    name: 'Pinterest',
    emoji: '📌',
    desc: 'Visual discovery platform. People come here specifically looking to buy things.',
    approach: 'Rich product pins, board organisation by category, SEO-optimised descriptions for long-term discovery.',
  },
  {
    name: 'YouTube',
    emoji: '🎬',
    desc: 'Product reviews and shorts. Great for building trust and showing products in detail.',
    approach: 'YouTube Shorts for quick showcases, product review videos, comparison content, unboxing.',
  },
  {
    name: 'X (Twitter)',
    emoji: '💬',
    desc: 'Quick product announcements and deal sharing. Good for building a following.',
    approach: 'New product tweets, deal announcements, engaging with trending topics, building community.',
  },
]

const STRATEGIES = [
  {
    title: 'Auto-Scheduling',
    emoji: '📅',
    desc: 'Set your posting schedule and ToGoGo handles the rest. Posts go out automatically across all your connected channels.',
  },
  {
    title: 'Smart Captions',
    emoji: '✍️',
    desc: 'Pre-written caption templates and hashtag sets for every product category. Just pick a template and post.',
  },
  {
    title: 'Cross-Platform Posting',
    emoji: '🔄',
    desc: 'One product, every platform. ToGoGo formats your posts correctly for each platform so you only do the work once.',
  },
  {
    title: 'Performance Tracking',
    emoji: '📊',
    desc: 'See which posts and platforms drive the most clicks and sales. Focus your time on what actually works.',
  },
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
      <div className="space-y-3 mb-6">
        {CHANNELS.map((ch) => (
          <div key={ch.name} className="rounded-2xl bg-[#111] border border-white/[0.06] p-4">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xl">{ch.emoji}</span>
              <h3 className="text-sm font-bold text-white">{ch.name}</h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed mb-2">{ch.desc}</p>
            <p className="text-[11px] text-zinc-500"><span className="text-zinc-300 font-medium">Our approach:</span> {ch.approach}</p>
          </div>
        ))}
      </div>

      {/* Marketing tools */}
      <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 px-1">Marketing tools included</h2>
      <div className="grid grid-cols-2 gap-3">
        {STRATEGIES.map((s) => (
          <div key={s.title} className="rounded-2xl bg-[#111] border border-white/[0.06] p-4">
            <span className="text-2xl block mb-2">{s.emoji}</span>
            <h3 className="text-xs font-bold text-white mb-1">{s.title}</h3>
            <p className="text-[10px] text-zinc-400 leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>

      <div className="h-20" />
    </div>
  )
}
