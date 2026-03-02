import Image from 'next/image'

interface AvatarProps {
  className?: string
  size?: number
}

export default function BocaBankerAvatar({ className, size = 200 }: AvatarProps) {
  const ring = Math.max(2, Math.round(size * 0.04))

  return (
    <div
      className={`relative rounded-full shrink-0 ${className ?? ''}`}
      style={{ width: size, height: size }}
    >
      {/* Outer glow */}
      <div
        className="absolute inset-0 rounded-full blur-[3px] opacity-60"
        style={{
          background: 'linear-gradient(135deg, #f59e0b, #fbbf24, #f59e0b, #d97706)',
        }}
      />
      {/* Gold ring */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 25%, #fcd34d 50%, #d97706 75%, #fbbf24 100%)',
          padding: ring,
        }}
      >
        <Image
          src="/carmen-profile.png"
          alt="Charles Carmen Mayell - Boca Banker"
          width={size}
          height={size}
          className="rounded-full object-cover w-full h-full"
          priority
        />
      </div>
    </div>
  )
}
