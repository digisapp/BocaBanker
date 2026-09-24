import { and, avg, count, desc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { reviews } from '@/db/schema'

export interface PublicReviewsResult {
  reviews: Awaited<ReturnType<typeof selectPublicReviews>>
  total: number
  averageRating: number
  totalReviews: number
  ratingBreakdown: Record<number, number>
}

function selectPublicReviews(where: ReturnType<typeof and>, limit: number, offset: number) {
  // Public data: select an explicit column list so reviewer_email (PII) and
  // internal fields are never exposed.
  return db
    .select({
      id: reviews.id,
      reviewerName: reviews.reviewerName,
      reviewerCity: reviews.reviewerCity,
      reviewerState: reviews.reviewerState,
      rating: reviews.rating,
      title: reviews.title,
      body: reviews.body,
      loanStatus: reviews.loanStatus,
      loanType: reviews.loanType,
      interestRateExperience: reviews.interestRateExperience,
      closedOnTime: reviews.closedOnTime,
      feesExperience: reviews.feesExperience,
      loanTerm: reviews.loanTerm,
      loanProgram: reviews.loanProgram,
      isFirstTimeBuyer: reviews.isFirstTimeBuyer,
      isSelfEmployed: reviews.isSelfEmployed,
      status: reviews.status,
      responseText: reviews.responseText,
      responseDate: reviews.responseDate,
      reviewDate: reviews.reviewDate,
      createdAt: reviews.createdAt,
    })
    .from(reviews)
    .where(where)
    .orderBy(desc(reviews.reviewDate))
    .limit(limit)
    .offset(offset)
}

/**
 * Approved reviews plus aggregate stats. Shared by the public API (client-side
 * filtering and "load more") and the server-rendered /reviews page, so the
 * first page of reviews is in the HTML for search engines.
 */
export async function getPublicReviews({
  limit,
  offset = 0,
  rating = null,
}: {
  limit: number
  offset?: number
  rating?: number | null
}): Promise<PublicReviewsResult> {
  const approved = eq(reviews.status, 'approved')
  const where =
    rating && Number.isInteger(rating) && rating >= 1 && rating <= 5
      ? and(approved, eq(reviews.rating, rating))
      : and(approved)

  const [reviewRows, [totalResult], [statsResult], breakdownRows] = await Promise.all([
    selectPublicReviews(where, limit, offset),
    db.select({ total: count() }).from(reviews).where(where),
    db
      .select({ totalReviews: count(), averageRating: avg(reviews.rating) })
      .from(reviews)
      .where(approved),
    db
      .select({ rating: reviews.rating, count: count() })
      .from(reviews)
      .where(approved)
      .groupBy(reviews.rating),
  ])

  const ratingBreakdown: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  for (const row of breakdownRows) {
    ratingBreakdown[row.rating] = row.count
  }

  const avgRating = statsResult?.averageRating ? parseFloat(statsResult.averageRating) : 0

  return {
    reviews: reviewRows,
    total: totalResult?.total ?? 0,
    averageRating: Math.round(avgRating * 100) / 100,
    totalReviews: statsResult?.totalReviews ?? 0,
    ratingBreakdown,
  }
}
