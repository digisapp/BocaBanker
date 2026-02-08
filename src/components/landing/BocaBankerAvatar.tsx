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
      {/* Sunset background */}
      <circle cx="100" cy="100" r="100" fill="url(#sunsetBg)" />

      {/* Sun glow — warm white center */}
      <circle cx="100" cy="185" r="50" fill="white" opacity="0.15" />
      <circle cx="100" cy="185" r="30" fill="white" opacity="0.1" />

      {/* Palm tree silhouette — left */}
      <path d="M28 200 L32 140" stroke="#92400E" strokeWidth="3" opacity="0.25" />
      <path d="M32 140 Q20 128 8 132" stroke="#92400E" strokeWidth="2.5" fill="none" opacity="0.25" />
      <path d="M32 140 Q22 122 12 118" stroke="#92400E" strokeWidth="2.5" fill="none" opacity="0.2" />
      <path d="M32 140 Q38 124 44 118" stroke="#92400E" strokeWidth="2.5" fill="none" opacity="0.2" />
      <path d="M32 140 Q42 130 50 132" stroke="#92400E" strokeWidth="2.5" fill="none" opacity="0.25" />
      {/* Palm frond fills */}
      <path d="M32 140 Q20 128 8 132 Q18 126 32 140Z" fill="#92400E" opacity="0.15" />
      <path d="M32 140 Q42 130 50 132 Q40 128 32 140Z" fill="#92400E" opacity="0.15" />

      {/* Palm tree silhouette — right */}
      <path d="M172 200 L168 148" stroke="#92400E" strokeWidth="2.5" opacity="0.2" />
      <path d="M168 148 Q178 136 188 138" stroke="#92400E" strokeWidth="2" fill="none" opacity="0.2" />
      <path d="M168 148 Q160 134 152 132" stroke="#92400E" strokeWidth="2" fill="none" opacity="0.2" />
      <path d="M168 148 Q176 132 184 126" stroke="#92400E" strokeWidth="2" fill="none" opacity="0.15" />
      <path d="M168 148 Q158 138 150 140" stroke="#92400E" strokeWidth="2" fill="none" opacity="0.2" />

      {/* Body / Shoulders — navy blazer */}
      <path
        d="M30 200 C30 162 58 145 100 145 C142 145 170 162 170 200Z"
        fill="#1E3A5F"
      />
      {/* Blazer texture — subtle lighter edge */}
      <path
        d="M34 200 C34 164 60 148 100 148 C140 148 166 164 166 200Z"
        fill="#234872"
        opacity="0.5"
      />
      {/* Blazer lapels */}
      <path d="M78 145 L94 172 L100 160 L106 172 L122 145" fill="#162E4A" />
      <path d="M80 146 L94 170 L100 160" fill="#1A3556" />
      <path d="M120 146 L106 170 L100 160" fill="#1A3556" />
      {/* White linen shirt — open collar */}
      <path d="M88 146 L100 166 L112 146" fill="#FAF9F6" />
      <path d="M90 147 L100 164 L110 147" fill="#F0EFE8" />
      {/* Collar spread — open, relaxed */}
      <path d="M88 146 L84 152 L90 150" fill="#FAF9F6" />
      <path d="M112 146 L116 152 L110 150" fill="#FAF9F6" />
      {/* Hint of chest — tan skin in V */}
      <path d="M94 148 L100 158 L106 148" fill="#D4A76A" />
      {/* Blazer button */}
      <circle cx="100" cy="176" r="2" fill="#C9A84C" opacity="0.6" />

      {/* Neck — tanned */}
      <path d="M86 120 L86 148 Q100 155 114 148 L114 120Z" fill="#D4A76A" />
      {/* Neck shadow */}
      <path d="M90 140 Q100 144 110 140" stroke="#B8894E" strokeWidth="1" fill="none" opacity="0.3" />

      {/* Head — tanned South Florida skin */}
      <ellipse cx="100" cy="82" rx="42" ry="46" fill="#DEAC6E" />
      {/* Inner face — slightly lighter */}
      <ellipse cx="100" cy="83" rx="38" ry="42" fill="#E4B87A" />

      {/* Ears */}
      <ellipse cx="58" cy="86" rx="6" ry="10" fill="#D4A76A" />
      <path d="M56 83 Q58 86 56 89" stroke="#C09050" strokeWidth="1" fill="none" />
      <ellipse cx="142" cy="86" rx="6" ry="10" fill="#D4A76A" />
      <path d="M144 83 Q142 86 144 89" stroke="#C09050" strokeWidth="1" fill="none" />

      {/* Hair — dark, styled, neat with volume */}
      {/* Main hair mass */}
      <path
        d="M54 78 C50 50 66 22 100 20 C134 22 150 50 146 78
           C146 62 134 34 100 32 C66 34 54 62 54 78Z"
        fill="#2C1810"
      />
      {/* Top volume — styled with slight sweep to the right */}
      <path
        d="M56 58 C54 32 72 14 100 12 C128 14 146 32 144 58
           C142 38 128 22 100 20 C72 22 58 38 56 58Z"
        fill="#3A2218"
      />
      {/* Peak — styled height */}
      <path
        d="M62 42 C66 18 84 8 102 8 C120 10 136 20 138 42
           C134 26 120 14 102 14 C84 14 68 26 62 42Z"
        fill="#452A1C"
      />
      {/* Top crest — clean sweep */}
      <path
        d="M68 32 C74 14 90 8 104 8 C118 10 130 18 134 32
           C128 20 116 12 104 12 C90 12 76 18 68 32Z"
        fill="#4E3020"
      />
      {/* Left side — tapered, clean */}
      <path d="M52 80 C48 64 52 44 62 34 C56 48 54 66 56 82Z" fill="#3A2218" />
      {/* Right side — tapered, clean */}
      <path d="M148 80 C152 64 148 44 138 34 C144 48 146 66 144 82Z" fill="#3A2218" />
      {/* Hair shine — healthy, styled */}
      <path d="M76 18 Q90 10 108 14" stroke="#5C3824" strokeWidth="2.5" fill="none" opacity="0.5" />
      <path d="M80 24 Q94 16 112 20" stroke="#6A4430" strokeWidth="2" fill="none" opacity="0.4" />
      <path d="M86 14 Q98 10 112 14" stroke="#7A5438" strokeWidth="1.5" fill="none" opacity="0.3" />
      {/* Side texture */}
      <path d="M56 68 Q60 54 66 44" stroke="#2C1810" strokeWidth="1.5" fill="none" opacity="0.3" />
      <path d="M144 68 Q140 54 134 44" stroke="#2C1810" strokeWidth="1.5" fill="none" opacity="0.3" />

      {/* Eyebrows — dark, groomed, confident arch */}
      <path
        d="M70 64 Q80 56 92 62"
        stroke="#2C1810"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M108 62 Q120 56 130 64"
        stroke="#2C1810"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />

      {/* Gold aviator sunglasses */}
      {/* Left lens — aviator teardrop shape */}
      <path
        d="M64 76 Q64 68 74 68 L90 68 Q98 68 98 76 L98 86 Q98 94 86 96 Q68 96 64 86Z"
        fill="url(#aviatorLens)"
      />
      {/* Right lens */}
      <path
        d="M102 76 Q102 68 112 68 L128 68 Q136 68 136 76 L136 86 Q136 94 124 96 Q106 96 102 86Z"
        fill="url(#aviatorLens)"
      />
      {/* Gold frame — left */}
      <path
        d="M64 76 Q64 68 74 68 L90 68 Q98 68 98 76 L98 86 Q98 94 86 96 Q68 96 64 86Z"
        stroke="#C9A84C"
        strokeWidth="2"
        fill="none"
      />
      {/* Gold frame — right */}
      <path
        d="M102 76 Q102 68 112 68 L128 68 Q136 68 136 76 L136 86 Q136 94 124 96 Q106 96 102 86Z"
        stroke="#C9A84C"
        strokeWidth="2"
        fill="none"
      />
      {/* Bridge — double bar aviator style */}
      <path d="M98 74 L102 74" stroke="#C9A84C" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M98 78 L102 78" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      {/* Temple arms */}
      <path d="M64 74 L56 70" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round" />
      <path d="M136 74 L144 70" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round" />
      {/* Lens reflections — sunset reflection */}
      <path d="M70 74 L78 72" stroke="#FCD34D" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
      <path d="M72 78 L76 76" stroke="#FBBF24" strokeWidth="1.5" strokeLinecap="round" opacity="0.2" />
      <path d="M108 74 L116 72" stroke="#FCD34D" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
      <path d="M110 78 L114 76" stroke="#FBBF24" strokeWidth="1.5" strokeLinecap="round" opacity="0.2" />

      {/* Nose — strong, defined */}
      <path d="M100 84 L96 98 Q100 101 104 98Z" fill="#C09050" />
      <path d="M100 84 L99 92" stroke="#D4A76A" strokeWidth="1" fill="none" opacity="0.4" />

      {/* Confident smirk — slightly asymmetric, cocky */}
      <path
        d="M84 108 Q92 114 100 114 Q112 114 120 106"
        stroke="#A07050"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Teeth flash */}
      <path d="M89 108 Q100 116 114 108" fill="white" fillOpacity="0.85" />
      {/* Upper lip */}
      <path d="M88 108 Q100 104 114 107" stroke="#B8894E" strokeWidth="0.8" fill="none" opacity="0.3" />

      {/* Strong jawline */}
      <path d="M62 92 Q66 110 78 122" stroke="#C09050" strokeWidth="1.2" fill="none" opacity="0.2" />
      <path d="M138 92 Q134 110 122 122" stroke="#C09050" strokeWidth="1.2" fill="none" opacity="0.2" />
      {/* Chin cleft — subtle */}
      <path d="M98 124 Q100 126 102 124" stroke="#C09050" strokeWidth="1" fill="none" opacity="0.25" />
      {/* Chin definition */}
      <path d="M84 124 Q100 130 116 124" stroke="#C09050" strokeWidth="1" fill="none" opacity="0.2" />

      {/* Five o'clock shadow — very subtle */}
      <ellipse cx="100" cy="116" rx="22" ry="14" fill="#8B6040" opacity="0.06" />

      {/* Gradients */}
      <defs>
        {/* Warm gold/amber background */}
        <linearGradient id="sunsetBg" x1="100" y1="0" x2="100" y2="200">
          <stop offset="0%" stopColor="#FCD34D" />
          <stop offset="40%" stopColor="#FBBF24" />
          <stop offset="70%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        {/* Aviator lens — dark with warm tint */}
        <linearGradient id="aviatorLens" x1="0" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#1A1A2E" stopOpacity="0.92" />
          <stop offset="50%" stopColor="#2C1810" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#3D2817" stopOpacity="0.78" />
        </linearGradient>
      </defs>
    </svg>
  )
}
