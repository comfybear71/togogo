import { Link } from 'react-router-dom'
import {
  Rocket, Store, Package, Globe, TrendingUp, Zap,
  ArrowRight, CheckCircle2, DollarSign, Users, Truck,
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import Button from '../components/ui/Button'

const STEPS = [
  {
    num: 1,
    icon: Package,
    title: 'Choose Products',
    desc: 'Browse thousands of products from 5+ global suppliers. No inventory needed.',
    color: '#FF6B35',
    link: '/suppliers',
    linkText: 'Browse Suppliers',
  },
  {
    num: 2,
    icon: Store,
    title: 'Create Your Store',
    desc: 'Launch a branded storefront in seconds with one-click store creation.',
    color: '#06D6A0',
    link: '/create-store',
    linkText: 'Create Store',
  },
  {
    num: 3,
    icon: Globe,
    title: 'Connect Platforms',
    desc: 'Sell on eBay, Etsy, Amazon, TikTok Shop and more — all synced automatically.',
    color: '#a78bfa',
    link: '/platforms',
    linkText: 'View Platforms',
  },
  {
    num: 4,
    icon: DollarSign,
    title: 'Start Earning',
    desc: 'Set your prices, fulfill orders with one click, and watch the profit roll in.',
    color: '#FFD23F',
    link: '/dashboard',
    linkText: 'View Dashboard',
  },
]

const FEATURES = [
  { icon: Zap, text: 'Automated order fulfillment', color: '#FFD23F' },
  { icon: Truck, text: 'Suppliers ship directly to customers', color: '#06D6A0' },
  { icon: Users, text: 'Sell to customers worldwide', color: '#a78bfa' },
  { icon: TrendingUp, text: 'Real-time analytics & profit tracking', color: '#FF6B35' },
]

export default function SellPage() {
  const user = useAuthStore((s) => s.user)

  return (
    <div className="py-6 max-w-2xl mx-auto">
      {/* Hero */}
      <div className="text-center mb-10">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FF6B35]/20 to-[#FFD23F]/20 mx-auto mb-4">
          <Rocket className="h-7 w-7 text-[#FF6B35]" />
        </div>
        <h1 className="font-heading text-3xl font-bold text-white mb-3">
          Start Selling Today
        </h1>
        <p className="text-sm text-zinc-500 max-w-[320px] mx-auto leading-relaxed">
          Everything you need to build a profitable online business — no experience required.
        </p>
      </div>

      {/* Steps */}
      <div className="space-y-4 mb-10">
        {STEPS.map((step) => {
          const Icon = step.icon
          return (
            <div
              key={step.num}
              className="rounded-xl bg-[#111] border border-white/[0.06] p-5 hover:border-white/[0.12] transition-all"
            >
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${step.color}15` }}
                  >
                    <Icon className="h-5 w-5" style={{ color: step.color }} />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ backgroundColor: `${step.color}15`, color: step.color }}
                    >
                      Step {step.num}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white mb-1">{step.title}</h3>
                  <p className="text-xs text-zinc-500 leading-relaxed mb-3">{step.desc}</p>
                  <Link
                    to={step.link}
                    className="inline-flex items-center gap-1 text-[10px] font-semibold transition-colors hover:opacity-80"
                    style={{ color: step.color }}
                  >
                    {step.linkText} <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Features */}
      <div className="rounded-xl bg-[#111] border border-white/[0.06] p-5 mb-8">
        <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">
          Why sell with ToGoGo
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {FEATURES.map((f, i) => {
            const Icon = f.icon
            return (
              <div key={i} className="flex items-start gap-2.5">
                <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: f.color }} />
                <span className="text-xs text-zinc-300">{f.text}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* CTA */}
      <div className="text-center">
        {user ? (
          <Link to="/create-store">
            <Button size="lg" className="px-10">
              <Store className="h-4 w-4 mr-2" />
              Create Your Store
            </Button>
          </Link>
        ) : (
          <Link to="/auth?redirect=/create-store">
            <Button size="lg" className="px-10">
              Get Started Free <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        )}
        <p className="text-[10px] text-zinc-600 mt-3">$19.99/mo for full access. Cancel anytime.</p>
      </div>
    </div>
  )
}
