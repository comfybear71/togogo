const sizeClasses = {
  sm: 'text-xl',
  md: 'text-3xl',
  lg: 'text-5xl',
  xl: 'text-7xl',
}

const taglineSizes = {
  sm: 'text-[10px]',
  md: 'text-xs',
  lg: 'text-sm',
  xl: 'text-base',
}

export default function Logo({ size = 'md', showTagline = true }) {
  return (
    <div className="flex flex-col items-center">
      <span className={`${sizeClasses[size]} font-heading font-bold leading-tight tracking-tight`}>
        <span style={{ color: '#FF6B35' }}>To</span>
        <span style={{ color: '#FFD23F' }}>Go</span>
        <span style={{ color: '#06D6A0' }}>Go</span>
      </span>
      {showTagline && (
        <span className={`${taglineSizes[size]} text-zinc-500 tracking-widest uppercase mt-1`}>
          Trade &middot; Swap &middot; Connect &middot; Share
        </span>
      )}
    </div>
  )
}
