import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Boca Banker',
    short_name: 'BocaBanker',
    description:
      'AI-powered cost segregation analysis and banking intelligence. Maximize tax savings with automated property studies.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#FAFAF8',
    theme_color: '#f59e0b',
    icons: [
      {
        src: '/favicon.ico',
        sizes: '48x48',
        type: 'image/x-icon',
      },
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
