import { useState, useMemo } from 'react'
import { PLATFORM_FEE_PERCENT, SHIPPING_TYPES } from '../../lib/constants'

export default function ProfitCalculator() {
  const [supplierCost, setSupplierCost] = useState('')
  const [shippingType, setShippingType] = useState('free')
  const [yourPrice, setYourPrice] = useState('')

  const shippingCost = useMemo(
    () => SHIPPING_TYPES.find((s) => s.id === shippingType)?.cost ?? 0,
    [shippingType]
  )

  const calculations = useMemo(() => {
    const cost = parseFloat(supplierCost) || 0
    const price = parseFloat(yourPrice) || 0
    const platformFee = +(price * (PLATFORM_FEE_PERCENT / 100)).toFixed(2)
    const totalCost = +(cost + shippingCost + platformFee).toFixed(2)
    const profit = +(price - totalCost).toFixed(2)
    const margin = price > 0 ? +((profit / price) * 100).toFixed(1) : 0

    return { platformFee, totalCost, profit, margin }
  }, [supplierCost, shippingCost, yourPrice])

  return (
    <div className="rounded-[16px] bg-white shadow-card p-5 space-y-4">
      <h3 className="font-heading font-bold text-gray-900 text-lg">
        Profit Calculator
      </h3>

      {/* Supplier Cost */}
      <label className="block">
        <span className="text-sm font-medium text-gray-700">
          Supplier Cost ($)
        </span>
        <input
          type="number"
          min="0"
          step="0.01"
          value={supplierCost}
          onChange={(e) => setSupplierCost(e.target.value)}
          placeholder="0.00"
          className="mt-1 block w-full rounded-[8px] border border-gray-300 px-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand outline-none"
        />
      </label>

      {/* Shipping Type */}
      <label className="block">
        <span className="text-sm font-medium text-gray-700">Shipping</span>
        <select
          value={shippingType}
          onChange={(e) => setShippingType(e.target.value)}
          className="mt-1 block w-full rounded-[8px] border border-gray-300 px-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand outline-none bg-white"
        >
          {SHIPPING_TYPES.map((type) => (
            <option key={type.id} value={type.id}>
              {type.label}
            </option>
          ))}
        </select>
      </label>

      {/* Shipping Cost (auto) */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500">Shipping Cost</span>
        <span className="font-medium text-gray-900">
          ${shippingCost.toFixed(2)}
        </span>
      </div>

      {/* Platform Fee */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500">
          Platform Fee ({PLATFORM_FEE_PERCENT}%)
        </span>
        <span className="font-medium text-gray-900">
          ${calculations.platformFee.toFixed(2)}
        </span>
      </div>

      {/* Total Cost */}
      <div className="flex items-center justify-between text-sm border-t border-gray-200 pt-3">
        <span className="font-medium text-gray-700">Total Cost</span>
        <span className="font-bold text-gray-900">
          ${calculations.totalCost.toFixed(2)}
        </span>
      </div>

      {/* Your Price */}
      <label className="block">
        <span className="text-sm font-medium text-gray-700">
          Your Price ($)
        </span>
        <input
          type="number"
          min="0"
          step="0.01"
          value={yourPrice}
          onChange={(e) => setYourPrice(e.target.value)}
          placeholder="0.00"
          className="mt-1 block w-full rounded-[8px] border border-gray-300 px-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand outline-none"
        />
      </label>

      {/* Profit */}
      <div className="flex items-center justify-between text-sm border-t border-gray-200 pt-3">
        <span className="font-medium text-gray-700">Your Profit</span>
        <span
          className={`font-bold ${calculations.profit >= 0 ? 'text-green-600' : 'text-red-500'}`}
        >
          ${calculations.profit.toFixed(2)}
        </span>
      </div>

      {/* Profit Margin */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500">Profit Margin</span>
        <span
          className={`font-bold ${calculations.margin >= 0 ? 'text-green-600' : 'text-red-500'}`}
        >
          {calculations.margin}%
        </span>
      </div>
    </div>
  )
}
