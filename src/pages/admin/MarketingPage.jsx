import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Bell,
  Send,
  Tag,
  Percent,
  DollarSign,
  Image,
  ExternalLink,
  ToggleLeft,
  ToggleRight,
  Mail,
  Trash2,
  Plus,
  Copy,
  Calendar,
  Users,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';

const existingPromoCodes = [
  { id: '1', code: 'WELCOME20', type: 'percent', value: 20, maxUses: 500, used: 312, expiry: '2026-04-30', active: true },
  { id: '2', code: 'SPRING15', type: 'percent', value: 15, maxUses: 1000, used: 87, expiry: '2026-03-31', active: true },
  { id: '3', code: 'SAVE10', type: 'fixed', value: 10, maxUses: 200, used: 200, expiry: '2026-02-28', active: false },
  { id: '4', code: 'FREESHIP', type: 'fixed', value: 5.99, maxUses: 300, used: 145, expiry: '2026-05-15', active: true },
];

const existingBanners = [
  { id: '1', title: 'Spring Sale 2026', imageUrl: '', linkUrl: '/deals/spring', active: true },
  { id: '2', title: 'New Seller Spotlight', imageUrl: '', linkUrl: '/sellers/featured', active: true },
  { id: '3', title: 'Earth Day Collection', imageUrl: '', linkUrl: '/collections/earth-day', active: false },
];

export default function MarketingPage() {
  // Push notification state
  const [notifTitle, setNotifTitle] = useState('');
  const [notifBody, setNotifBody] = useState('');
  const [notifSegment, setNotifSegment] = useState('all');

  // Promo code state
  const [promoCode, setPromoCode] = useState('');
  const [promoType, setPromoType] = useState('percent');
  const [promoValue, setPromoValue] = useState('');
  const [promoMaxUses, setPromoMaxUses] = useState('');
  const [promoExpiry, setPromoExpiry] = useState('');

  // Banner state
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerLink, setBannerLink] = useState('');

  // Email campaign state
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailSegment, setEmailSegment] = useState('all');

  const [promoCodes, setPromoCodes] = useState(existingPromoCodes);
  const [banners, setBanners] = useState(existingBanners);

  const handleSendNotification = () => {
    alert(`Push notification sent!\nTitle: ${notifTitle}\nSegment: ${notifSegment}`);
    setNotifTitle('');
    setNotifBody('');
  };

  const handleCreatePromo = () => {
    if (!promoCode || !promoValue) return;
    setPromoCodes([
      ...promoCodes,
      {
        id: String(Date.now()),
        code: promoCode.toUpperCase(),
        type: promoType,
        value: parseFloat(promoValue),
        maxUses: parseInt(promoMaxUses) || 100,
        used: 0,
        expiry: promoExpiry || '2026-12-31',
        active: true,
      },
    ]);
    setPromoCode('');
    setPromoValue('');
    setPromoMaxUses('');
    setPromoExpiry('');
  };

  const handleSendEmail = () => {
    alert(`Email campaign sent!\nSubject: ${emailSubject}\nSegment: ${emailSegment}`);
    setEmailSubject('');
    setEmailBody('');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <Link to="/admin" className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#FF6B35]">
            <ArrowLeft className="h-4 w-4" /> Back to Admin
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Marketing & Promotions</h1>
          <p className="text-gray-500">Manage push notifications, promo codes, banners, and email campaigns.</p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Push Notification Composer */}
          <div className="rounded-[16px] bg-white p-6 shadow">
            <div className="mb-4 flex items-center gap-2">
              <Bell className="h-5 w-5 text-[#FF6B35]" />
              <h2 className="text-lg font-semibold text-gray-900">Push Notification</h2>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  placeholder="Notification title..."
                  value={notifTitle}
                  onChange={(e) => setNotifTitle(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#FF6B35] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Body</label>
                <textarea
                  placeholder="Notification message..."
                  value={notifBody}
                  onChange={(e) => setNotifBody(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#FF6B35] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Segment</label>
                <select
                  value={notifSegment}
                  onChange={(e) => setNotifSegment(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-[#FF6B35] focus:outline-none"
                >
                  <option value="all">All Users</option>
                  <option value="buyers">Buyers Only</option>
                  <option value="sellers">Sellers Only</option>
                </select>
              </div>
              <button
                onClick={handleSendNotification}
                disabled={!notifTitle || !notifBody}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF6B35] py-2.5 text-sm font-medium text-white hover:bg-[#FF6B35]/90 disabled:opacity-50"
              >
                <Send className="h-4 w-4" /> Send Notification
              </button>
            </div>
          </div>

          {/* Email Campaign */}
          <div className="rounded-[16px] bg-white p-6 shadow">
            <div className="mb-4 flex items-center gap-2">
              <Mail className="h-5 w-5 text-[#06D6A0]" />
              <h2 className="text-lg font-semibold text-gray-900">Email Campaign</h2>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Subject</label>
                <input
                  type="text"
                  placeholder="Email subject line..."
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#FF6B35] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Body</label>
                <textarea
                  placeholder="Email content..."
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#FF6B35] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Segment</label>
                <select
                  value={emailSegment}
                  onChange={(e) => setEmailSegment(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-[#FF6B35] focus:outline-none"
                >
                  <option value="all">All Users</option>
                  <option value="buyers">Buyers Only</option>
                  <option value="sellers">Sellers Only</option>
                </select>
              </div>
              <button
                onClick={handleSendEmail}
                disabled={!emailSubject || !emailBody}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#06D6A0] py-2.5 text-sm font-medium text-white hover:bg-[#06D6A0]/90 disabled:opacity-50"
              >
                <Mail className="h-4 w-4" /> Send Campaign
              </button>
            </div>
          </div>
        </div>

        {/* Promo Code Generator */}
        <div className="rounded-[16px] bg-white p-6 shadow">
          <div className="mb-4 flex items-center gap-2">
            <Tag className="h-5 w-5 text-[#FFD23F]" />
            <h2 className="text-lg font-semibold text-gray-900">Promo Code Generator</h2>
          </div>
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-gray-700">Code</label>
              <input
                type="text"
                placeholder="e.g. SUMMER25"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm uppercase focus:border-[#FF6B35] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20"
              />
            </div>
            <div className="w-32">
              <label className="mb-1 block text-sm font-medium text-gray-700">Type</label>
              <select
                value={promoType}
                onChange={(e) => setPromoType(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-[#FF6B35] focus:outline-none"
              >
                <option value="percent">% Off</option>
                <option value="fixed">$ Off</option>
              </select>
            </div>
            <div className="w-28">
              <label className="mb-1 block text-sm font-medium text-gray-700">Value</label>
              <input
                type="number"
                placeholder="e.g. 20"
                value={promoValue}
                onChange={(e) => setPromoValue(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#FF6B35] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20"
              />
            </div>
            <div className="w-28">
              <label className="mb-1 block text-sm font-medium text-gray-700">Max Uses</label>
              <input
                type="number"
                placeholder="e.g. 500"
                value={promoMaxUses}
                onChange={(e) => setPromoMaxUses(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#FF6B35] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20"
              />
            </div>
            <div className="w-40">
              <label className="mb-1 block text-sm font-medium text-gray-700">Expiry Date</label>
              <input
                type="date"
                value={promoExpiry}
                onChange={(e) => setPromoExpiry(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#FF6B35] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20"
              />
            </div>
            <button
              onClick={handleCreatePromo}
              disabled={!promoCode || !promoValue}
              className="flex items-center gap-2 rounded-xl bg-[#FFD23F] px-5 py-2.5 text-sm font-medium text-gray-900 hover:bg-[#FFD23F]/90 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" /> Create
            </button>
          </div>

          {/* Existing Promo Codes */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs uppercase text-gray-500">
                  <th className="pb-3 pr-4">Code</th>
                  <th className="pb-3 pr-4">Discount</th>
                  <th className="pb-3 pr-4">Usage</th>
                  <th className="pb-3 pr-4">Expiry</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {promoCodes.map((p) => (
                  <tr key={p.id} className="border-b border-gray-50">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="rounded-lg bg-gray-100 px-2.5 py-1 font-mono text-sm font-medium text-gray-900">{p.code}</span>
                        <button className="text-gray-400 hover:text-gray-600">
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="py-3 pr-4 font-medium text-gray-900">
                      {p.type === 'percent' ? `${p.value}%` : `$${p.value.toFixed(2)}`}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-20 rounded-full bg-gray-100">
                          <div
                            className="h-2 rounded-full bg-[#06D6A0]"
                            style={{ width: `${Math.min((p.used / p.maxUses) * 100, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">
                          {p.used}/{p.maxUses}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-gray-600">{p.expiry}</td>
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          p.active ? 'bg-[#06D6A0]/10 text-[#06D6A0]' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {p.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <button className="rounded-lg p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Homepage Banner Manager */}
        <div className="rounded-[16px] bg-white p-6 shadow">
          <div className="mb-4 flex items-center gap-2">
            <Image className="h-5 w-5 text-[#FF6B35]" />
            <h2 className="text-lg font-semibold text-gray-900">Homepage Banners</h2>
          </div>

          {/* Add Banner */}
          <div className="mb-5 flex flex-col gap-3 rounded-xl border border-dashed border-gray-300 bg-gray-50/50 p-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-gray-700">Banner Title</label>
              <input
                type="text"
                placeholder="e.g. Summer Sale Banner"
                value={bannerTitle}
                onChange={(e) => setBannerTitle(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-[#FF6B35] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-gray-700">Link URL</label>
              <input
                type="text"
                placeholder="e.g. /deals/summer"
                value={bannerLink}
                onChange={(e) => setBannerLink(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-[#FF6B35] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Image</label>
              <button className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-500 hover:border-[#FF6B35] hover:text-[#FF6B35]">
                <Image className="h-4 w-4" /> Upload
              </button>
            </div>
            <button
              disabled={!bannerTitle}
              className="flex items-center gap-2 rounded-xl bg-[#FF6B35] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#FF6B35]/90 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" /> Add Banner
            </button>
          </div>

          {/* Existing Banners */}
          <div className="space-y-3">
            {banners.map((b) => (
              <div key={b.id} className="flex items-center justify-between rounded-xl border border-gray-100 p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-28 items-center justify-center rounded-lg bg-gradient-to-r from-[#FF6B35]/20 to-[#06D6A0]/20">
                    <Image className="h-6 w-6 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{b.title}</p>
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                      <ExternalLink className="h-3 w-3" />
                      {b.linkUrl}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() =>
                      setBanners(banners.map((bn) => (bn.id === b.id ? { ...bn, active: !bn.active } : bn)))
                    }
                    className="flex items-center gap-2"
                  >
                    {b.active ? (
                      <ToggleRight className="h-7 w-7 text-[#06D6A0]" />
                    ) : (
                      <ToggleLeft className="h-7 w-7 text-gray-300" />
                    )}
                    <span className={`text-xs font-medium ${b.active ? 'text-[#06D6A0]' : 'text-gray-400'}`}>
                      {b.active ? 'Active' : 'Inactive'}
                    </span>
                  </button>
                  <button className="rounded-lg p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
