'use client'

/**
 * Client-only islands for the (server-rendered) landing page. Keeping these
 * small lets the hero/FAQ/feature markup ship as static HTML, and keeps the
 * AI chat bundle off the critical path.
 */

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/* ─── Scroll Reveal ─── */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode
  className?: string
  delay?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.unobserve(el) } },
      { threshold: 0.12, rootMargin: '0px 0px -30px 0px' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={cn(
        'transition-all duration-700 ease-out',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8',
        className
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

/* ─── Count Up ─── */
export function CountUp({ target, suffix = '', prefix = '' }: { target: number; suffix?: string; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [count, setCount] = useState(0)
  const started = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let raf = 0
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !started.current) {
          started.current = true
          const t0 = performance.now()
          const tick = (now: number) => {
            const p = Math.min((now - t0) / 2000, 1)
            const eased = 1 - Math.pow(1 - p, 3)
            setCount(Math.floor(eased * target))
            if (p < 1) raf = requestAnimationFrame(tick)
          }
          raf = requestAnimationFrame(tick)
        }
      },
      { threshold: 0.5 }
    )
    obs.observe(el)
    return () => {
      obs.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [target])

  return <span ref={ref}>{prefix}{count.toLocaleString('en-US')}{suffix}</span>
}

/* ─── Nav (background changes once scrolled) ─── */
export function LandingNav({ children }: { children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40)
    fn()
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <nav
      aria-label="Main navigation"
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
        scrolled
          ? 'bg-white/90 backdrop-blur-xl shadow-sm border-b border-gray-100'
          : 'bg-transparent'
      )}
    >
      {children}
    </nav>
  )
}

/* ─── Smooth-scroll button (to an element id, or the top of the page) ─── */
export function ScrollButton({
  targetId,
  className,
  children,
}: {
  targetId?: string
  className?: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        if (targetId) {
          document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' })
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }
      }}
    >
      {children}
    </button>
  )
}

/* ─── Guest chat (lazy) ─── */

const GuestChatWidget = dynamic(() => import('@/components/landing/GuestChatWidget'), {
  // The widget reads localStorage during init, so it must not SSR.
  ssr: false,
  loading: () => <ChatSkeleton />,
})

function ChatSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="mx-auto max-w-2xl h-[520px] bg-white rounded-3xl border border-gray-100 animate-pulse"
    />
  )
}

const DESKTOP_QUERY = '(min-width: 1024px)'

function subscribeDesktop(cb: () => void) {
  const mql = window.matchMedia(DESKTOP_QUERY)
  mql.addEventListener('change', cb)
  return () => mql.removeEventListener('change', cb)
}

/**
 * Hero chat widget — desktop only (mobile uses MobileChatButton). Only mounts
 * on wide viewports so phones never download the AI chat bundle up front.
 */
export function HeroChatWidget() {
  const isDesktop = useSyncExternalStore(
    subscribeDesktop,
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => false,
  )
  return isDesktop ? <GuestChatWidget /> : <ChatSkeleton />
}

/* ─── Reviews Preview ─── */

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" role="img" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          aria-hidden="true"
          className={cn(
            'h-4 w-4',
            i < rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'
          )}
        />
      ))}
    </div>
  )
}

interface PreviewReview {
  id: string
  reviewerName: string
  reviewerCity?: string
  reviewerState?: string
  rating: number
  title: string
  body: string
}

export function ReviewsPreview() {
  const [reviews, setReviews] = useState<PreviewReview[]>([])
  const [stats, setStats] = useState({ averageRating: 5, totalReviews: 0 })

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/reviews?limit=3', { signal: controller.signal })
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (!data) return
        if (data.reviews) setReviews(data.reviews)
        if (data.averageRating) setStats({ averageRating: data.averageRating, totalReviews: data.totalReviews })
      })
      .catch(() => {})
    return () => controller.abort()
  }, [])

  if (reviews.length === 0) return null

  return (
    <section aria-label="Client reviews" className="py-20 sm:py-28 px-6 bg-gradient-to-b from-white to-amber-50/30">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <div className="text-center mb-14">
            <p className="text-sm font-semibold tracking-widest uppercase text-amber-600 mb-3">
              Client Reviews
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900">
              Trusted by{' '}
              <span className="bg-gradient-to-r from-amber-600 to-yellow-500 bg-clip-text text-transparent">
                real clients
              </span>
            </h2>
            <div className="mt-4 flex items-center justify-center gap-2">
              <Stars rating={5} />
              <span className="text-gray-600 font-medium">{stats.averageRating.toFixed(2)}</span>
              <span className="text-gray-400">from {stats.totalReviews}+ reviews</span>
            </div>
          </div>
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {reviews.map((review, i) => (
            <Reveal key={review.id} delay={i * 80}>
              <div className="h-full rounded-2xl border border-amber-200/60 bg-white p-7 shadow-sm hover:shadow-lg hover:shadow-black/5 transition-all duration-300 hover:-translate-y-1">
                <Stars rating={review.rating} />
                <h3 className="font-serif text-lg font-semibold text-gray-900 mt-3 mb-2 line-clamp-1">
                  {review.title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed line-clamp-4 mb-4">
                  {review.body}
                </p>
                <div className="mt-auto pt-3 border-t border-gray-100">
                  <p className="text-sm font-medium text-gray-700">{review.reviewerName}</p>
                  {(review.reviewerCity || review.reviewerState) && (
                    <p className="text-xs text-gray-400">
                      {[review.reviewerCity, review.reviewerState].filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={300}>
          <div className="text-center mt-10">
            <Button asChild variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-800">
              <Link href="/reviews">
                See All {stats.totalReviews}+ Reviews
              </Link>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
