import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Truck,
  Check,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Copy,
  X,
} from 'lucide-react';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Avatar from '../components/ui/Avatar';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import { useMyOrders, useUpdateOrder } from '../hooks/useOrders';
import { useAuthStore } from '../stores/authStore';

const STATUS_CONFIG = {
  pending: { color: 'bg-[#FFD23F]/10 text-[#FFD23F]', icon: Clock, label: 'Pending' },
  paid: { color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20', icon: Check, label: 'Paid' },
  confirmed: { color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20', icon: Check, label: 'Confirmed' },
  shipped: { color: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20', icon: Truck, label: 'Shipped' },
  delivered: { color: 'bg-[#06D6A0]/10 text-[#06D6A0]', icon: Package, label: 'Delivered' },
  cancelled: { color: 'bg-red-50 text-red-600 dark:bg-red-900/20', icon: X, label: 'Cancelled' },
  disputed: { color: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20', icon: AlertTriangle, label: 'Disputed' },
  refunded: { color: 'bg-gray-100 text-gray-500 dark:bg-gray-800', icon: Clock, label: 'Refunded' },
};

export default function OrdersPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('purchases');
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [trackingModal, setTrackingModal] = useState(null);
  const [trackingNumber, setTrackingNumber] = useState('');

  const { data: orders = [], isLoading } = useMyOrders(
    activeTab === 'purchases' ? 'bought' : 'sold'
  );
  const updateOrder = useUpdateOrder();

  if (!user) {
    navigate('/auth');
    return null;
  }

  const handleMarkShipped = async () => {
    if (!trackingModal || !trackingNumber) return;
    try {
      await updateOrder.mutateAsync({
        id: trackingModal,
        status: 'shipped',
        tracking_number: trackingNumber,
      });
      setTrackingModal(null);
      setTrackingNumber('');
    } catch (err) {
      console.error('Failed to update order:', err);
    }
  };

  const handleConfirmDelivery = async (orderId) => {
    try {
      await updateOrder.mutateAsync({ id: orderId, status: 'delivered' });
    } catch (err) {
      console.error('Failed to update order:', err);
    }
  };

  const handleOpenDispute = async (orderId) => {
    try {
      await updateOrder.mutateAsync({ id: orderId, status: 'disputed' });
    } catch (err) {
      console.error('Failed to update order:', err);
    }
  };

  const toggleExpand = (orderId) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const isBuyerView = activeTab === 'purchases';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="mb-6 font-['Baloo_2'] text-2xl font-bold text-gray-900 dark:text-white md:text-3xl">
          My Orders
        </h1>

        {/* Tabs */}
        <div className="mb-6 flex rounded-xl bg-white p-1 shadow-sm dark:bg-gray-900">
          <button
            onClick={() => setActiveTab('purchases')}
            className={`flex-1 rounded-lg py-2.5 text-sm font-['Nunito'] font-bold transition-all ${
              activeTab === 'purchases'
                ? 'bg-[#FF6B35] text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            Purchases
          </button>
          <button
            onClick={() => setActiveTab('sales')}
            className={`flex-1 rounded-lg py-2.5 text-sm font-['Nunito'] font-bold transition-all ${
              activeTab === 'sales'
                ? 'bg-[#FF6B35] text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            Sales
          </button>
        </div>

        {/* Orders List */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <EmptyState
            icon={Package}
            title={isBuyerView ? 'No purchases yet' : 'No sales yet'}
            description={
              isBuyerView
                ? 'Items you buy will appear here.'
                : 'Orders from your buyers will appear here.'
            }
            action={
              isBuyerView && (
                <Button
                  onClick={() => navigate('/browse')}
                  className="bg-[#FF6B35] px-6 py-2 text-white hover:bg-[#e55a2b]"
                >
                  Start Shopping
                </Button>
              )
            }
          />
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const isExpanded = expandedOrder === order.id;
              const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
              const StatusIcon = statusConfig.icon;

              return (
                <div
                  key={order.id}
                  className="overflow-hidden rounded-xl border border-gray-200 bg-white transition-shadow hover:shadow-sm dark:border-gray-800 dark:bg-gray-900"
                >
                  {/* Order Header */}
                  <button
                    onClick={() => toggleExpand(order.id)}
                    className="flex w-full items-center gap-4 p-4 text-left"
                  >
                    <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                      {order.product?.images?.[0] || order.product?.image ? (
                        <img
                          src={order.product?.images?.[0] || order.product?.image}
                          alt={order.product?.title || 'Product'}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Package className="h-6 w-6 text-gray-300" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-['Nunito'] font-bold text-gray-900 dark:text-white">
                        {order.product?.title || 'Product'}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Avatar
                            src={
                              isBuyerView
                                ? order.seller?.avatar_url
                                : order.buyer?.avatar_url
                            }
                            name={
                              isBuyerView
                                ? order.seller?.name
                                : order.buyer?.name
                            }
                            size="xs"
                          />
                          <span>
                            {isBuyerView
                              ? order.seller?.name || 'Seller'
                              : order.buyer?.name || 'Buyer'}
                          </span>
                        </span>
                        <span>&middot;</span>
                        <span>{formatDate(order.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="font-['Baloo_2'] font-bold text-[#FF6B35]">
                        ${(order.total_price || order.total || order.price || 0).toFixed(2)}
                      </p>
                      <Badge className={`mt-1 flex items-center gap-1 text-xs ${statusConfig.color}`}>
                        <StatusIcon className="h-3 w-3" />
                        {statusConfig.label}
                      </Badge>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 flex-shrink-0 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 flex-shrink-0 text-gray-400" />
                    )}
                  </button>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/50">
                      {/* Timeline */}
                      <div className="mb-4">
                        <h4 className="mb-3 font-['Nunito'] text-sm font-bold text-gray-700 dark:text-gray-300">
                          Order Timeline
                        </h4>
                        <div className="space-y-3">
                          {[
                            { status: 'pending', label: 'Order placed', date: order.created_at },
                            { status: 'paid', label: 'Payment received', date: order.paid_at },
                            { status: 'shipped', label: 'Shipped', date: order.shipped_at },
                            { status: 'delivered', label: 'Delivered', date: order.delivered_at },
                          ].map((step, i) => {
                            const statusOrder = ['pending', 'paid', 'shipped', 'delivered'];
                            const currentIdx = statusOrder.indexOf(order.status);
                            const stepIdx = statusOrder.indexOf(step.status);
                            const isActive = stepIdx <= currentIdx;
                            return (
                              <div key={step.status} className="flex items-center gap-3">
                                <div
                                  className={`flex h-6 w-6 items-center justify-center rounded-full ${
                                    isActive
                                      ? 'bg-[#06D6A0] text-white'
                                      : 'bg-gray-200 dark:bg-gray-700'
                                  }`}
                                >
                                  {isActive ? (
                                    <Check className="h-3 w-3" />
                                  ) : (
                                    <span className="text-[10px] text-gray-400">{i + 1}</span>
                                  )}
                                </div>
                                <div className="flex-1">
                                  <p
                                    className={`text-sm font-medium ${
                                      isActive
                                        ? 'text-gray-900 dark:text-white'
                                        : 'text-gray-400'
                                    }`}
                                  >
                                    {step.label}
                                  </p>
                                </div>
                                {step.date && (
                                  <span className="text-xs text-gray-400">
                                    {formatDate(step.date)}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Tracking Number */}
                      {order.tracking_number && (
                        <div className="mb-4 flex items-center gap-2 rounded-lg bg-blue-50 p-3 dark:bg-blue-900/10">
                          <Truck className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
                            Tracking: {order.tracking_number}
                          </span>
                          <button
                            onClick={() =>
                              navigator.clipboard.writeText(order.tracking_number)
                            }
                            className="ml-auto text-blue-500 hover:text-blue-700"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </div>
                      )}

                      {/* Order details */}
                      <div className="mb-4 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="divide-y divide-gray-100 text-sm dark:divide-gray-800">
                          <div className="flex justify-between px-3 py-2">
                            <span className="text-gray-500">Order #</span>
                            <span className="font-mono text-xs text-gray-900 dark:text-white">
                              {order.order_number || order.id?.slice(0, 8)}
                            </span>
                          </div>
                          {order.quantity && (
                            <div className="flex justify-between px-3 py-2">
                              <span className="text-gray-500">Quantity</span>
                              <span className="text-gray-900 dark:text-white">
                                {order.quantity}
                              </span>
                            </div>
                          )}
                          {order.unit_price && (
                            <div className="flex justify-between px-3 py-2">
                              <span className="text-gray-500">Unit Price</span>
                              <span className="text-gray-900 dark:text-white">
                                ${order.unit_price?.toFixed(2)}
                              </span>
                            </div>
                          )}
                          {order.shipping_cost !== undefined && order.shipping_cost !== null && (
                            <div className="flex justify-between px-3 py-2">
                              <span className="text-gray-500">Shipping</span>
                              <span className="text-gray-900 dark:text-white">
                                ${order.shipping_cost?.toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-2">
                        {/* Seller: Mark as Shipped */}
                        {!isBuyerView &&
                          (order.status === 'pending' || order.status === 'paid' || order.status === 'confirmed') && (
                            <Button
                              onClick={() => setTrackingModal(order.id)}
                              className="flex items-center gap-2 bg-[#FF6B35] px-4 py-2 text-sm font-semibold text-white hover:bg-[#e55a2b]"
                            >
                              <Truck className="h-4 w-4" />
                              Mark as Shipped
                            </Button>
                          )}

                        {/* Buyer: Confirm Delivery */}
                        {isBuyerView && order.status === 'shipped' && (
                          <Button
                            onClick={() => handleConfirmDelivery(order.id)}
                            className="flex items-center gap-2 bg-[#06D6A0] px-4 py-2 text-sm font-semibold text-white hover:bg-[#05c090]"
                          >
                            <Check className="h-4 w-4" />
                            Confirm Delivery
                          </Button>
                        )}

                        {/* Open Dispute */}
                        {isBuyerView &&
                          order.status !== 'delivered' &&
                          order.status !== 'cancelled' &&
                          order.status !== 'disputed' &&
                          order.status !== 'refunded' && (
                            <Button
                              onClick={() => handleOpenDispute(order.id)}
                              className="flex items-center gap-2 border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 dark:border-red-900/30 dark:bg-gray-900"
                            >
                              <AlertTriangle className="h-4 w-4" />
                              Open Dispute
                            </Button>
                          )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Tracking Number Modal */}
      <Modal
        isOpen={!!trackingModal}
        onClose={() => {
          setTrackingModal(null);
          setTrackingNumber('');
        }}
        title="Enter Tracking Number"
      >
        <div className="space-y-4 p-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Tracking Number
            </label>
            <Input
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="e.g. AP123456789AU"
            />
          </div>
          <Button
            onClick={handleMarkShipped}
            disabled={!trackingNumber || updateOrder.isPending}
            className="w-full bg-[#FF6B35] py-3 font-semibold text-white hover:bg-[#e55a2b] disabled:opacity-60"
          >
            {updateOrder.isPending ? 'Updating...' : 'Confirm Shipment'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
