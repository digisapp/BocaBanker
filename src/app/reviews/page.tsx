import type { Metadata } from 'next'
import { cache } from 'react'
import { logger } from '@/lib/logger'
import { getPublicReviews } from '@/lib/reviews'
import { SITE_URL } from '@/lib/seo'
import ReviewsClient, { type InitialReviews } from './ReviewsClient'

// Server-render the first page of reviews so they're in the HTML for search
// engines; filtering and "load more" still happen client-side via the API.
export const revalidate = 300

const PAGE_SIZE = 12

const loadInitialReviews = cache(async (): Promise<InitialReviews | null> => {
  try {
    const result = await getPublicReviews({ limit: PAGE_SIZE })
    // Match the API's JSON shape (dates as strings) exactly.
    return JSON.parse(JSON.stringify(result)) as InitialReviews
  } catch (error) {
    logger.error('reviews-page', 'Failed to load reviews', error)
    return null
  }
})

export async function generateMetadata(): Promise<Metadata> {
  const initial = await loadInitialReviews()
  const n = initial?.totalReviews ?? 0
  const description =
    n > 0
      ? `Read ${n} client reviews of Boca Banker, rated ${initial!.averageRating.toFixed(1)} out of 5. Real stories from South Florida homebuyers and homeowners on their mortgage and refinance experience.`
      : 'Read what clients say about working with Boca Banker on home loans and refinancing in South Florida.'

  return {
    title: 'Client Reviews',
    description,
    alternates: { canonical: '/reviews' },
    openGraph: {
      type: 'website',
      locale: 'en_US',
      siteName: 'Boca Banker',
      url: '/reviews',
      title: 'Client Reviews | Boca Banker',
      description,
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Client Reviews | Boca Banker',
      description,
    },
  }
}

export default async function ReviewsPage() {
  const initial = await loadInitialReviews()

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Client Reviews', item: `${SITE_URL}/reviews` },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <ReviewsClient initial={initial} />
    </>
  )
}
