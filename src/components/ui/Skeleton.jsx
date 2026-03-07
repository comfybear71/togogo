export default function Skeleton({ className = '', count = 1 }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className={`animate-shimmer rounded-xl bg-gradient-to-r from-[#111] via-[#1a1a1a] to-[#111] bg-[length:200%_100%] ${className}`}
        />
      ))}
    </>
  )
}
