import { useState, useEffect } from 'react';
import {
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
  Loader2,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

const API_BASE = import.meta.env.VITE_API_URL || '';

const statusConfig = {
  pending: { color: 'bg-[#FFD23F]/10 text-[#FFD23F]', icon: Clock },
  processing: { color: 'bg-blue-500/10 text-blue-400', icon: Package },
  shipped: { color: 'bg-[#FF6B35]/10 text-[#FF6B35]', icon: Truck },
  delivered: { color: 'bg-[#06D6A0]/10 text-[#06D6A0]', icon: CheckCircle },
  cancelled: { color: 'bg-red-500/10 text-red-400', icon: XCircle },
  refunded: { color: 'bg-zinc-500/10 text-zinc-400', icon: XCircle },
};

const disputeStatusColors = {
  open: 'bg-red-500/10 text-red-400',
  under_review: 'bg-[#FFD23F]/10 text-[#FFD23F]',
  won: 'bg-[#06D6A0]/10 text-[#06D6A0]',
  lost: 'bg-red-500/10 text-red-400',
  closed: 'bg-white/[0.06] text-zinc-400',
};

export default function OrdersPage() {
  const token = localStorage.getItem('togogo-token');
  const [orders, setOrders] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [financials, setFinancials] = useState({ total_fees: 0, total_payouts: 0, platform_balance: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => { fetchOrders(); }, []);

  async function fetchOrders() {
    try {
      const res = await fetch(`${API_BASE}/api/admin/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
        setDisputes(data.disputes || []);
        setFinancials(data.financials || { total_fees: 0, total_payouts: 0, platform_balance: 0 });
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoading(false);
    }
  }

  const filteredOrders = orders.filter((o) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (
        !o.id.toLowerCase().includes(q) &&
        !(o.customer_name || '').toLowerCase().includes(q) &&
        !(o.product_title || '').toLowerCase().includes(q)
      ) return false;
    }
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    return true;
  });

  const totalFees = parseFloat(financials.total_fees) || 0;
  const totalPayouts = parseFloat(financials.total_payouts) || 0;
  const balance = parseFloat(financials.platform_balance) || 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF6B35]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Orders & Finance</h1>
          <p className="text-zinc-500">Manage orders, disputes, and financial transactions.</p>
        </div>
        <button className="flex items-center gap-2 rounded-xl bg-[#FF6B35] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#FF6B35]/90">
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-[16px] bg-[#111] p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-500">Total Fees Collected</p>
              <p className="mt-1 text-2xl font-bold text-white">${totalFees.toFixed(2)}</p>
            </div>
            <div className="rounded-xl bg-[#06D6A0]/10 p-3">
              <DollarSign className="h-6 w-6 text-[#06D6A0]" />
            </div>
          </div>
        </div>
        <div className="rounded-[16px] bg-[#111] p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-500">Total Payouts</p>
              <p className="mt-1 text-2xl font-bold text-white">${totalPayouts.toFixed(2)}</p>
            </div>
            <div className="rounded-xl bg-[#FF6B35]/10 p-3">
              <CreditCard className="h-6 w-6 text-[#FF6B35]" />
            </div>
          </div>
        </div>
        <div className="rounded-[16px] bg-[#111] p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-500">Platform Balance</p>
              <p className="mt-1 text-2xl font-bold text-white">${balance.toFixed(2)}</p>
            </div>
            <div className="rounded-xl bg-[#FFD23F]/10 p-3">
              <Wallet className="h-6 w-6 text-[#FFD23F]" />
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="rounded-[16px] bg-[#111] p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
            <input
              type="text"
              placeholder="Search by order ID, buyer, or product..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-white/[0.08] bg-[#0a0a0a] py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-600 focus:border-[#FF6B35] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] px-3 py-2.5 text-sm text-white capitalize focus:border-[#FF6B35] focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-[16px] bg-[#111] p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Orders ({filteredOrders.length})</h2>
        {filteredOrders.length === 0 ? (
          <div className="py-12 text-center">
            <Package className="mx-auto h-12 w-12 text-zinc-700 mb-3" />
            <p className="text-sm text-zinc-500">No orders yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-xs uppercase text-zinc-500">
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
                  const sc = statusConfig[o.status] || statusConfig.pending;
                  const StatusIcon = sc.icon;
                  const date = o.created_at ? new Date(o.created_at).toLocaleDateString() : '';
                  return (
                    <tr key={o.id} className="border-b border-white/[0.04] transition-colors hover:bg-white/[0.04]">
                      <td className="py-3 pr-4 font-mono text-sm font-medium text-[#FF6B35]">{o.id.slice(0, 8)}</td>
                      <td className="py-3 pr-4 text-white">{o.customer_name || 'Unknown'}</td>
                      <td className="py-3 pr-4 text-zinc-400">{o.seller_name || o.seller_email}</td>
                      <td className="py-3 pr-4 text-zinc-400 max-w-[200px] truncate">{o.product_title}</td>
                      <td className="py-3 pr-4 text-right font-medium text-white">${parseFloat(o.sale_price || 0).toFixed(2)}</td>
                      <td className="py-3 pr-4">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${sc.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {o.status}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-zinc-400">{date}</td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => setSelectedOrder(o)}
                          className="rounded-lg p-1.5 text-zinc-600 hover:bg-white/[0.06] hover:text-[#FF6B35]"
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
        )}
      </div>

      {/* Disputes Section */}
      {disputes.length > 0 && (
        <div className="rounded-[16px] bg-[#111] p-6">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-[#FF6B35]" />
            <h2 className="text-lg font-semibold text-white">
              Disputes ({disputes.filter((d) => d.status === 'open' || d.status === 'under_review').length})
            </h2>
          </div>
          <div className="space-y-3">
            {disputes.map((d) => (
              <div key={d.id} className="rounded-xl border border-white/[0.06] p-4 transition-colors hover:border-white/[0.08]">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium text-[#FF6B35]">{d.id.slice(0, 8)}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${disputeStatusColors[d.status] || disputeStatusColors.open}`}>
                        {d.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-medium text-white">{d.reason || 'No reason specified'}</p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {d.user_name || d.user_email || 'Unknown'} &middot; ${parseFloat(d.amount || 0).toFixed(2)} &middot; {d.created_at ? new Date(d.created_at).toLocaleDateString() : ''}
                    </p>
                  </div>
                  <div className="ml-4 flex gap-2">
                    <button className="rounded-lg bg-[#06D6A0] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#06D6A0]/90">
                      Refund Buyer
                    </button>
                    <button className="rounded-lg bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-white/[0.1]">
                      Side with Seller
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Order Detail Panel */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setSelectedOrder(null)}>
          <div className="w-full max-w-lg rounded-[16px] bg-[#111] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Order {selectedOrder.id.slice(0, 8)}</h2>
              <button onClick={() => setSelectedOrder(null)} className="rounded-lg p-1 hover:bg-white/[0.06]">
                <X className="h-5 w-5 text-zinc-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="rounded-xl bg-[#0a0a0a] p-4">
                <h3 className="text-sm font-semibold text-zinc-300">Product</h3>
                <p className="text-base font-medium text-white">{selectedOrder.product_title}</p>
                <p className="mt-1 text-2xl font-bold text-[#FF6B35]">${parseFloat(selectedOrder.sale_price || 0).toFixed(2)}</p>
                <p className="text-xs text-zinc-500">
                  Commission: ${parseFloat(selectedOrder.commission || 0).toFixed(2)} &middot;
                  Seller profit: ${parseFloat(selectedOrder.profit || 0).toFixed(2)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/[0.06] p-3">
                  <p className="text-xs text-zinc-500">Buyer</p>
                  <p className="text-sm font-medium text-white">{selectedOrder.customer_name || 'Unknown'}</p>
                  <p className="text-xs text-zinc-500">{selectedOrder.customer_email || ''}</p>
                </div>
                <div className="rounded-xl border border-white/[0.06] p-3">
                  <p className="text-xs text-zinc-500">Seller</p>
                  <p className="text-sm font-medium text-white">{selectedOrder.seller_name || ''}</p>
                  <p className="text-xs text-zinc-500">{selectedOrder.seller_email || ''}</p>
                </div>
              </div>
              {selectedOrder.shipping_address && Object.keys(selectedOrder.shipping_address).length > 0 && (
                <div className="rounded-xl border border-white/[0.06] p-3">
                  <p className="text-xs text-zinc-500">Shipping Address</p>
                  <p className="text-sm text-white">
                    {[selectedOrder.shipping_address.line1, selectedOrder.shipping_address.city, selectedOrder.shipping_address.state, selectedOrder.shipping_address.zip].filter(Boolean).join(', ')}
                  </p>
                </div>
              )}
              {selectedOrder.tracking_number && (
                <div className="rounded-xl border border-white/[0.06] p-3">
                  <p className="text-xs text-zinc-500">Tracking Number</p>
                  <p className="font-mono text-sm font-medium text-[#FF6B35]">{selectedOrder.tracking_number}</p>
                </div>
              )}
              <div className="rounded-xl border border-white/[0.06] p-3">
                <p className="text-xs text-zinc-500">Status</p>
                <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${(statusConfig[selectedOrder.status] || statusConfig.pending).color}`}>
                  {selectedOrder.status}
                </span>
              </div>
              {selectedOrder.notes && (
                <div className="rounded-xl border border-white/[0.06] p-3">
                  <p className="text-xs text-zinc-500">Notes</p>
                  <p className="text-sm text-white">{selectedOrder.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
