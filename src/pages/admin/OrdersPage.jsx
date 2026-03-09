import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  Download,
  DollarSign,
  CreditCard,
  Wallet,
  AlertTriangle,
  ChevronRight,
  X,
  CheckCircle,
  Clock,
  Truck,
  Package,
  XCircle,
  MessageSquare,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

const sampleOrders = [
  {
    id: 'ORD-7821',
    buyer: 'Sarah Mitchell',
    buyerEmail: 'sarah.m@example.com',
    seller: 'EcoArtisan Co.',
    sellerEmail: 'eco@example.com',
    product: 'Vintage Leather Messenger Bag',
    total: 49.99,
    fee: 5.0,
    status: 'processing',
    date: '2026-03-07',
    shippingAddress: '123 Main St, Portland, OR 97201',
    trackingNumber: null,
    notes: '',
  },
  {
    id: 'ORD-7820',
    buyer: 'James Kowalski',
    buyerEmail: 'james.k@example.com',
    seller: 'Craft & Bloom',
    sellerEmail: 'craft@example.com',
    product: 'Handmade Ceramic Mug Set',
    total: 39.99,
    fee: 4.0,
    status: 'shipped',
    date: '2026-03-06',
    shippingAddress: '456 Elm Ave, Austin, TX 78701',
    trackingNumber: 'TRK-88291834',
    notes: '',
  },
  {
    id: 'ORD-7819',
    buyer: 'Aisha Rahman',
    buyerEmail: 'aisha.r@example.com',
    seller: 'The Green Studio',
    sellerEmail: 'green@example.com',
    product: 'Organic Cotton Tote Bag',
    total: 29.99,
    fee: 3.0,
    status: 'delivered',
    date: '2026-03-04',
    shippingAddress: '789 Oak Blvd, Brooklyn, NY 11201',
    trackingNumber: 'TRK-77182934',
    notes: 'Customer requested gift wrapping.',
  },
  {
    id: 'ORD-7818',
    buyer: 'Miguel Lopez',
    buyerEmail: 'miguel.l@example.com',
    seller: 'Heritage Goods',
    sellerEmail: 'heritage@example.com',
    product: 'Artisan Soy Candle Collection',
    total: 44.99,
    fee: 4.5,
    status: 'pending',
    date: '2026-03-07',
    shippingAddress: '321 Palm Dr, Miami, FL 33101',
    trackingNumber: null,
    notes: '',
  },
  {
    id: 'ORD-7817',
    buyer: 'Emily Chen',
    buyerEmail: 'emily.c@example.com',
    seller: 'Makers United',
    sellerEmail: 'makers@example.com',
    product: 'Recycled Glass Vase',
    total: 39.99,
    fee: 4.0,
    status: 'cancelled',
    date: '2026-03-03',
    shippingAddress: '654 Market St, San Francisco, CA 94102',
    trackingNumber: null,
    notes: 'Buyer requested cancellation.',
  },
];

const disputes = [
  {
    id: 'DSP-301',
    orderId: 'ORD-7815',
    buyer: 'Alex Johnson',
    seller: 'EcoArtisan Co.',
    reason: 'Item not as described',
    amount: 49.99,
    status: 'open',
    date: '2026-03-05',
    description: 'Buyer claims the leather color does not match listing photos.',
  },
  {
    id: 'DSP-302',
    orderId: 'ORD-7810',
    buyer: 'Lisa Wang',
    seller: 'Craft & Bloom',
    reason: 'Item not received',
    amount: 39.99,
    status: 'open',
    date: '2026-03-04',
    description: 'Tracking shows delivered but buyer says package was not received.',
  },
  {
    id: 'DSP-303',
    orderId: 'ORD-7802',
    buyer: 'Tom Harris',
    seller: 'Heritage Goods',
    reason: 'Damaged item',
    amount: 44.99,
    status: 'investigating',
    date: '2026-03-02',
    description: 'Candles arrived broken. Photos provided by buyer.',
  },
];

const statusConfig = {
  pending: { color: 'bg-[#FFD23F]/10 text-[#FFD23F]', icon: Clock },
  processing: { color: 'bg-blue-100 text-blue-700', icon: Package },
  shipped: { color: 'bg-[#FF6B35]/10 text-[#FF6B35]', icon: Truck },
  delivered: { color: 'bg-[#06D6A0]/10 text-[#06D6A0]', icon: CheckCircle },
  cancelled: { color: 'bg-red-100 text-red-600', icon: XCircle },
};

const disputeStatusColors = {
  open: 'bg-red-100 text-red-600',
  investigating: 'bg-[#FFD23F]/10 text-[#FFD23F]',
  resolved: 'bg-[#06D6A0]/10 text-[#06D6A0]',
};

export default function OrdersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);

  const filteredOrders = sampleOrders.filter((o) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!o.id.toLowerCase().includes(q) && !o.buyer.toLowerCase().includes(q) && !o.product.toLowerCase().includes(q)) return false;
    }
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    return true;
  });

  const totalFees = sampleOrders.reduce((sum, o) => sum + o.fee, 0);
  const totalPayouts = sampleOrders.filter((o) => o.status === 'delivered').reduce((sum, o) => sum + (o.total - o.fee), 0);
  const balance = totalFees;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <Link to="/admin" className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#FF6B35]">
              <ArrowLeft className="h-4 w-4" /> Back to Admin
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Orders & Finance</h1>
            <p className="text-gray-500">Manage orders, disputes, and financial transactions.</p>
          </div>
          <button className="flex items-center gap-2 rounded-xl bg-[#FF6B35] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#FF6B35]/90">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>

        {/* Financial Summary */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-[16px] bg-white p-5 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Fees Collected</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">${totalFees.toFixed(2)}</p>
              </div>
              <div className="rounded-xl bg-[#06D6A0]/10 p-3">
                <DollarSign className="h-6 w-6 text-[#06D6A0]" />
              </div>
            </div>
          </div>
          <div className="rounded-[16px] bg-white p-5 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Payouts</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">${totalPayouts.toFixed(2)}</p>
              </div>
              <div className="rounded-xl bg-[#FF6B35]/10 p-3">
                <CreditCard className="h-6 w-6 text-[#FF6B35]" />
              </div>
            </div>
          </div>
          <div className="rounded-[16px] bg-white p-5 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Platform Balance</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">${balance.toFixed(2)}</p>
              </div>
              <div className="rounded-xl bg-[#FFD23F]/10 p-3">
                <Wallet className="h-6 w-6 text-[#FFD23F]" />
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="rounded-[16px] bg-white p-5 shadow">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by order ID, buyer, or product..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 text-sm focus:border-[#FF6B35] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm capitalize focus:border-[#FF6B35] focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Orders Table */}
        <div className="rounded-[16px] bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Orders</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs uppercase text-gray-500">
                  <th className="pb-3 pr-4">Order ID</th>
                  <th className="pb-3 pr-4">Buyer</th>
                  <th className="pb-3 pr-4">Seller</th>
                  <th className="pb-3 pr-4">Product</th>
                  <th className="pb-3 pr-4 text-right">Total</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Date</th>
                  <th className="pb-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((o) => {
                  const sc = statusConfig[o.status];
                  const StatusIcon = sc.icon;
                  return (
                    <tr key={o.id} className="border-b border-gray-50 transition-colors hover:bg-gray-50/50">
                      <td className="py-3 pr-4 font-mono text-sm font-medium text-[#FF6B35]">{o.id}</td>
                      <td className="py-3 pr-4 text-gray-900">{o.buyer}</td>
                      <td className="py-3 pr-4 text-gray-600">{o.seller}</td>
                      <td className="py-3 pr-4 text-gray-600">{o.product}</td>
                      <td className="py-3 pr-4 text-right font-medium text-gray-900">${o.total.toFixed(2)}</td>
                      <td className="py-3 pr-4">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${sc.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {o.status}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-gray-600">{o.date}</td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => setSelectedOrder(o)}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-[#FF6B35]"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Disputes Section */}
        <div className="rounded-[16px] bg-white p-6 shadow">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-[#FF6B35]" />
            <h2 className="text-lg font-semibold text-gray-900">Open Disputes ({disputes.filter((d) => d.status !== 'resolved').length})</h2>
          </div>
          <div className="space-y-3">
            {disputes.map((d) => (
              <div key={d.id} className="rounded-xl border border-gray-100 p-4 transition-colors hover:border-gray-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium text-[#FF6B35]">{d.id}</span>
                      <span className="text-xs text-gray-400">&middot;</span>
                      <span className="text-xs text-gray-500">Order {d.orderId}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${disputeStatusColors[d.status]}`}>
                        {d.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-medium text-gray-900">{d.reason}</p>
                    <p className="mt-0.5 text-xs text-gray-500">{d.description}</p>
                    <p className="mt-1 text-xs text-gray-400">
                      {d.buyer} vs {d.seller} &middot; ${d.amount.toFixed(2)} &middot; {d.date}
                    </p>
                  </div>
                  <div className="ml-4 flex gap-2">
                    <button className="rounded-lg bg-[#06D6A0] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#06D6A0]/90">
                      Refund Buyer
                    </button>
                    <button className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200">
                      Side with Seller
                    </button>
                    <button className="rounded-lg bg-[#FF6B35]/10 px-3 py-1.5 text-xs font-medium text-[#FF6B35] hover:bg-[#FF6B35]/20">
                      <MessageSquare className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Detail Panel */}
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setSelectedOrder(null)}>
            <div className="w-full max-w-lg rounded-[16px] bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Order {selectedOrder.id}</h2>
                <button onClick={() => setSelectedOrder(null)} className="rounded-lg p-1 hover:bg-gray-100">
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              <div className="space-y-4">
                <div className="rounded-xl bg-gray-50 p-4">
                  <h3 className="text-sm font-semibold text-gray-700">Product</h3>
                  <p className="text-base font-medium text-gray-900">{selectedOrder.product}</p>
                  <p className="mt-1 text-2xl font-bold text-[#FF6B35]">${selectedOrder.total.toFixed(2)}</p>
                  <p className="text-xs text-gray-500">Platform fee: ${selectedOrder.fee.toFixed(2)}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-gray-100 p-3">
                    <p className="text-xs text-gray-500">Buyer</p>
                    <p className="text-sm font-medium text-gray-900">{selectedOrder.buyer}</p>
                    <p className="text-xs text-gray-500">{selectedOrder.buyerEmail}</p>
                  </div>
                  <div className="rounded-xl border border-gray-100 p-3">
                    <p className="text-xs text-gray-500">Seller</p>
                    <p className="text-sm font-medium text-gray-900">{selectedOrder.seller}</p>
                    <p className="text-xs text-gray-500">{selectedOrder.sellerEmail}</p>
                  </div>
                </div>
                <div className="rounded-xl border border-gray-100 p-3">
                  <p className="text-xs text-gray-500">Shipping Address</p>
                  <p className="text-sm text-gray-900">{selectedOrder.shippingAddress}</p>
                </div>
                {selectedOrder.trackingNumber && (
                  <div className="rounded-xl border border-gray-100 p-3">
                    <p className="text-xs text-gray-500">Tracking Number</p>
                    <p className="font-mono text-sm font-medium text-[#FF6B35]">{selectedOrder.trackingNumber}</p>
                  </div>
                )}
                <div className="rounded-xl border border-gray-100 p-3">
                  <p className="text-xs text-gray-500">Status</p>
                  <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusConfig[selectedOrder.status].color}`}>
                    {selectedOrder.status}
                  </span>
                </div>
                {selectedOrder.notes && (
                  <div className="rounded-xl border border-gray-100 p-3">
                    <p className="text-xs text-gray-500">Notes</p>
                    <p className="text-sm text-gray-900">{selectedOrder.notes}</p>
                  </div>
                )}
              </div>
              <div className="mt-5 flex gap-2">
                <button className="flex-1 rounded-xl bg-[#06D6A0] py-2.5 text-sm font-medium text-white hover:bg-[#06D6A0]/90">
                  Refund Order
                </button>
                <button className="flex-1 rounded-xl bg-gray-100 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200">
                  Contact Parties
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
