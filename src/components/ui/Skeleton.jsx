export default function Skeleton({ className = '', count = 1 }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className={`animate-shimmer rounded-[8px] bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] ${className}`}
        />
      ))}
    </>
  )
}
