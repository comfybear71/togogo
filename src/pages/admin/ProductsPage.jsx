import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  MoreVertical,
  Star,
  Eye,
  AlertTriangle,
  Trash2,
  Award,
  Flag,
  ShieldX,
  Package,
  X,
  Image,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

const sampleProducts = [
  {
    id: '1',
    title: 'Vintage Leather Messenger Bag',
    price: 49.99,
    category: 'Bags & Accessories',
    seller: 'EcoArtisan Co.',
    status: 'active',
    views: 1842,
    image: null,
    featured: true,
  },
  {
    id: '2',
    title: 'Handmade Ceramic Mug Set (4pc)',
    price: 39.99,
    category: 'Home & Kitchen',
    seller: 'Craft & Bloom',
    status: 'active',
    views: 1205,
    image: null,
    featured: false,
  },
  {
    id: '3',
    title: 'Organic Cotton Tote Bag',
    price: 29.99,
    category: 'Bags & Accessories',
    seller: 'The Green Studio',
    status: 'under_review',
    views: 456,
    image: null,
    featured: false,
  },
  {
    id: '4',
    title: 'Artisan Soy Candle Collection',
    price: 44.99,
    category: 'Home & Kitchen',
    seller: 'Heritage Goods',
    status: 'active',
    views: 987,
    image: null,
    featured: false,
  },
  {
    id: '5',
    title: 'Recycled Glass Vase - Emerald',
    price: 39.99,
    category: 'Home Decor',
    seller: 'Makers United',
    status: 'removed',
    views: 234,
    image: null,
    featured: false,
  },
];

const reportedListings = [
  { id: 'r1', title: 'Suspicious Electronics Bundle', reason: 'Counterfeit goods', reportedBy: 'user@example.com', date: '2026-03-05' },
  { id: 'r2', title: 'Unlabeled Supplement Mix', reason: 'Prohibited item', reportedBy: 'buyer@example.com', date: '2026-03-06' },
];

const bannedItems = [
  { id: 'b1', keyword: 'counterfeit', addedDate: '2025-12-01' },
  { id: 'b2', keyword: 'replica designer', addedDate: '2025-12-15' },
  { id: 'b3', keyword: 'unauthorized pharmaceutical', addedDate: '2026-01-10' },
];

const statusColors = {
  active: 'bg-[#06D6A0]/10 text-[#06D6A0]',
  under_review: 'bg-[#FFD23F]/10 text-[#FFD23F]',
  removed: 'bg-red-100 text-red-400',
  draft: 'bg-white/[0.06] text-zinc-400',
};

const categories = ['All Categories', 'Bags & Accessories', 'Home & Kitchen', 'Home Decor', 'Clothing', 'Art', 'Jewelry'];
const statuses = ['All Status', 'active', 'under_review', 'removed', 'draft'];

export default function ProductsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [sellerFilter, setSellerFilter] = useState('');
  const [actionMenuProduct, setActionMenuProduct] = useState(null);
  const [bannedKeyword, setBannedKeyword] = useState('');

  const filteredProducts = sampleProducts.filter((p) => {
    if (searchQuery && !p.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (categoryFilter !== 'All Categories' && p.category !== categoryFilter) return false;
    if (statusFilter !== 'All Status' && p.status !== statusFilter) return false;
    if (sellerFilter && !p.seller.toLowerCase().includes(sellerFilter.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Product Management</h1>
        <p className="text-zinc-500">Manage listings, review reports, and moderate products.</p>
      </div>

      {/* Reported Listings Queue */}
      {reportedListings.length > 0 && (
        <div className="rounded-[16px] border-2 border-red-500/20 bg-red-500/10 p-5">
          <div className="mb-3 flex items-center gap-2">
            <Flag className="h-5 w-5 text-red-400" />
            <h2 className="text-lg font-semibold text-white">Reported Listings ({reportedListings.length})</h2>
          </div>
          <div className="space-y-2">
            {reportedListings.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-xl bg-[#111] p-3">
                <div>
                  <p className="text-sm font-medium text-white">{r.title}</p>
                  <p className="text-xs text-zinc-500">
                    Reason: <span className="font-medium text-red-400">{r.reason}</span> &middot; Reported by {r.reportedBy} &middot; {r.date}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600">Remove</button>
                  <button className="rounded-lg bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-white/[0.1]">Dismiss</button>
                  <button className="rounded-lg bg-[#FF6B35] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#FF6B35]/90">Review</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="rounded-[16px] bg-[#111] p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-white/[0.08] bg-[#0a0a0a] py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-600 focus:border-[#FF6B35] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] px-3 py-2.5 text-sm text-white focus:border-[#FF6B35] focus:outline-none"
          >
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] px-3 py-2.5 text-sm capitalize text-white focus:border-[#FF6B35] focus:outline-none"
          >
            {statuses.map((s) => (
              <option key={s} value={s} className="capitalize">{s === 'All Status' ? s : s.replace('_', ' ')}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Filter by seller..."
            value={sellerFilter}
            onChange={(e) => setSellerFilter(e.target.value)}
            className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-[#FF6B35] focus:outline-none"
          />
        </div>
      </div>

      {/* Products Table */}
      <div className="rounded-[16px] bg-[#111] p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-xs uppercase text-zinc-500">
                <th className="pb-3 pr-4">Product</th>
                <th className="pb-3 pr-4">Price</th>
                <th className="pb-3 pr-4">Category</th>
                <th className="pb-3 pr-4">Seller</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3 pr-4">Views</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((p) => (
                <tr key={p.id} className="border-b border-white/[0.04] transition-colors hover:bg-white/[0.04]">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.06]">
                        <Image className="h-5 w-5 text-zinc-600" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{p.title}</p>
                        {p.featured && (
                          <span className="inline-flex items-center gap-0.5 text-xs text-[#FFD23F]">
                            <Star className="h-3 w-3 fill-[#FFD23F]" /> Featured
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-4 font-medium text-white">${p.price.toFixed(2)}</td>
                  <td className="py-3 pr-4 text-zinc-400">{p.category}</td>
                  <td className="py-3 pr-4 text-zinc-400">{p.seller}</td>
                  <td className="py-3 pr-4">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusColors[p.status]}`}>
                      {p.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-1 text-zinc-400">
                      <Eye className="h-3.5 w-3.5" />
                      {p.views.toLocaleString()}
                    </div>
                  </td>
                  <td className="relative py-3 text-right">
                    <button
                      onClick={() => setActionMenuProduct(actionMenuProduct === p.id ? null : p.id)}
                      className="rounded-lg p-1.5 hover:bg-white/[0.06]"
                    >
                      <MoreVertical className="h-4 w-4 text-zinc-500" />
                    </button>
                    {actionMenuProduct === p.id && (
                      <div className="absolute right-0 top-full z-10 w-40 rounded-xl border border-white/[0.06] bg-[#111] py-1 shadow-lg">
                        <button className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-300 hover:bg-white/[0.04]">
                          <Award className="h-4 w-4 text-[#FFD23F]" /> Feature
                        </button>
                        <button className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-300 hover:bg-white/[0.04]">
                          <AlertTriangle className="h-4 w-4 text-[#FF6B35]" /> Warn Seller
                        </button>
                        <button className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10">
                          <Trash2 className="h-4 w-4" /> Remove
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Banned Items Management */}
      <div className="rounded-[16px] bg-[#111] p-6">
        <div className="mb-4 flex items-center gap-2">
          <ShieldX className="h-5 w-5 text-red-400" />
          <h2 className="text-lg font-semibold text-white">Banned Items Keywords</h2>
        </div>
        <div className="mb-4 flex gap-2">
          <input
            type="text"
            placeholder="Add banned keyword..."
            value={bannedKeyword}
            onChange={(e) => setBannedKeyword(e.target.value)}
            className="flex-1 rounded-xl border border-white/[0.08] bg-[#0a0a0a] px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-[#FF6B35] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20"
          />
          <button
            onClick={() => setBannedKeyword('')}
            className="rounded-xl bg-[#FF6B35] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#FF6B35]/90"
          >
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {bannedItems.map((b) => (
            <div key={b.id} className="flex items-center gap-2 rounded-full bg-red-500/10 px-3 py-1.5">
              <span className="text-sm font-medium text-red-400">{b.keyword}</span>
              <button className="text-red-400 hover:text-red-400">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
