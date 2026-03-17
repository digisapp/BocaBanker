'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Star, ChevronDown, Loader2, Send, CheckCircle2, MapPin, Clock, BadgeCheck } from 'lucide-react'
import BocaBankerAvatar from '@/components/landing/BocaBankerAvatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { Review } from '@/types'

function Stars({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            i <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'
          )}
          style={{ width: size, height: size }}
        />
      ))}
    </div>
  )
}

function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(i)}
          className="transition-transform hover:scale-110"
        >
          <Star
            className={cn(
              'w-8 h-8 transition-colors',
              i <= (hover || value) ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
            )}
          />
        </button>
      ))}
    </div>
  )
}

function ReviewCard({ review }: { review: Review }) {
  const [expanded, setExpanded] = useState(false)
  const isLong = review.body.length > 250

  const badges: string[] = []
  if (review.loanTerm) badges.push(review.loanTerm)
  if (review.loanProgram) badges.push(review.loanProgram)
  if (review.loanType && review.loanType !== 'Purchase') badges.push(review.loanType)
  if (review.isFirstTimeBuyer) badges.push('First-time buyer')
  if (review.isSelfEmployed) badges.push('Self employed')

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <Stars rating={review.rating} />
          <h3 className="text-base font-semibold text-gray-900 mt-2">{review.title}</h3>
        </div>
        {review.reviewDate && (
          <span className="text-xs text-gray-400 whitespace-nowrap">
            {new Date(review.reviewDate + 'T00:00:00').toLocaleDateString('en-US', {
              month: 'short',
              year: 'numeric',
            })}
          </span>
        )}
      </div>

      <p className="text-sm text-gray-600 leading-relaxed">
        {isLong && !expanded ? review.body.slice(0, 250) + '...' : review.body}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-amber-600 text-sm font-medium mt-1 hover:underline"
        >
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}

      <div className="flex items-center gap-2 mt-3 text-sm text-gray-500">
        <span className="font-medium text-gray-700">{review.reviewerName}</span>
        {review.reviewerCity && (
          <>
            <MapPin className="w-3 h-3" />
            <span>
              {review.reviewerCity}
              {review.reviewerState ? `, ${review.reviewerState}` : ''}
            </span>
          </>
        )}
      </div>

      {badges.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {badges.map((b) => (
            <span
              key={b}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-sky-50 text-sky-700 border border-sky-100"
            >
              {b}
            </span>
          ))}
          {review.closedOnTime && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
              <Clock className="w-3 h-3" /> Closed on time
            </span>
          )}
          {review.interestRateExperience === 'Lower than expected' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100">
              <BadgeCheck className="w-3 h-3" /> Lower rate
            </span>
          )}
        </div>
      )}

      {review.responseText && (
        <div className="mt-4 bg-amber-50 rounded-xl p-4 border border-amber-100">
          <p className="text-xs font-semibold text-amber-700 mb-1">Response from Carmen</p>
          <p className="text-sm text-amber-900/80 leading-relaxed">{review.responseText}</p>
        </div>
      )}
    </div>
  )
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [total, setTotal] = useState(0)
  const [averageRating, setAverageRating] = useState(0)
  const [totalReviews, setTotalReviews] = useState(0)
  const [ratingBreakdown, setRatingBreakdown] = useState<Record<number, number>>({})
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [ratingFilter, setRatingFilter] = useState<number | null>(null)

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    reviewer_name: '',
    reviewer_email: '',
    reviewer_city: '',
    reviewer_state: '',
    rating: 0,
    title: '',
    body: '',
    loan_type: '',
    loan_term: '',
    is_first_time_buyer: false,
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [formError, setFormError] = useState('')

  const fetchReviews = useCallback(async (p: number, rating: number | null) => {
    if (p === 1) {
      setPage(1)
      setReviews([])
    }
    setLoading(true)
    const params = new URLSearchParams({ page: String(p), limit: '12' })
    if (rating) params.set('rating', String(rating))
    const res = await fetch(`/api/reviews?${params}`)
    if (res.ok) {
      const data = await res.json()
      setReviews((prev) => (p === 1 ? data.reviews : [...prev, ...data.reviews]))
      setTotal(data.total)
      setAverageRating(data.averageRating)
      setTotalReviews(data.totalReviews)
      setRatingBreakdown(data.ratingBreakdown)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetching resets page on filter change
    fetchReviews(1, ratingFilter)
  }, [ratingFilter, fetchReviews])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    if (!formData.rating) {
      setFormError('Please select a star rating')
      return
    }
    if (!formData.reviewer_name.trim()) {
      setFormError('Please enter your name')
      return
    }
    if (!formData.title.trim()) {
      setFormError('Please enter a review title')
      return
    }
    if (formData.body.trim().length < 10) {
      setFormError('Please write at least 10 characters in your review')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (res.ok) {
        setSubmitted(true)
      } else {
        const data = await res.json()
        setFormError(data.error || 'Failed to submit review')
      }
    } catch {
      setFormError('Failed to submit review. Please try again.')
    }
    setSubmitting(false)
  }

  const hasMore = reviews.length < total

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl shadow-sm border-b border-gray-100">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <BocaBankerAvatar size={32} />
            <span className="font-serif text-xl font-bold text-gray-900 hidden sm:block">
              Boca Banker
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Button
              asChild
              variant="ghost"
              className="text-gray-600 hover:text-gray-900 text-sm"
            >
              <Link href="/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </nav>

      <main className="pt-24 pb-16 px-4 sm:px-6">
        <div className="mx-auto max-w-5xl">
          {/* Header + Stats */}
          <div className="text-center mb-10">
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
              Client Reviews
            </h1>

            {/* Rating summary */}
            {totalReviews > 0 && (
              <div className="inline-flex items-center gap-4 bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900">
                    {averageRating.toFixed(2)}
                  </div>
                  <Stars rating={Math.round(averageRating)} size={18} />
                </div>
                <div className="h-10 w-px bg-gray-200" />
                <div className="text-left">
                  <div className="text-lg font-semibold text-gray-900">
                    {totalReviews} Reviews
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    {[5, 4, 3, 2, 1].map((r) => {
                      const count = ratingBreakdown[r] || 0
                      const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0
                      return (
                        <button
                          key={r}
                          onClick={() =>
                            setRatingFilter(ratingFilter === r ? null : r)
                          }
                          className={cn(
                            'flex items-center gap-1 text-xs transition-colors',
                            ratingFilter === r
                              ? 'text-amber-600 font-semibold'
                              : 'text-gray-400 hover:text-gray-600'
                          )}
                        >
                          <span>{r}</span>
                          <Star className="w-3 h-3 fill-current" />
                          <span className="hidden sm:inline">({count})</span>
                          <div className="hidden sm:block w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-amber-400 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {ratingFilter && (
              <div className="mt-3">
                <button
                  onClick={() => setRatingFilter(null)}
                  className="text-sm text-amber-600 hover:underline"
                >
                  Clear filter — showing {ratingFilter}-star reviews
                </button>
              </div>
            )}
          </div>

          {/* Write a Review CTA + Form */}
          <div className="mb-10" id="write-review">
            {submitted ? (
              <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-8 text-center max-w-lg mx-auto">
                <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Thank you for your review!
                </h2>
                <p className="text-gray-500 text-sm">
                  Your review has been submitted and will appear on this page
                  after it&apos;s been approved. We appreciate your feedback!
                </p>
              </div>
            ) : !showForm ? (
              <div className="text-center">
                <Button
                  onClick={() => setShowForm(true)}
                  className="bg-amber-500 hover:bg-amber-600 text-white gap-2"
                >
                  <Star className="w-4 h-4" /> Write a Review
                </Button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 max-w-2xl mx-auto">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">
                  Write a Review
                </h2>
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Star rating */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Your Rating *
                    </label>
                    <StarInput
                      value={formData.rating}
                      onChange={(v) =>
                        setFormData((prev) => ({ ...prev, rating: v }))
                      }
                    />
                  </div>

                  {/* Name + Email */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">
                        Your Name *
                      </label>
                      <Input
                        value={formData.reviewer_name}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            reviewer_name: e.target.value,
                          }))
                        }
                        placeholder="John D."
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">
                        Email (optional)
                      </label>
                      <Input
                        type="email"
                        value={formData.reviewer_email}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            reviewer_email: e.target.value,
                          }))
                        }
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>

                  {/* City + State */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">
                        City (optional)
                      </label>
                      <Input
                        value={formData.reviewer_city}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            reviewer_city: e.target.value,
                          }))
                        }
                        placeholder="Boca Raton"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">
                        State (optional)
                      </label>
                      <Input
                        value={formData.reviewer_state}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            reviewer_state: e.target.value,
                          }))
                        }
                        placeholder="FL"
                        maxLength={2}
                      />
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      Review Title *
                    </label>
                    <Input
                      value={formData.title}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          title: e.target.value,
                        }))
                      }
                      placeholder="Best mortgage experience ever!"
                    />
                  </div>

                  {/* Body */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      Your Review *
                    </label>
                    <Textarea
                      value={formData.body}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          body: e.target.value,
                        }))
                      }
                      placeholder="Tell others about your experience working with Carmen..."
                      rows={5}
                    />
                  </div>

                  {/* Optional loan details */}
                  <div className="border-t border-gray-100 pt-4">
                    <p className="text-sm font-medium text-gray-500 mb-3">
                      Loan Details (optional)
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">
                          Loan Type
                        </label>
                        <select
                          value={formData.loan_type}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              loan_type: e.target.value,
                            }))
                          }
                          className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                        >
                          <option value="">Select...</option>
                          <option value="Conventional">Conventional</option>
                          <option value="FHA">FHA</option>
                          <option value="VA">VA</option>
                          <option value="USDA">USDA</option>
                          <option value="Jumbo">Jumbo</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">
                          Loan Term
                        </label>
                        <select
                          value={formData.loan_term}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              loan_term: e.target.value,
                            }))
                          }
                          className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                        >
                          <option value="">Select...</option>
                          <option value="15 year fixed">15 year fixed</option>
                          <option value="30 year fixed">30 year fixed</option>
                          <option value="5/1 ARM">5/1 ARM</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-6 mt-3">
                      <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.is_first_time_buyer}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              is_first_time_buyer: e.target.checked,
                            }))
                          }
                          className="rounded border-gray-300"
                        />
                        First-time buyer
                      </label>
                    </div>
                  </div>

                  {formError && (
                    <p className="text-sm text-red-600">{formError}</p>
                  )}

                  <div className="flex gap-3">
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="bg-amber-500 hover:bg-amber-600 text-white gap-2"
                    >
                      {submitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      Submit Review
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setShowForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Reviews grid */}
          {loading && reviews.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                {reviews.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>

              {hasMore && (
                <div className="text-center mt-8">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const next = page + 1
                      setPage(next)
                      fetchReviews(next, ratingFilter)
                    }}
                    disabled={loading}
                    className="gap-2"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                    Load More Reviews
                  </Button>
                </div>
              )}
            </>
          )}

        </div>
      </main>
    </div>
  )
}
