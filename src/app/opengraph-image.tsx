import { ImageResponse } from 'next/og'
import { readFile } from 'fs/promises'
import { join } from 'path'

export const alt = 'Boca Banker — straight answers on South Florida mortgages'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const NAVY = '#1E293B'
const GOLD = '#F59E0B'

export default async function OGImage() {
  const photo = await readFile(join(process.cwd(), 'public/og-headshot.jpg'))
  const photoSrc = `data:image/jpeg;base64,${photo.toString('base64')}`

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 90px',
          background: NAVY,
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '640px' }}>
          <div
            style={{
              fontSize: '20px',
              fontWeight: 600,
              letterSpacing: '4px',
              textTransform: 'uppercase',
              color: GOLD,
              marginBottom: '24px',
            }}
          >
            Boca Banker · Boca Raton, FL
          </div>
          <div style={{ fontSize: '66px', fontWeight: 700, lineHeight: 1.08, color: 'white', letterSpacing: '-2px' }}>
            Straight answers on South Florida mortgages.
          </div>
          <div
            style={{
              fontSize: '26px',
              lineHeight: 1.4,
              color: 'rgba(255,255,255,0.7)',
              marginTop: '28px',
            }}
          >
            Home loans, refinancing, and cost segregation. 40+ years of Boca Raton lending.
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            width: '340px',
            height: '340px',
            borderRadius: '50%',
            padding: '8px',
            background: GOLD,
          }}
        >
          <div
            style={{
              display: 'flex',
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              overflow: 'hidden',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img src={photoSrc} width={370} height={370} alt="" style={{ marginLeft: '6px', marginTop: '6px' }} />
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
