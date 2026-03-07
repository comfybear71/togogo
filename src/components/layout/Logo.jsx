import React from 'react'

const sizeClasses = {
  sm: 'text-xl',
  md: 'text-3xl',
  lg: 'text-5xl',
}

const taglineSizes = {
  sm: 'text-[10px]',
  md: 'text-xs',
  lg: 'text-sm',
}

export default function Logo({ size = 'md' }) {
  return (
    <div className="flex flex-col items-center">
      <span className={`${sizeClasses[size]} font-heading font-bold leading-tight`}>
        <span style={{ color: '#FF6B35' }}>To</span>
        <span style={{ color: '#FFD23F' }}>Go</span>
        <span style={{ color: '#06D6A0' }}>Go</span>
      </span>
      <span className={`${taglineSizes[size]} text-gray-400 tracking-wide`}>
        Trade &middot; Swap &middot; Connect &middot; Share
      </span>
    </div>
  )
}
