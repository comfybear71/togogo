import { forwardRef } from 'react'

const Input = forwardRef(function Input(
  { label, error, className = '', ...rest },
  ref
) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-semibold text-gray-700">
          {label}
        </label>
      )}
      <input
        ref={ref}
        className={`w-full rounded-[8px] border border-gray-300 px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand disabled:bg-gray-100 disabled:cursor-not-allowed ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''} ${className}`}
        {...rest}
      />
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  )
})

export default Input
