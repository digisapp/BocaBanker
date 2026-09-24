import type { MetadataRoute } from 'next'
import { eq, max } from 'drizzle-orm'
import { db } from '@/db'
import { reviews } from '@/db/schema'
import { SITE_URL } from '@/lib/seo'
import { topics } from '@/content/topics'

export const revalidate = 3600

// Only public, indexable pages belong here. Login and password reset are
// noindex, and everything behind auth is disallowed in robots.ts.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Both pages show approved reviews, so their newest change is a fair lastmod.
  let latestReview: Date | undefined
  try {
    const [row] = await db
      .select({ updatedAt: max(reviews.updatedAt) })
      .from(reviews)
      .where(eq(reviews.status, 'approved'))
    latestReview = row?.updatedAt ?? undefined
  } catch {
    // Sitemap still works without the date
  }

  return [
    { url: SITE_URL, lastModified: latestReview },
    { url: `${SITE_URL}/reviews`, lastModified: latestReview },
    ...topics.map((t) => ({ url: `${SITE_URL}${t.slug}` })),
  ]
}
