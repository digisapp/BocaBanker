import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bocabanker.com'

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard/',
          '/chat/',
          '/clients/',
          '/properties/',
          '/studies/',
          '/calculators/',
          '/email/',
          '/documents/',
          '/settings/',
          '/api/',
          '/reset-password/',
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
