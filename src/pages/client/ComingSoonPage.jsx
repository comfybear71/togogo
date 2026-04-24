import { Link } from 'react-router-dom'
import { ArrowLeft, Sparkles } from 'lucide-react'

// Shared "coming soon" component for Phase 1 sidebar routes that don't
// yet have real content (My Store / Orders / Earnings). Keeps the nav
// feeling complete so users can see what's coming.
//
// Consistent, friendly, and always includes a back button — elderly
// users hate being stranded on a dead-end page.
export default function ComingSoonPage({ icon: Icon, title, description, bullets = [] }) {
  return (
    <div className="mx-auto max-w-3xl p-4 md:p-8 text-[16px]">
      <Link
        to="/my-shop"
        className="inline-flex items-center gap-2 text-[16px] text-zinc-400 hover:text-white mb-6 min-h-[44px]"
      >
        <ArrowLeft className="h-5 w-5" aria-hidden />
        Back to Home
      </Link>

      <div className="rounded-2xl border border-white/[0.06] bg-[#111] p-8 md:p-12 text-center">
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-[#FF6B35]/15">
          <Icon className="h-10 w-10 text-[#FF6B35]" aria-hidden />
        </div>

        <div className="inline-flex items-center gap-1 rounded-full bg-[#FF6B35]/10 text-[#FF6B35] text-[13px] font-semibold px-3 py-1 mb-3">
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          Coming soon
        </div>

        <h1 className="text-[28px] md:text-[32px] font-bold text-white mb-3">{title}</h1>
        <p className="text-[17px] text-zinc-300 mb-6 max-w-xl mx-auto">{description}</p>

        {bullets.length > 0 && (
          <ul className="text-left max-w-md mx-auto space-y-2">
            {bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-2 text-[15px] text-zinc-400">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#FF6B35] flex-shrink-0" aria-hidden />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
