import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ChevronRight, ChevronLeft, BookOpen } from 'lucide-react'

// ─── Pre-written guides ───────────────────────────────────────────────
const GUIDES = {
  sell: {
    title: 'Start Selling',
    emoji: '🏷️',
    steps: [
      {
        heading: 'Pick something easy to sell',
        body: "You don't need a warehouse or a big budget. Start with things around your house — clothes you don't wear, electronics you've upgraded from, or shoes collecting dust. Everyone has stuff worth selling.",
      },
      {
        heading: 'Choose where to list it',
        body: "eBay and Facebook Marketplace are the easiest to start with — no monthly fees, millions of buyers already there. Just snap a photo, write a short description, set a price, and list it. Takes 5 minutes.",
      },
      {
        heading: 'Price it to sell fast',
        body: "Search for the same item on eBay and see what others are charging. Price yours slightly lower to sell quickly. A fast sale at a fair price beats sitting on an overpriced item for weeks.",
      },
      {
        heading: 'Ship it simply',
        body: "Most platforms let you print a shipping label right from the app. Pack the item in a padded envelope or small box, stick the label on, and drop it at your local post office. Done.",
      },
      {
        heading: 'Reinvest and grow',
        body: "Once you sell a few things, use that money to buy products specifically to resell. Check charity shops, clearance sales, and wholesale suppliers. This is how small sellers become big sellers.",
      },
    ],
  },
  trending: {
    title: 'Hot Products',
    emoji: '🔥',
    steps: [
      {
        heading: 'Phone accessories are always hot',
        body: "Phone cases, screen protectors, chargers, MagSafe accessories — everyone has a phone and they all need accessories. Low cost to buy (under $3 from suppliers), sell for $15-25. Great margins.",
      },
      {
        heading: 'Home organisation sells itself',
        body: "Storage boxes, drawer organisers, cable management, kitchen gadgets — people see these on TikTok and want them immediately. Cheap to source, easy to ship, high demand year-round.",
      },
      {
        heading: 'Health & wellness products',
        body: "Posture correctors, massage guns, resistance bands, water bottles with time markers — the wellness trend isn't slowing down. People will pay premium prices for anything that makes them feel healthier.",
      },
      {
        heading: 'Pet products are booming',
        body: "Pet owners spend like crazy. Collapsible bowls, LED collars, grooming tools, pet beds — the pet industry is worth billions and growing every year. Emotional purchases mean higher prices.",
      },
      {
        heading: 'Print-on-demand custom items',
        body: "Custom mugs, t-shirts, tote bags, phone cases — you design it, the supplier prints and ships it. Zero inventory. Use Printful or Printify through ToGoGo and start selling your own designs today.",
      },
    ],
  },
  dropship: {
    title: 'Dropshipping',
    emoji: '📦',
    steps: [
      {
        heading: 'What is dropshipping?',
        body: "You sell a product online. When someone buys it, your supplier ships it directly to the customer. You never touch the product. You never buy stock upfront. You just connect buyer to supplier and keep the profit.",
      },
      {
        heading: 'How it works step by step',
        body: "1. You list a product on eBay, Etsy, or your own store for $25.\n2. A customer buys it.\n3. You order it from your supplier for $8.\n4. The supplier ships it to your customer.\n5. You keep $17 profit.\n\nThat's it. No warehouse, no packing, no stock risk.",
      },
      {
        heading: 'Finding products to dropship',
        body: "Use the Suppliers page on ToGoGo — we connect you to CJ Dropshipping, AliExpress, Printful, Printify, and Gooten. Search for any product, see the cost price, and we calculate your profit margin automatically.",
      },
      {
        heading: 'Where to sell',
        body: "Start on eBay — it's free to list and has 130 million buyers. Once you're making sales, expand to Etsy, Amazon, or your own Shopify store. Use the Platforms page to see all your options.",
      },
      {
        heading: 'Tips for success',
        body: "Pick a niche — don't sell everything. Focus on one category (e.g. pet products or phone accessories). Write good titles and descriptions. Use real product photos. Price competitively. And be patient — the first sale takes the longest.",
      },
    ],
  },
  money: {
    title: 'Side Hustle Ideas',
    emoji: '💰',
    steps: [
      {
        heading: 'Flip items from charity shops',
        body: "Buy underpriced items at charity shops, car boot sales, and Facebook Marketplace, then resell them on eBay for more. Clothing brands, electronics, and vintage items work best. People do this full-time and earn thousands a month.",
      },
      {
        heading: 'Sell printables on Etsy',
        body: "Create digital planners, wall art, budget sheets, or party invitations using free tools like Canva. List them on Etsy. They're digital — no shipping, no stock, no cost per sale. Make it once, sell it forever.",
      },
      {
        heading: 'Start dropshipping (zero stock)',
        body: "Pick products from our suppliers, list them on eBay or your own store. When someone buys, the supplier ships directly. You never touch the product. Start with zero investment and scale up from profits.",
      },
      {
        heading: 'Print-on-demand merch',
        body: "Design t-shirts, mugs, hoodies, and phone cases. Suppliers like Printful print your design and ship it when someone orders. No minimum orders, no upfront cost. If you can use Canva, you can do this.",
      },
      {
        heading: 'Offer a service locally',
        body: "Dog walking, car washing, lawn mowing, furniture assembly, cleaning. Post on Facebook Marketplace, Nextdoor, or Airtasker. No website needed. People near you need help and will pay for it today.",
      },
    ],
  },
}

// Default guide when arriving without a topic
const DEFAULT_TOPIC = null

export default function AssistantPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const topicParam = searchParams.get('topic')
  const [selectedTopic, setSelectedTopic] = useState(topicParam || DEFAULT_TOPIC)
  const [stepIndex, setStepIndex] = useState(0)

  const guide = selectedTopic ? GUIDES[selectedTopic] : null
  const step = guide ? guide.steps[stepIndex] : null
  const isLastStep = guide ? stepIndex >= guide.steps.length - 1 : false

  const handleSelectTopic = (topicId) => {
    setSelectedTopic(topicId)
    setStepIndex(0)
  }

  const handleNext = () => {
    if (!isLastStep) {
      setStepIndex(stepIndex + 1)
    }
  }

  const handleBack = () => {
    if (stepIndex > 0) {
      setStepIndex(stepIndex - 1)
    } else {
      setSelectedTopic(null)
      setStepIndex(0)
    }
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-[#050505]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] bg-[#050505]/80 backdrop-blur-xl">
        <button
          onClick={() => (guide ? handleBack() : navigate('/'))}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.05] text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF6B35]/20 to-[#06D6A0]/20">
            <BookOpen className="h-4.5 w-4.5 text-[#FF6B35]" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white leading-tight">
              {guide ? guide.title : 'Guides'}
            </h1>
            <p className="text-[11px] text-zinc-500">
              {guide ? `Step ${stepIndex + 1} of ${guide.steps.length}` : 'Tap a topic to get started'}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-6">
        {!guide ? (
          /* ─── Topic picker ─── */
          <div className="flex flex-col items-center text-center pt-6">
            <div className="text-4xl mb-4">📖</div>
            <h2 className="font-heading text-2xl font-bold text-white mb-2">
              How can we help?
            </h2>
            <p className="text-sm text-zinc-500 max-w-[280px] mb-10 leading-relaxed">
              Pick a topic and we'll walk you through everything step by step.
            </p>

            <div className="flex flex-col gap-3 w-full max-w-[340px]">
              {Object.entries(GUIDES).map(([id, g]) => (
                <button
                  key={id}
                  onClick={() => handleSelectTopic(id)}
                  className="group text-left px-5 py-4 rounded-2xl bg-[#111] border border-white/[0.06] hover:border-white/[0.12] hover:bg-[#161616] transition-all duration-300 active:scale-[0.98] flex items-center justify-between"
                >
                  <div>
                    <span className="mr-3 text-lg">{g.emoji}</span>
                    <span className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">
                      {g.title}
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* ─── Step-by-step guide ─── */
          <div className="max-w-[400px] mx-auto">
            {/* Emoji */}
            <div className="text-center mb-6">
              <span className="text-5xl">{guide.emoji}</span>
            </div>

            {/* Progress dots */}
            <div className="flex items-center justify-center gap-2 mb-8">
              {guide.steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === stepIndex
                      ? 'w-6 bg-[#FF6B35]'
                      : i < stepIndex
                        ? 'w-1.5 bg-[#FF6B35]/40'
                        : 'w-1.5 bg-white/[0.08]'
                  }`}
                />
              ))}
            </div>

            {/* Step content */}
            <div className="rounded-2xl bg-[#111] border border-white/[0.06] p-6">
              <h3 className="font-heading text-lg font-bold text-white mb-4">
                {step.heading}
              </h3>
              <div className="text-sm text-zinc-400 leading-relaxed whitespace-pre-line">
                {step.body}
              </div>
            </div>

            {/* Navigation buttons */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleBack}
                className="flex items-center justify-center gap-1.5 px-5 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] text-sm font-medium text-zinc-400 hover:text-white hover:border-white/[0.12] transition-all active:scale-[0.97]"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>

              {isLastStep ? (
                <button
                  onClick={() => navigate('/')}
                  className="flex-1 flex items-center justify-center gap-1.5 px-5 py-3 rounded-xl bg-[#06D6A0] text-sm font-bold text-black hover:bg-[#06D6A0]/90 transition-all active:scale-[0.97]"
                >
                  Done — Back to Home
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="flex-1 flex items-center justify-center gap-1.5 px-5 py-3 rounded-xl bg-[#FF6B35] text-sm font-bold text-white hover:bg-[#e55a2b] transition-all active:scale-[0.97]"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
