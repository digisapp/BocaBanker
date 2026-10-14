import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'

// Private app sections (all behind auth). /login, /signup and /reset-password
// stay crawlable so bots can see their noindex tag.
const PRIVATE_SECTIONS = [
  'dashboard',
  'chat',
  'leads',
  'clients',
  'properties',
  'studies',
  'calculators',
  'mortgage',
  'review-management',
  'email',
  'documents',
  'settings',
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Block each section's index page exactly ('$' anchors the match, so
        // '/mortgage$' leaves the public /mortgage-calculator alone) plus
        // everything under it.
        disallow: [
          '/api/',
          ...PRIVATE_SECTIONS.flatMap((s) => [`/${s}$`, `/${s}/`]),
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
