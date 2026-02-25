import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Boca Banker — AI-powered cost segregation and banking intelligence'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #FAFAF8 0%, #FEF3C7 40%, #FDE68A 70%, #F59E0B 100%)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Card */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'white',
            borderRadius: '32px',
            padding: '60px 80px',
            boxShadow: '0 25px 50px rgba(0,0,0,0.12)',
            maxWidth: '900px',
          }}
        >
          {/* Icon */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '80px',
              height: '80px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #F59E0B, #EAB308)',
              marginBottom: '24px',
            }}
          >
            <svg
              width="44"
              height="44"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: '56px',
              fontWeight: 800,
              color: '#111827',
              marginBottom: '12px',
              letterSpacing: '-1px',
            }}
          >
            Boca Banker
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontSize: '24px',
              fontWeight: 500,
              color: '#6B7280',
              textAlign: 'center',
              lineHeight: 1.4,
            }}
          >
            AI-Powered Cost Segregation &amp; Banking Intelligence
          </div>

          {/* Tags */}
          <div
            style={{
              display: 'flex',
              gap: '12px',
              marginTop: '32px',
            }}
          >
            {['Tax Savings', 'MACRS Depreciation', 'Property Analysis', 'AI Chat'].map(
              (tag) => (
                <div
                  key={tag}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '999px',
                    backgroundColor: '#FEF3C7',
                    color: '#92400E',
                    fontSize: '16px',
                    fontWeight: 600,
                  }}
                >
                  {tag}
                </div>
              )
            )}
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
