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

      {/* Body / Shoulders — dark sophisticated suit */}
      <path
        d="M30 200 C30 162 58 145 100 145 C142 145 170 162 170 200Z"
        fill="#1C1C1C"
      />
      {/* Suit jacket lapels */}
      <path d="M78 145 L92 168 L100 158 L108 168 L122 145" fill="#2A2A2A" />
      <path d="M80 146 L92 166 L100 157" fill="#252525" />
      <path d="M120 146 L108 166 L100 157" fill="#252525" />
      {/* White dress shirt collar V */}
      <path d="M90 148 L100 162 L110 148" fill="#F5F5F0" />
      <path d="M92 149 L100 160 L108 149" fill="#EEEEE8" />
      {/* Suit pocket square — amber accent */}
      <path d="M124 156 L130 154 L128 162 L122 160Z" fill="#D97706" opacity="0.8" />

      {/* Neck */}
      <path d="M86 122 L86 147 Q100 154 114 147 L114 122Z" fill="#D4A070" />

      {/* Head — slightly tanned/weathered */}
      <ellipse cx="100" cy="85" rx="42" ry="46" fill="#DEB887" />
      {/* Subtle weathered skin tone */}
      <ellipse cx="100" cy="85" rx="40" ry="44" fill="#E0BB8A" />

      {/* Ears */}
      <ellipse cx="58" cy="88" rx="6" ry="10" fill="#D4A070" />
      <path d="M56 85 Q58 88 56 91" stroke="#C0905E" strokeWidth="1" fill="none" />
      <ellipse cx="142" cy="88" rx="6" ry="10" fill="#D4A070" />
      <path d="M144 85 Q142 88 144 91" stroke="#C0905E" strokeWidth="1" fill="none" />

      {/* Hair — distinguished silver, swept back, full but refined */}
      {/* Main hair mass */}
      <path
        d="M54 82 C50 52 66 24 100 22 C134 24 150 52 146 82
           C146 66 134 36 100 34 C66 36 54 66 54 82Z"
        fill="#8C8C8C"
      />
      {/* Top volume — swept back elegantly */}
      <path
        d="M58 62 C56 36 74 18 100 16 C126 18 144 36 142 62
           C140 42 126 26 100 24 C74 26 60 42 58 62Z"
        fill="#9E9E9E"
      />
      {/* Peak wave — controlled but full */}
      <path
        d="M66 44 C70 22 86 14 100 14 C114 14 130 22 134 44
           C128 28 116 20 100 20 C84 20 72 28 66 44Z"
        fill="#AEAEAE"
      />
      {/* Elegant top crest */}
      <path
        d="M72 34 C78 18 90 12 102 12 C114 14 124 20 128 34
           C122 22 114 16 102 16 C90 16 78 22 72 34Z"
        fill="#B8B8B8"
      />
      {/* Left side — neat, covers ear tops */}
      <path d="M52 84 C48 66 52 46 62 36 C56 50 54 68 56 86Z" fill="#9E9E9E" />
      <path d="M54 82 C52 72 54 56 60 46 C56 58 55 72 57 84Z" fill="#AEAEAE" opacity="0.5" />
      {/* Right side — neat, covers ear tops */}
      <path d="M148 84 C152 66 148 46 138 36 C144 50 146 68 144 86Z" fill="#9E9E9E" />
      <path d="M146 82 C148 72 146 56 140 46 C144 58 145 72 143 84Z" fill="#AEAEAE" opacity="0.5" />
      {/* Salt-and-pepper dark streaks at temples */}
      <path d="M56 70 Q60 56 66 46" stroke="#5A5A5A" strokeWidth="2" fill="none" opacity="0.4" />
      <path d="M58 76 Q62 62 68 52" stroke="#6A6A6A" strokeWidth="1.5" fill="none" opacity="0.3" />
      <path d="M144 70 Q140 56 134 46" stroke="#5A5A5A" strokeWidth="2" fill="none" opacity="0.4" />
      <path d="M142 76 Q138 62 132 52" stroke="#6A6A6A" strokeWidth="1.5" fill="none" opacity="0.3" />
      {/* Silver highlights on top */}
      <path d="M78 24 Q90 16 106 18" stroke="#D0D0D0" strokeWidth="2.5" fill="none" opacity="0.6" />
      <path d="M82 30 Q94 22 110 24" stroke="#C4C4C4" strokeWidth="1.5" fill="none" opacity="0.45" />
      <path d="M88 20 Q98 16 108 18" stroke="#E0E0E0" strokeWidth="1.5" fill="none" opacity="0.35" />
      {/* Subtle part suggestion */}
      <path d="M94 18 Q98 32 96 44" stroke="#808080" strokeWidth="0.8" fill="none" opacity="0.2" />

      {/* Eyebrows — dark, strong, expressive */}
      <path
        d="M70 66 Q80 57 92 64"
        stroke="#4A4A4A"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M71 67 Q80 60 90 66"
        stroke="#5A5A5A"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.4"
      />
      <path
        d="M108 64 Q120 57 130 66"
        stroke="#4A4A4A"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M110 66 Q120 60 129 66"
        stroke="#5A5A5A"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.4"
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

      {/* Nose — strong, defined */}
      <path d="M100 86 L96 99 Q100 102 104 99Z" fill="#C0905E" />
      {/* Nose bridge highlight */}
      <path d="M100 86 L99 94" stroke="#E8C8A0" strokeWidth="1" fill="none" opacity="0.3" />

      {/* Confident knowing smile */}
      <path
        d="M83 108 Q90 116 100 116 Q110 116 117 108"
        stroke="#A07050"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Teeth hint */}
      <path d="M88 109 Q100 117 112 109" fill="white" fillOpacity="0.8" />
      {/* Lip highlight */}
      <path d="M90 109 Q100 105 110 109" stroke="#C0905E" strokeWidth="0.8" fill="none" opacity="0.3" />

      {/* ===== THE BEARD — full, iconic, silver/salt-and-pepper ===== */}
      {/* Outer beard shape — full coverage jaw to chin, wide and distinguished */}
      <path
        d="M62 98 C58 108 56 118 60 128 C64 136 76 144 100 146
           C124 144 136 136 140 128 C144 118 142 108 138 98"
        fill="#8C8C8C"
        opacity="0.7"
      />
      {/* Mid beard layer */}
      <path
        d="M66 100 C62 110 60 120 64 130 C68 138 80 144 100 145
           C120 144 132 138 136 130 C140 120 138 110 134 100"
        fill="#9E9E9E"
        opacity="0.6"
      />
      {/* Inner beard — lighter silver */}
      <path
        d="M70 104 C66 112 66 122 70 130 C76 138 88 142 100 143
           C112 142 124 138 130 130 C134 122 134 112 130 104"
        fill="#AEAEAE"
        opacity="0.5"
      />
      {/* Chin beard — thick rounded bottom */}
      <path
        d="M80 134 Q90 148 100 150 Q110 148 120 134"
        fill="#9E9E9E"
        opacity="0.6"
      />
      <path
        d="M84 136 Q92 148 100 149 Q108 148 116 136"
        fill="#AEAEAE"
        opacity="0.5"
      />
      {/* Mustache — full, distinguished */}
      <path
        d="M80 100 Q84 96 100 96 Q116 96 120 100 Q116 106 100 107 Q84 106 80 100Z"
        fill="#787878"
        opacity="0.75"
      />
      {/* Mustache highlight */}
      <path
        d="M84 100 Q90 97 100 97 Q110 97 116 100"
        stroke="#9E9E9E"
        strokeWidth="1"
        fill="none"
        opacity="0.4"
      />
      {/* Beard texture — vertical strokes for that full beard look */}
      <path d="M76 110 L74 124" stroke="#787878" strokeWidth="1" fill="none" opacity="0.25" />
      <path d="M82 108 L80 126" stroke="#808080" strokeWidth="1" fill="none" opacity="0.2" />
      <path d="M88 108 L86 130" stroke="#787878" strokeWidth="1" fill="none" opacity="0.25" />
      <path d="M94 108 L92 136" stroke="#808080" strokeWidth="1" fill="none" opacity="0.2" />
      <path d="M100 108 L100 140" stroke="#787878" strokeWidth="1" fill="none" opacity="0.2" />
      <path d="M106 108 L108 136" stroke="#808080" strokeWidth="1" fill="none" opacity="0.2" />
      <path d="M112 108 L114 130" stroke="#787878" strokeWidth="1" fill="none" opacity="0.25" />
      <path d="M118 108 L120 126" stroke="#808080" strokeWidth="1" fill="none" opacity="0.2" />
      <path d="M124 110 L126 124" stroke="#787878" strokeWidth="1" fill="none" opacity="0.25" />
      {/* Beard wave texture — horizontal */}
      <path d="M72 116 Q86 120 100 119 Q114 120 128 116" stroke="#808080" strokeWidth="0.8" fill="none" opacity="0.2" />
      <path d="M76 124 Q88 128 100 127 Q112 128 124 124" stroke="#9E9E9E" strokeWidth="0.7" fill="none" opacity="0.2" />
      <path d="M82 132 Q92 136 100 136 Q108 136 118 132" stroke="#808080" strokeWidth="0.7" fill="none" opacity="0.2" />
      {/* Dark depth at jaw edges */}
      <path d="M64 104 Q62 114 64 124" stroke="#5A5A5A" strokeWidth="2" fill="none" opacity="0.2" />
      <path d="M136 104 Q138 114 136 124" stroke="#5A5A5A" strokeWidth="2" fill="none" opacity="0.2" />
      {/* Silver-white beard highlights */}
      <path d="M90 112 L88 128" stroke="#C8C8C8" strokeWidth="1" fill="none" opacity="0.25" />
      <path d="M100 112 L100 134" stroke="#C8C8C8" strokeWidth="1" fill="none" opacity="0.2" />
      <path d="M110 112 L112 128" stroke="#C8C8C8" strokeWidth="1" fill="none" opacity="0.25" />

      {/* Cheek lines / laugh lines — the distinguished look */}
      <path d="M68 96 Q72 102 74 108" stroke="#C0905E" strokeWidth="1" fill="none" opacity="0.25" />
      <path d="M132 96 Q128 102 126 108" stroke="#C0905E" strokeWidth="1" fill="none" opacity="0.25" />

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
