import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Private app pages (all behind auth). /login, /signup and
        // /reset-password stay crawlable so bots can see their noindex tag.
        disallow: [
          '/api/',
          '/dashboard/',
          '/chat/',
          '/leads/',
          '/clients/',
          '/properties/',
          '/studies/',
          '/calculators/',
          '/mortgage/',
          '/review-management/',
          '/email/',
          '/documents/',
          '/settings/',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
