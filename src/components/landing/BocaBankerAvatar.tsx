interface AvatarProps {
  className?: string
  size?: number
}

export default function BocaBankerAvatar({ className, size = 200 }: AvatarProps) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      className={className}
    >
      {/* Sky-to-ocean background */}
      <circle cx="100" cy="100" r="100" fill="url(#avatarBg)" />

      {/* Body / Shoulders */}
      <path
        d="M30 200 C30 162 58 145 100 145 C142 145 170 162 170 200Z"
        fill="#12243B"
      />

      {/* Tropical shirt collar */}
      <path d="M78 145 L100 170 L122 145" fill="#0EA5E9" />
      <path d="M82 148 L100 167 L118 148" fill="#38BDF8" />
      {/* Shirt pattern dots */}
      <circle cx="90" cy="155" r="1.5" fill="#7DD3FC" opacity="0.6" />
      <circle cx="110" cy="155" r="1.5" fill="#7DD3FC" opacity="0.6" />
      <circle cx="100" cy="160" r="1.5" fill="#7DD3FC" opacity="0.6" />

      {/* Neck */}
      <path d="M86 122 L86 147 Q100 154 114 147 L114 122Z" fill="#D4A574" />

      {/* Head */}
      <ellipse cx="100" cy="85" rx="42" ry="46" fill="#DEAC7B" />

      {/* Ears */}
      <ellipse cx="58" cy="88" rx="6" ry="10" fill="#D4A574" />
      <path d="M56 85 Q58 88 56 91" stroke="#C89B68" strokeWidth="1" fill="none" />
      <ellipse cx="142" cy="88" rx="6" ry="10" fill="#D4A574" />
      <path d="M144 85 Q142 88 144 91" stroke="#C89B68" strokeWidth="1" fill="none" />

      {/* Hair */}
      <path
        d="M58 78 C56 50 72 34 100 34 C128 34 144 50 142 78
           C142 65 130 44 100 44 C70 44 58 65 58 78Z"
        fill="#1A0E06"
      />
      {/* Hair volume/side */}
      <path d="M56 80 C54 68 58 56 66 50 C60 62 59 74 62 84Z" fill="#1A0E06" />
      <path d="M144 80 C146 68 142 56 134 50 C140 62 141 74 138 84Z" fill="#1A0E06" />
      {/* Hair highlight */}
      <path d="M80 40 Q90 36 100 38" stroke="#2A1A0E" strokeWidth="2" fill="none" opacity="0.4" />

      {/* Eyebrows */}
      <path
        d="M70 66 Q80 59 92 66"
        stroke="#1A0E06"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M108 66 Q120 59 130 66"
        stroke="#1A0E06"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />

      {/* Sunglasses - Left lens */}
      <path
        d="M66 78 Q66 70 76 70 L90 70 Q98 70 98 78 Q98 92 82 94 Q66 94 66 78Z"
        fill="url(#lensGradient)"
      />
      {/* Right lens */}
      <path
        d="M102 78 Q102 70 112 70 L126 70 Q134 70 134 78 Q134 92 118 94 Q102 94 102 78Z"
        fill="url(#lensGradient)"
      />
      {/* Frame bridge */}
      <path d="M98 76 L102 76" stroke="#C9A84C" strokeWidth="3" strokeLinecap="round" />
      {/* Frame arms */}
      <path d="M66 76 L56 72" stroke="#C9A84C" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M134 76 L144 72" stroke="#C9A84C" strokeWidth="2.5" strokeLinecap="round" />
      {/* Frame top edge */}
      <path d="M66 72 Q82 68 98 72" stroke="#C9A84C" strokeWidth="1.5" fill="none" opacity="0.6" />
      <path d="M102 72 Q118 68 134 72" stroke="#C9A84C" strokeWidth="1.5" fill="none" opacity="0.6" />
      {/* Lens shine */}
      <path d="M72 74 L80 74" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.35" />
      <path d="M108 74 L116 74" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.35" />

      {/* Nose */}
      <path d="M100 86 L96 99 Q100 102 104 99Z" fill="#C89B68" />

      {/* Smile */}
      <path
        d="M83 108 Q90 118 100 118 Q110 118 117 108"
        stroke="#A07850"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Teeth */}
      <path d="M88 110 Q100 120 112 110" fill="white" fillOpacity="0.85" />
      {/* Lip highlight */}
      <path d="M90 110 Q100 106 110 110" stroke="#C89B68" strokeWidth="0.8" fill="none" opacity="0.3" />

      {/* Chin shadow */}
      <path d="M82 125 Q100 130 118 125" stroke="#C89B68" strokeWidth="1" opacity="0.3" fill="none" />

      {/* Stubble hints */}
      <circle cx="88" cy="114" r="0.5" fill="#1A0E06" opacity="0.08" />
      <circle cx="92" cy="116" r="0.5" fill="#1A0E06" opacity="0.08" />
      <circle cx="108" cy="116" r="0.5" fill="#1A0E06" opacity="0.08" />
      <circle cx="112" cy="114" r="0.5" fill="#1A0E06" opacity="0.08" />

      {/* Gradients */}
      <defs>
        <linearGradient id="avatarBg" x1="20" y1="0" x2="180" y2="200">
          <stop offset="0%" stopColor="#7DD3FC" />
          <stop offset="40%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#0EA5E9" />
        </linearGradient>
        <linearGradient id="lensGradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0369A1" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#0284C7" stopOpacity="0.8" />
        </linearGradient>
      </defs>
    </svg>
  )
}
