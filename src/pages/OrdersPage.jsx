import { useState } from 'react'
import { useMyOrders, useUpdateOrder } from '../hooks/useOrders'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import EmptyState from '../components/ui/EmptyState'
import Modal from '../components/ui/Modal'
import { Package, Truck, CheckCircle, AlertTriangle, Clock, ChevronDown, ChevronUp } from 'lucide-react'
import { format } from 'date-fns'

const statusConfig = {
  pending: { color: 'neutral', icon: Clock, label: 'Pending' },
  paid: { color: 'teal', icon: CheckCircle, label: 'Paid' },
  shipped: { color: 'brand', icon: Truck, label: 'Shipped' },
  delivered: { color: 'teal', icon: Package, label: 'Delivered' },
  disputed: { color: 'danger', icon: AlertTriangle, label: 'Disputed' },
  refunded: { color: 'neutral', icon: Clock, label: 'Refunded' },
}

export default function OrdersPage() {
  const [tab, setTab] = useState('bought')
  const [expandedId, setExpandedId] = useState(null)
  const [trackingModal, setTrackingModal] = useState(null)
  const [trackingNumber, setTrackingNumber] = useState('')
  const { data: orders = [], isLoading } = useMyOrders(tab)
  const updateOrder = useUpdateOrder()

  const handleMarkShipped = async () => {
    if (!trackingModal || !trackingNumber) return
    await updateOrder.mutateAsync({ id: trackingModal, status: 'shipped', tracking_number: trackingNumber })
    setTrackingModal(null)
    setTrackingNumber('')
  }

  const handleConfirmDelivery = async (orderId) => {
    await updateOrder.mutateAsync({ id: orderId, status: 'delivered' })
  }

  return (
    <div className="max-w-3xl mx-auto p-4 py-6">
      <h1 className="font-heading text-2xl font-bold mb-6">My Orders</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {['bought', 'sold'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2.5 rounded-full text-sm font-semibold transition min-h-[44px] ${
              tab === t ? 'bg-[#FF6B35] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t === 'bought' ? 'Purchases' : 'Sales'}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-24 rounded-[16px]" />
          ))}
        </div>
      )}

      {!isLoading && orders.length === 0 && (
        <EmptyState
          icon={Package}
          title={tab === 'bought' ? 'No purchases yet' : 'No sales yet'}
          description={tab === 'bought' ? 'Items you buy will appear here' : 'Orders from your buyers will appear here'}
        />
      )}

      <div className="space-y-4">
        {orders.map((order) => {
          const config = statusConfig[order.status] || statusConfig.pending
          const isExpanded = expandedId === order.id
          return (
            <div key={order.id} className="bg-white rounded-[16px] overflow-hidden" style={{ boxShadow: '0 4px 20px rgba(255,107,53,0.1)' }}>
              <button
                onClick={() => setExpandedId(isExpanded ? null : order.id)}
                className="w-full flex items-center gap-4 p-4 text-left min-h-[44px]"
              >
                <div className="w-14 h-14 bg-gray-100 rounded-[8px] flex-shrink-0 flex items-center justify-center">
                  {order.product?.images?.[0]
                    ? <img src={order.product.images[0]} alt="" className="w-full h-full object-cover rounded-[8px]" />
                    : <Package className="w-6 h-6 text-gray-300" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{order.product?.title || 'Product'}</p>
                  <p className="text-gray-500 text-xs">
                    {tab === 'bought' ? `Seller: ${order.seller?.name || 'Unknown'}` : `Buyer: ${order.buyer?.name || 'Unknown'}`}
                    {' · '}{order.created_at ? format(new Date(order.created_at), 'dd MMM yyyy') : ''}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold">${order.total_price?.toFixed(2)}</p>
                  <Badge variant={config.color}>{config.label}</Badge>
                </div>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>

              {isExpanded && (
                <div className="border-t px-4 pb-4 pt-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-gray-500">Order ID:</span> <span className="font-mono text-xs">{order.id?.slice(0, 8)}</span></div>
                    <div><span className="text-gray-500">Qty:</span> {order.quantity}</div>
                    <div><span className="text-gray-500">Unit Price:</span> ${order.unit_price?.toFixed(2)}</div>
                    {order.tracking_number && <div><span className="text-gray-500">Tracking:</span> {order.tracking_number}</div>}
                  </div>

                  {tab === 'sold' && order.status === 'paid' && (
                    <Button variant="primary" size="sm" onClick={() => setTrackingModal(order.id)}>
                      <Truck className="w-4 h-4 mr-1" /> Mark as Shipped
                    </Button>
                  )}
                  {tab === 'bought' && order.status === 'shipped' && (
                    <Button variant="secondary" size="sm" onClick={() => handleConfirmDelivery(order.id)}>
                      <CheckCircle className="w-4 h-4 mr-1" /> Confirm Delivery
                    </Button>
                  )}
                  {tab === 'bought' && ['paid', 'shipped'].includes(order.status) && (
                    <Button variant="ghost" size="sm" className="text-red-500">
                      <AlertTriangle className="w-4 h-4 mr-1" /> Open Dispute
                    </Button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Tracking Modal */}
      <Modal isOpen={!!trackingModal} onClose={() => setTrackingModal(null)} title="Enter Tracking Number">
        <div className="space-y-4">
          <Input label="Tracking Number" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="e.g. AP123456789AU" />
          <Button variant="primary" className="w-full" onClick={handleMarkShipped} loading={updateOrder.isPending}>Confirm Shipment</Button>
        </div>
      </Modal>
    </div>
  )
}
