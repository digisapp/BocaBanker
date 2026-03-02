import Image from 'next/image'

interface AvatarProps {
  className?: string
  size?: number
}

export default function BocaBankerAvatar({ className, size = 200 }: AvatarProps) {
  return (
    <Image
      src="/carmen-profile.png"
      alt="Charles Carmen Mayell - Boca Banker"
      width={size}
      height={size}
      className={`rounded-full object-cover ${className ?? ''}`}
      style={{ width: size, height: size }}
      priority
    />
  )
}
