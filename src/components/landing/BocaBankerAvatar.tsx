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
      <path d="M86 122 L86 147 Q100 154 114 147 L114 122Z" fill="#C8956A" />

      {/* Head */}
      <ellipse cx="100" cy="85" rx="42" ry="46" fill="#D4A070" />

      {/* Ears */}
      <ellipse cx="58" cy="88" rx="6" ry="10" fill="#C8956A" />
      <path d="M56 85 Q58 88 56 91" stroke="#B8845A" strokeWidth="1" fill="none" />
      <ellipse cx="142" cy="88" rx="6" ry="10" fill="#C8956A" />
      <path d="M144 85 Q142 88 144 91" stroke="#B8845A" strokeWidth="1" fill="none" />

      {/* Hair — full volume swept back */}
      {/* Main hair mass */}
      <path
        d="M54 82 C50 52 66 26 100 26 C134 26 150 52 146 82
           C146 68 134 38 100 38 C66 38 54 68 54 82Z"
        fill="#8B7355"
      />
      {/* Top volume — swept-back wave crest */}
      <path
        d="M60 62 C58 38 76 22 100 20 C124 22 142 38 140 62
           C138 46 126 30 100 28 C74 30 62 46 60 62Z"
        fill="#7A6548"
      />
      {/* Peak wave on top */}
      <path
        d="M72 42 C78 24 92 18 104 18 C116 20 126 28 128 42
           C124 32 114 24 102 24 C88 24 78 32 72 42Z"
        fill="#6E5A40"
      />
      {/* Left side volume — flows down past ear */}
      <path d="M52 84 C48 66 52 48 62 40 C56 54 54 70 56 88Z" fill="#7A6548" />
      <path d="M54 86 C52 74 54 60 60 52 C56 62 55 76 57 88Z" fill="#6E5A40" opacity="0.5" />
      {/* Right side volume — flows down past ear */}
      <path d="M148 84 C152 66 148 48 138 40 C144 54 146 70 144 88Z" fill="#7A6548" />
      <path d="M146 86 C148 74 146 60 140 52 C144 62 145 76 143 88Z" fill="#6E5A40" opacity="0.5" />
      {/* Flow highlight — swept wave shine */}
      <path d="M76 30 Q88 22 104 24" stroke="#A08A68" strokeWidth="2.5" fill="none" opacity="0.5" />
      <path d="M80 36 Q92 28 108 30" stroke="#A08A68" strokeWidth="1.5" fill="none" opacity="0.35" />
      {/* Silver streaks at temples */}
      <path d="M66 50 Q74 40 84 44" stroke="#C0B8A8" strokeWidth="1.5" fill="none" opacity="0.45" />
      <path d="M134 50 Q126 40 116 44" stroke="#C0B8A8" strokeWidth="1.5" fill="none" opacity="0.45" />
      {/* Subtle part line */}
      <path d="M94 22 Q98 38 96 50" stroke="#5E4E38" strokeWidth="0.8" fill="none" opacity="0.3" />

      {/* Eyebrows */}
      <path
        d="M70 66 Q80 59 92 66"
        stroke="#6E5A40"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M108 66 Q120 59 130 66"
        stroke="#6E5A40"
        strokeWidth="2.5"
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
      <path d="M100 86 L96 99 Q100 102 104 99Z" fill="#B8845A" />

      {/* Smile */}
      <path
        d="M83 108 Q90 118 100 118 Q110 118 117 108"
        stroke="#A07058"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Teeth */}
      <path d="M88 110 Q100 120 112 110" fill="white" fillOpacity="0.85" />
      {/* Lip highlight */}
      <path d="M90 110 Q100 106 110 110" stroke="#B8845A" strokeWidth="0.8" fill="none" opacity="0.3" />

      {/* Chin shadow */}
      <path d="M82 125 Q100 130 118 125" stroke="#B8845A" strokeWidth="1" opacity="0.3" fill="none" />

      {/* Stubble hints */}
      <circle cx="88" cy="114" r="0.5" fill="#A09080" opacity="0.08" />
      <circle cx="92" cy="116" r="0.5" fill="#A09080" opacity="0.08" />
      <circle cx="108" cy="116" r="0.5" fill="#A09080" opacity="0.08" />
      <circle cx="112" cy="114" r="0.5" fill="#A09080" opacity="0.08" />

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
