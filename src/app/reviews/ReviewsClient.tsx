'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { Star, ChevronDown, Loader2, Send, CheckCircle2, MapPin, Clock, BadgeCheck, MessageCircle, ArrowLeft } from 'lucide-react'
import BocaBankerAvatar from '@/components/landing/BocaBankerAvatar'
import MobileChatButton from '@/components/landing/MobileChatButton'
import { OpenChatButton } from '@/components/landing/LandingClient'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { siteConfig } from '@/lib/site-config'
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
    <div className="flex gap-1" role="radiogroup" aria-label="Your rating">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={value === i}
          aria-label={`${i} star${i > 1 ? 's' : ''}`}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(i)}
          className="p-1 transition-transform hover:scale-110"
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

// appearance-none: Safari's native select ignores padding; text-base below md
// because iOS zooms into fields under 16px.
const selectClass =
  'h-9 w-full appearance-none rounded-md border border-gray-200 bg-white pl-3 pr-9 text-base md:text-sm'

function SelectChevron() {
  return (
    <ChevronDown
      aria-hidden="true"
      className="pointer-events-none absolute bottom-2.5 right-3 h-4 w-4 text-gray-400"
    />
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
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <Stars rating={review.rating} />
          <h3 className="font-serif text-lg leading-snug text-navy mt-2">{review.title}</h3>
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
          className="-mb-2 -mt-1 py-2 text-gold-dark text-sm font-medium hover:underline"
        >
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}

      <div className="flex items-center gap-2 mt-3 text-sm text-gray-500">
        <span className="font-medium text-navy">{review.reviewerName}</span>
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
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200"
            >
              {b}
            </span>
          ))}
          {review.closedOnTime && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200">
              <Clock className="w-3 h-3" /> Closed on time
            </span>
          )}
          {review.interestRateExperience === 'Lower than expected' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200">
              <BadgeCheck className="w-3 h-3" /> Lower rate
            </span>
          )}
        </div>
      )}

      {review.responseText && (
        <div className="mt-4 bg-cream rounded-xl p-4 border-l-2 border-gold">
          <p className="text-xs font-semibold text-gold-dark mb-1">Response from Boca Banker</p>
          <p className="text-sm text-gray-700 leading-relaxed">{review.responseText}</p>
        </div>
      )}
    </div>
  )
}

export interface InitialReviews {
  reviews: Review[]
  total: number
  averageRating: number
  totalReviews: number
  ratingBreakdown: Record<number, number>
}

export default function ReviewsClient({ initial }: { initial: InitialReviews | null }) {
  const [reviews, setReviews] = useState<Review[]>(initial?.reviews ?? [])
  const [total, setTotal] = useState(initial?.total ?? 0)
  const [averageRating, setAverageRating] = useState(initial?.averageRating ?? 0)
  const [totalReviews, setTotalReviews] = useState(initial?.totalReviews ?? 0)
  const [ratingBreakdown, setRatingBreakdown] = useState<Record<number, number>>(initial?.ratingBreakdown ?? {})
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(!initial)
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

  // Abort any in-flight request when a new one starts, so a slow "load more"
  // for the previous rating filter can't append to the new filter's list.
  const inFlight = useRef<AbortController | null>(null)

  const fetchReviews = useCallback(async (p: number, rating: number | null) => {
    inFlight.current?.abort()
    const controller = new AbortController()
    inFlight.current = controller

    if (p === 1) {
      setPage(1)
      setReviews([])
    }
    setLoading(true)
    const params = new URLSearchParams({ page: String(p), limit: '12' })
    if (rating) params.set('rating', String(rating))
    try {
      const res = await fetch(`/api/reviews?${params}`, { signal: controller.signal })
      if (res.ok) {
        const data = await res.json()
        if (controller.signal.aborted) return
        setReviews((prev) => (p === 1 ? data.reviews : [...prev, ...data.reviews]))
        setTotal(data.total)
        setAverageRating(data.averageRating)
        setTotalReviews(data.totalReviews)
        setRatingBreakdown(data.ratingBreakdown)
      }
    } catch {
      // Aborted or network failure — leave existing reviews in place
    }
    if (!controller.signal.aborted) setLoading(false)
  }, [])

  // The server rendered the first unfiltered page; don't refetch it on mount.
  const skipInitialFetch = useRef(initial !== null)

  useEffect(() => {
    if (skipInitialFetch.current) {
      skipInitialFetch.current = false
      return
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetching resets page on filter change
    fetchReviews(1, ratingFilter)
    return () => inFlight.current?.abort()
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
        const data = await res.json().catch(() => ({}))
        setFormError(data.error || 'Failed to submit review')
      }
    } catch {
      setFormError('Failed to submit review. Please try again.')
    }
    setSubmitting(false)
  }

  const hasMore = reviews.length < total

  return (
    <div className="min-h-screen bg-cream text-navy">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl shadow-sm border-b border-gray-100">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <BocaBankerAvatar size={36} />
            <span className="font-serif text-xl text-navy">Boca Banker</span>
          </Link>
          {/* No chat widget on this page: desktop goes to the homepage chat, phones open the overlay */}
          <Link
            href="/#chat"
            className="hidden lg:inline-flex items-center gap-1.5 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy-light"
          >
            <MessageCircle className="h-4 w-4" />
            Ask a question
          </Link>
          <OpenChatButton className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-navy px-4 text-sm font-semibold text-white transition-colors hover:bg-navy-light lg:hidden">
            <MessageCircle className="h-4 w-4" />
            Ask a question
          </OpenChatButton>
        </div>
      </nav>

      <main className="pt-28 pb-20 px-4 sm:px-6">
        <div className="mx-auto max-w-5xl">
          {/* Header + Stats */}
          <div className="text-center mb-10">
            <Link
              href="/"
              className="-mt-2 mb-4 inline-flex items-center gap-1.5 py-2 text-sm text-gray-500 hover:text-navy"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Link>
            <p className="text-xs font-semibold tracking-[0.18em] uppercase text-gold-dark mb-3">
              Client reviews
            </p>
            <h1 className="font-serif text-4xl sm:text-5xl text-navy mb-6">
              What clients say
            </h1>

            {/* Rating summary */}
            {totalReviews > 0 && (
              <div className="flex flex-col items-center gap-3 bg-white rounded-2xl border border-gray-200 px-5 py-5 sm:inline-flex sm:flex-row sm:gap-4 sm:px-6 sm:py-4">
                <div className="text-center">
                  <div className="font-serif text-4xl text-navy">
                    {averageRating.toFixed(2)}
                  </div>
                  <Stars rating={Math.round(averageRating)} size={18} />
                </div>
                <div className="hidden h-10 w-px bg-gray-200 sm:block" />
                <div className="text-center sm:text-left">
                  <div className="text-lg font-semibold text-navy">
                    {totalReviews} reviews
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:mt-1 sm:flex-nowrap sm:gap-3">
                    {[5, 4, 3, 2, 1].map((r) => {
                      const count = ratingBreakdown[r] || 0
                      const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0
                      return (
                        <button
                          key={r}
                          onClick={() =>
                            setRatingFilter(ratingFilter === r ? null : r)
                          }
                          aria-pressed={ratingFilter === r}
                          aria-label={`Show ${r}-star reviews (${count})`}
                          className={cn(
                            'flex items-center gap-1 transition-colors',
                            // 40px chips on phones; inline with bars from sm up
                            'h-10 min-w-12 justify-center rounded-full border px-3 text-sm sm:h-auto sm:min-w-0 sm:rounded-none sm:border-0 sm:px-0 sm:text-xs',
                            ratingFilter === r
                              ? 'border-gold bg-amber-50 text-gold-dark font-semibold sm:bg-transparent'
                              : 'border-gray-200 text-gray-500 hover:text-gray-600 sm:text-gray-400'
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
                  className="py-2 text-sm text-gold-dark hover:underline"
                >
                  Clear filter — showing {ratingFilter}-star reviews
                </button>
              </div>
            )}
          </div>

          {/* Write a Review CTA + Form */}
          <div className="mb-10" id="write-review">
            {submitted ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center max-w-lg mx-auto">
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
                  className="bg-navy hover:bg-navy-light text-white gap-2"
                >
                  <Star className="w-4 h-4" /> Write a Review
                </Button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 max-w-2xl mx-auto">
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
                      <label htmlFor="review-your-name" className="text-sm font-medium text-gray-700 mb-1 block">
                        Your Name *
                      </label>
                      <Input
                        id="review-your-name"
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
                      <label htmlFor="review-email" className="text-sm font-medium text-gray-700 mb-1 block">
                        Email (optional)
                      </label>
                      <Input
                        id="review-email"
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
                      <label htmlFor="review-city" className="text-sm font-medium text-gray-700 mb-1 block">
                        City (optional)
                      </label>
                      <Input
                        id="review-city"
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
                      <label htmlFor="review-state" className="text-sm font-medium text-gray-700 mb-1 block">
                        State (optional)
                      </label>
                      <Input
                        id="review-state"
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
                    <label htmlFor="review-review-title" className="text-sm font-medium text-gray-700 mb-1 block">
                      Review Title *
                    </label>
                    <Input
                      id="review-review-title"
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
                    <label htmlFor="review-your-review" className="text-sm font-medium text-gray-700 mb-1 block">
                      Your Review *
                    </label>
                    <Textarea
                      id="review-your-review"
                      value={formData.body}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          body: e.target.value,
                        }))
                      }
                      placeholder="Tell others about your experience working with Boca Banker..."
                      rows={5}
                    />
                  </div>

                  {/* Optional loan details */}
                  <div className="border-t border-gray-100 pt-4">
                    <p className="text-sm font-medium text-gray-500 mb-3">
                      Loan Details (optional)
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="relative">
                        <label htmlFor="review-loan-type" className="text-xs text-gray-500 mb-1 block">
                          Loan Type
                        </label>
                        <select
                          id="review-loan-type"
                          value={formData.loan_type}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              loan_type: e.target.value,
                            }))
                          }
                          className={selectClass}
                        >
                          <option value="">Select...</option>
                          <option value="Conventional">Conventional</option>
                          <option value="FHA">FHA</option>
                          <option value="VA">VA</option>
                          <option value="USDA">USDA</option>
                          <option value="Jumbo">Jumbo</option>
                          <option value="Other">Other</option>
                        </select>
                        <SelectChevron />
                      </div>
                      <div className="relative">
                        <label htmlFor="review-loan-term" className="text-xs text-gray-500 mb-1 block">
                          Loan Term
                        </label>
                        <select
                          id="review-loan-term"
                          value={formData.loan_term}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              loan_term: e.target.value,
                            }))
                          }
                          className={selectClass}
                        >
                          <option value="">Select...</option>
                          <option value="15 year fixed">15 year fixed</option>
                          <option value="30 year fixed">30 year fixed</option>
                          <option value="5/1 ARM">5/1 ARM</option>
                          <option value="Other">Other</option>
                        </select>
                        <SelectChevron />
                      </div>
                    </div>
                    <div className="flex gap-6 mt-1">
                      <label className="flex items-center gap-2 py-2 text-sm text-gray-600 cursor-pointer">
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
                      className="bg-navy hover:bg-navy-light text-white gap-2"
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
              <Loader2 className="h-8 w-8 animate-spin text-navy" />
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

      <footer className="border-t border-gray-200 px-4 sm:px-6 pt-8 pb-24 lg:pb-8">
        <div className="mx-auto max-w-5xl space-y-2 text-xs leading-relaxed text-gray-500">
          <p>
            <span className="font-semibold text-gray-600">Equal Housing Opportunity.</span>
            {siteConfig.nmlsId && <> {siteConfig.ownerName || 'Boca Banker'}, NMLS #{siteConfig.nmlsId}.</>}{' '}
            Reviews are submitted by clients and approved before they appear.
          </p>
          <p>
            &copy; {new Date().getFullYear()} Boca Banker ·{' '}
            <Link href="/" className="py-2.5 hover:text-navy">Home</Link>
          </p>
        </div>
      </footer>

      {/* Mobile floating chat button + fullscreen overlay */}
      <MobileChatButton />
    </div>
  )
}
