import { useState } from 'react'
import {
  Truck, Package, Globe, Clock, Calculator, MapPin,
  CheckCircle2, DollarSign, Shield,
} from 'lucide-react'
import Button from '../components/ui/Button'

const CARRIERS = [
  { name: 'Royal Mail', speed: '3-5 days', price: 'From $3.99', region: 'UK', color: '#E42313' },
  { name: 'USPS', speed: '5-8 days', price: 'From $4.99', region: 'US', color: '#004B87' },
  { name: 'DHL Express', speed: '2-4 days', price: 'From $12.99', region: 'International', color: '#FFCC00' },
  { name: 'FedEx', speed: '3-7 days', price: 'From $8.99', region: 'International', color: '#4D148C' },
  { name: 'ePacket', speed: '10-20 days', price: 'From $1.99', region: 'Global', color: '#06D6A0' },
]

const SHIPPING_ZONES = [
  { zone: 'Domestic (UK)', estimate: '3-5 business days', cost: 'Free with Pro' },
  { zone: 'Europe', estimate: '5-10 business days', cost: 'From $4.99' },
  { zone: 'North America', estimate: '7-14 business days', cost: 'From $6.99' },
  { zone: 'Rest of World', estimate: '10-21 business days', cost: 'From $8.99' },
]

const TRACKING_STATUSES = [
  { status: 'Order Placed', desc: 'Order confirmed and payment received', done: true },
  { status: 'Processing', desc: 'Supplier preparing your order', done: true },
  { status: 'Shipped', desc: 'Package handed to carrier', done: true },
  { status: 'In Transit', desc: 'On the way to destination', done: false },
  { status: 'Delivered', desc: 'Package delivered successfully', done: false },
]

export default function ShippingPage() {
  const [activeTab, setActiveTab] = useState('overview')
  const [calcFrom, setCalcFrom] = useState('UK')
  const [calcTo, setCalcTo] = useState('US')
  const [calcWeight, setCalcWeight] = useState('0.5')

  return (
    <div className="py-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#06D6A0]/15">
          <Truck className="h-5 w-5 text-[#06D6A0]" />
        </div>
        <div>
          <h1 className="text-xl font-heading font-bold text-white">Shipping</h1>
          <p className="text-[10px] text-zinc-500">Rates, tracking, and delivery info</p>
        </div>
      </div>

      {/* Key info */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="rounded-xl bg-[#111] border border-white/[0.06] p-3 text-center">
          <DollarSign className="h-4 w-4 text-[#06D6A0] mx-auto mb-1" />
          <p className="text-xs font-bold text-white">Free</p>
          <p className="text-[9px] text-zinc-500">UK Shipping</p>
        </div>
        <div className="rounded-xl bg-[#111] border border-white/[0.06] p-3 text-center">
          <Globe className="h-4 w-4 text-[#a78bfa] mx-auto mb-1" />
          <p className="text-xs font-bold text-white">200+</p>
          <p className="text-[9px] text-zinc-500">Countries</p>
        </div>
        <div className="rounded-xl bg-[#111] border border-white/[0.06] p-3 text-center">
          <Shield className="h-4 w-4 text-[#FFD23F] mx-auto mb-1" />
          <p className="text-xs font-bold text-white">Insured</p>
          <p className="text-[9px] text-zinc-500">All Parcels</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1 scrollbar-hide">
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'carriers', label: 'Carriers' },
          { key: 'calculator', label: 'Rate Calculator' },
          { key: 'tracking', label: 'Tracking' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-medium border transition-colors ${
              activeTab === t.key
                ? 'bg-[#06D6A0]/15 border-[#06D6A0]/30 text-[#06D6A0]'
                : 'bg-[#111] border-white/[0.06] text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-3">
          <div className="rounded-xl bg-[#111] border border-white/[0.06] p-5">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">
              How Shipping Works
            </h3>
            <div className="space-y-4">
              {[
                { icon: Package, text: 'Your supplier ships directly to your customer', color: '#FF6B35' },
                { icon: Clock, text: 'Delivery times vary by supplier and destination', color: '#FFD23F' },
                { icon: MapPin, text: 'Tracking numbers provided for all shipments', color: '#06D6A0' },
                { icon: Shield, text: 'Full buyer protection on every order', color: '#a78bfa' },
              ].map((item, i) => {
                const Icon = item.icon
                return (
                  <div key={i} className="flex items-start gap-3">
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0"
                      style={{ backgroundColor: `${item.color}15` }}
                    >
                      <Icon className="h-4 w-4" style={{ color: item.color }} />
                    </div>
                    <p className="text-xs text-zinc-300 pt-1.5">{item.text}</p>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="rounded-xl bg-[#111] border border-white/[0.06] p-5">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">
              Shipping Zones & Estimates
            </h3>
            <div className="space-y-2">
              {SHIPPING_ZONES.map((zone) => (
                <div
                  key={zone.zone}
                  className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-0"
                >
                  <div>
                    <p className="text-xs font-medium text-white">{zone.zone}</p>
                    <p className="text-[10px] text-zinc-500">{zone.estimate}</p>
                  </div>
                  <span className="text-[10px] font-semibold text-[#06D6A0]">{zone.cost}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Carriers */}
      {activeTab === 'carriers' && (
        <div className="space-y-3">
          {CARRIERS.map((carrier) => (
            <div
              key={carrier.name}
              className="rounded-xl bg-[#111] border border-white/[0.06] p-4 hover:border-white/[0.12] transition-all"
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${carrier.color}20` }}
                >
                  <Truck className="h-5 w-5" style={{ color: carrier.color }} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xs font-bold text-white">{carrier.name}</h3>
                  <p className="text-[10px] text-zinc-500">{carrier.region}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-white">{carrier.price}</p>
                  <p className="text-[10px] text-zinc-500">{carrier.speed}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rate Calculator */}
      {activeTab === 'calculator' && (
        <div className="rounded-xl bg-[#111] border border-white/[0.06] p-5">
          <div className="flex items-center gap-2 mb-5">
            <Calculator className="h-4 w-4 text-[#FF6B35]" />
            <h3 className="text-sm font-semibold text-white">Estimate Shipping Cost</h3>
          </div>

          <div className="space-y-3 mb-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-zinc-500 mb-1 block">From</label>
                <select
                  value={calcFrom}
                  onChange={(e) => setCalcFrom(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-[#0a0a0a] border border-white/[0.06] text-xs text-white focus:outline-none focus:border-[#06D6A0]/40 appearance-none"
                >
                  <option value="UK">United Kingdom</option>
                  <option value="US">United States</option>
                  <option value="CN">China</option>
                  <option value="EU">Europe</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 mb-1 block">To</label>
                <select
                  value={calcTo}
                  onChange={(e) => setCalcTo(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-[#0a0a0a] border border-white/[0.06] text-xs text-white focus:outline-none focus:border-[#06D6A0]/40 appearance-none"
                >
                  <option value="US">United States</option>
                  <option value="UK">United Kingdom</option>
                  <option value="EU">Europe</option>
                  <option value="AU">Australia</option>
                  <option value="CA">Canada</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 mb-1 block">Weight (kg)</label>
              <input
                type="number"
                value={calcWeight}
                onChange={(e) => setCalcWeight(e.target.value)}
                step="0.1"
                min="0.1"
                className="w-full px-3 py-2.5 rounded-lg bg-[#0a0a0a] border border-white/[0.06] text-xs text-white focus:outline-none focus:border-[#06D6A0]/40"
              />
            </div>
          </div>

          <div className="rounded-lg bg-[#0a0a0a] border border-white/[0.04] p-4">
            <p className="text-[10px] text-zinc-500 mb-3">Estimated rates for {calcWeight}kg ({calcFrom} to {calcTo})</p>
            <div className="space-y-2">
              <div className="flex justify-between items-center py-1.5">
                <div>
                  <p className="text-xs text-white font-medium">Economy</p>
                  <p className="text-[9px] text-zinc-500">10-20 business days</p>
                </div>
                <span className="text-xs font-bold text-[#06D6A0]">$1.99</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-t border-white/[0.04]">
                <div>
                  <p className="text-xs text-white font-medium">Standard</p>
                  <p className="text-[9px] text-zinc-500">7-14 business days</p>
                </div>
                <span className="text-xs font-bold text-white">$4.99</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-t border-white/[0.04]">
                <div>
                  <p className="text-xs text-white font-medium">Express</p>
                  <p className="text-[9px] text-zinc-500">3-5 business days</p>
                </div>
                <span className="text-xs font-bold text-white">$12.99</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tracking */}
      {activeTab === 'tracking' && (
        <div className="space-y-4">
          <div className="rounded-xl bg-[#111] border border-white/[0.06] p-5">
            <h3 className="text-xs font-semibold text-white mb-3">Track a Package</h3>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter tracking number..."
                className="flex-1 px-3 py-2.5 rounded-lg bg-[#0a0a0a] border border-white/[0.06] text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#06D6A0]/40"
              />
              <Button size="sm" variant="secondary">Track</Button>
            </div>
          </div>

          <div className="rounded-xl bg-[#111] border border-white/[0.06] p-5">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">
              Example Tracking Timeline
            </h3>
            <div className="space-y-0">
              {TRACKING_STATUSES.map((s, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`flex h-6 w-6 items-center justify-center rounded-full flex-shrink-0 ${
                      s.done ? 'bg-[#06D6A0]/15' : 'bg-white/[0.04]'
                    }`}>
                      {s.done ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#06D6A0]" />
                      ) : (
                        <div className="h-2 w-2 rounded-full bg-zinc-700" />
                      )}
                    </div>
                    {i < TRACKING_STATUSES.length - 1 && (
                      <div className={`w-px h-8 ${s.done ? 'bg-[#06D6A0]/30' : 'bg-white/[0.06]'}`} />
                    )}
                  </div>
                  <div className="pb-6">
                    <p className={`text-xs font-medium ${s.done ? 'text-white' : 'text-zinc-600'}`}>
                      {s.status}
                    </p>
                    <p className="text-[10px] text-zinc-500">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
