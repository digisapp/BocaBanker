import type { Metadata } from 'next'
import Link from 'next/link'
import { and, avg, count, desc, eq } from 'drizzle-orm'
import {
  ArrowRight,
  Building2,
  Check,
  ChevronDown,
  Home as HomeIcon,
  MessageCircle,
  Phone,
  RefreshCw,
  Star,
} from 'lucide-react'
import { db } from '@/db'
import { reviews } from '@/db/schema'
import { logger } from '@/lib/logger'
import { cn } from '@/lib/utils'
import { siteConfig, telHref } from '@/lib/site-config'
import { SITE_URL, SITE_TITLE, SITE_DESCRIPTION } from '@/lib/seo'
import BocaBankerAvatar from '@/components/landing/BocaBankerAvatar'
import MobileChatButton from '@/components/landing/MobileChatButton'
import { Reveal, LandingNav, OpenChatButton, HeroChatWidget } from '@/components/landing/LandingClient'
import { Eyebrow, SiteFooter, primaryBtn, secondaryBtn } from '@/components/marketing/site'

// Server component: static marketing markup ships as HTML; interactive bits
// (scroll reveal, nav shadow, chat) are client islands. Reviews are read at
// render time and cached, so they're in the HTML and don't pop in.
export const revalidate = 300

export const metadata: Metadata = {
  alternates: { canonical: '/' },
}

/* ─── Data ─── */

const paths = [
  {
    icon: HomeIcon,
    title: 'Buying a home',
    href: '/first-time-homebuyer',
    desc: 'First home or fifth, find the loan program that fits and know your payment before you make an offer.',
    points: ['Conventional, FHA, VA & jumbo', 'Pre-approval guidance', 'Payment estimates at today’s rates'],
    cta: 'Ask about buying',
    prompt: "I'm looking to buy a home in South Florida. Which loan programs should I be considering?",
  },
  {
    icon: RefreshCw,
    title: 'Refinancing',
    href: '/refinance',
    desc: 'Find out whether a refinance actually pays off for you, and how long it takes to earn back the closing costs.',
    points: ['Break-even on closing costs', 'Rate-and-term vs. cash-out', 'Shorter term vs. lower payment'],
    cta: 'Ask about refinancing',
    prompt: 'Does it make sense for me to refinance my mortgage? What should I look at?',
  },
  {
    icon: Building2,
    title: 'Investment property',
    href: '/investors',
    desc: 'Finance the next property and keep more of its income with accelerated depreciation.',
    points: ['DSCR & investor loans', 'Cost segregation estimates', 'Bonus depreciation projections'],
    cta: 'Ask about investing',
    prompt: 'I own an investment property. How much could a cost segregation study save me in taxes?',
  },
]

const steps = [
  {
    title: 'Ask anything',
    desc: 'Rates, programs, refinancing, cost segregation. No signup, no forms, any hour of the day.',
  },
  {
    title: 'Get real numbers',
    desc: 'Payment estimates, break-even math, and tax savings projections based on your situation.',
  },
  {
    title: 'Work with Boca Banker',
    desc: 'When you’re ready, share your contact details in the chat and he follows up with you personally.',
  },
]

const faqs = [
  {
    q: 'Am I chatting with a real person?',
    a: 'The chat is Boca Banker’s AI assistant, built on his 40+ years of South Florida lending experience. It answers questions and runs estimates instantly, day or night. When you’re ready to move forward, share your contact details in the chat and Boca Banker follows up with you personally.',
  },
  {
    q: 'What mortgage options are available in South Florida?',
    a: 'Conventional, FHA, VA, and jumbo loans for high-value homes, DSCR loans for investors, and commercial financing. The right fit depends on your credit, down payment, property type, and plans. Ask in the chat and you’ll get a recommendation for your situation.',
  },
  {
    q: 'Are the chat’s answers a loan offer or tax advice?',
    a: 'No. Estimates are for education only and are not a loan commitment, rate quote, or rate lock. Final terms depend on a full application. For cost segregation and tax questions, confirm the numbers with your CPA or tax advisor.',
  },
  {
    q: 'What is cost segregation?',
    a: 'A tax strategy that speeds up depreciation on investment and commercial real estate by reclassifying building components into shorter recovery periods (5, 7, or 15 years instead of 27.5 or 39). The result is larger deductions in the first years of ownership.',
  },
  {
    q: 'How much can a cost segregation study save?',
    a: 'Typically 15% to 40% of a property’s depreciable basis can be accelerated into the first few years. On a $1M property, that’s roughly $150,000 to $400,000 in accelerated deductions. The chat gives you an instant estimate for your property.',
  },
  {
    q: 'What types of properties qualify for cost segregation?',
    a: 'Almost any income-producing property: residential rentals, multifamily, office, retail, warehouses, hotels, restaurants, and mixed-use. Properties with a basis of about $500K or more usually see the most meaningful savings.',
  },
]

interface ReviewSummary {
  latest: {
    id: string
    reviewerName: string
    reviewerCity: string | null
    reviewerState: string | null
    rating: number
    title: string
    body: string
  }[]
  total: number
  average: number
}

async function getReviewSummary(): Promise<ReviewSummary> {
  try {
    const approved = eq(reviews.status, 'approved')
    const [latest, [agg]] = await Promise.all([
      db
        .select({
          id: reviews.id,
          reviewerName: reviews.reviewerName,
          reviewerCity: reviews.reviewerCity,
          reviewerState: reviews.reviewerState,
          rating: reviews.rating,
          title: reviews.title,
          body: reviews.body,
        })
        .from(reviews)
        .where(and(approved, eq(reviews.rating, 5)))
        .orderBy(desc(reviews.reviewDate))
        .limit(3),
      db.select({ total: count(), average: avg(reviews.rating) }).from(reviews).where(approved),
    ])
    return { latest, total: agg?.total ?? 0, average: agg?.average ? Number(agg.average) : 0 }
  } catch (error) {
    logger.error('landing', 'Failed to load reviews for homepage', error)
    return { latest: [], total: 0, average: 0 }
  }
}

/* ─── Small pieces ─── */

function Stars({ rating, className }: { rating: number; className?: string }) {
  return (
    <div className="flex gap-0.5" role="img" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          aria-hidden="true"
          className={cn(
            'h-4 w-4',
            i < Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-300',
            className
          )}
        />
      ))}
    </div>
  )
}

/* ─── Page ─── */

export default async function Home() {
  const reviewSummary = await getReviewSummary()
  const hasReviews = reviewSummary.total > 0
  const bankerName = siteConfig.ownerName || 'Boca Banker'

  const stats = [
    { value: '$2B+', label: 'in loans closed' },
    { value: '40+', label: 'years in Boca Raton lending' },
    { value: '500+', label: 'cost segregation studies' },
    ...(hasReviews
      ? [{ value: `${reviewSummary.average.toFixed(1)}★`, label: `from ${reviewSummary.total} client reviews` }]
      : []),
  ]

  const pageJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${SITE_URL}/#webpage`,
        url: SITE_URL,
        name: SITE_TITLE,
        description: SITE_DESCRIPTION,
        isPartOf: { '@id': `${SITE_URL}/#website` },
        about: { '@id': `${SITE_URL}/#organization` },
        primaryImageOfPage: `${SITE_URL}/og-headshot.jpg`,
        inLanguage: 'en-US',
      },
      {
        '@type': 'FAQPage',
        '@id': `${SITE_URL}/#faq`,
        mainEntity: faqs.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
    ],
  }

  return (
    <div className="min-h-screen bg-cream text-navy">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pageJsonLd) }}
      />

      {/* ── NAV ── */}
      <header>
        <LandingNav>
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
            <Link href="/" className="flex items-center gap-2.5">
              <BocaBankerAvatar size={36} priority />
              <span className="font-serif text-xl text-navy">Boca Banker</span>
            </Link>
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="hidden md:flex items-center gap-1 text-sm text-gray-600">
                {siteConfig.bankerPhoto && (
                  <a href="#banker" className="rounded-lg px-3 py-2 hover:text-navy">About</a>
                )}
                <a href="#how-it-works" className="rounded-lg px-3 py-2 hover:text-navy">How it works</a>
                <a href="#reviews" className="rounded-lg px-3 py-2 hover:text-navy">Reviews</a>
                <a href="#faq" className="rounded-lg px-3 py-2 hover:text-navy">FAQ</a>
              </div>
              {siteConfig.phone && (
                <a
                  href={telHref(siteConfig.phone)}
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-navy hover:bg-white"
                >
                  <Phone className="h-4 w-4 text-gold" />
                  {siteConfig.phone}
                </a>
              )}
              <OpenChatButton className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy-light">
                <MessageCircle className="h-4 w-4" />
                Ask a question
              </OpenChatButton>
            </div>
          </div>
        </LandingNav>
      </header>

      <main>
        {/* ══════════ HERO ══════════ */}
        <section aria-label="Introduction" className="relative overflow-hidden px-4 sm:px-6 pt-28 pb-16 sm:pt-36 sm:pb-24">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-32 right-[-10%] h-[520px] w-[520px] rounded-full bg-amber-100/60 blur-[100px]"
          />
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
            <div className="text-center lg:text-left">
              <Eyebrow>Boca Raton · Mortgage &amp; real estate finance</Eyebrow>
              <h1 className="font-serif text-4xl leading-[1.08] tracking-tight text-navy sm:text-5xl lg:text-6xl">
                Straight answers on South Florida mortgages.
              </h1>
              <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-gray-600 sm:text-lg lg:mx-0">
                Home loans, refinancing, and cost segregation for investors, from a banker with
                40+ years in Boca Raton. Ask his AI assistant anything, any hour. When you’re ready,
                he takes it from there personally.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
                <OpenChatButton className={primaryBtn}>
                  <MessageCircle className="h-5 w-5" />
                  Ask a question
                </OpenChatButton>
                {siteConfig.phone ? (
                  <a href={telHref(siteConfig.phone)} className={secondaryBtn}>
                    <Phone className="h-5 w-5 text-gold" />
                    Call {siteConfig.phone}
                  </a>
                ) : (
                  <a href="#paths" className={secondaryBtn}>
                    See how he can help
                    <ArrowRight className="h-4 w-4" />
                  </a>
                )}
              </div>

              <div className="mt-10 flex items-center justify-center gap-4 lg:justify-start">
                {siteConfig.bankerPhoto ? (
                  <BocaBankerAvatar size={56} src={siteConfig.bankerPhoto} alt={bankerName} />
                ) : (
                  <BocaBankerAvatar size={56} />
                )}
                <div className="text-left">
                  <p className="text-sm font-semibold text-navy">
                    {bankerName}
                    {siteConfig.nmlsId && (
                      <span className="font-normal text-gray-500"> · NMLS #{siteConfig.nmlsId}</span>
                    )}
                  </p>
                  {hasReviews ? (
                    <a href="#reviews" className="mt-0.5 flex items-center gap-2 text-sm text-gray-600 hover:text-navy">
                      <Stars rating={reviewSummary.average} />
                      <span>
                        {reviewSummary.average.toFixed(1)} from {reviewSummary.total} client reviews
                      </span>
                    </a>
                  ) : (
                    <p className="mt-0.5 text-sm text-gray-600">40+ years in Boca Raton lending</p>
                  )}
                </div>
              </div>
            </div>

            {/* Live chat (desktop only — mobile opens a fullscreen overlay) */}
            <Reveal delay={150} className="hidden lg:block min-w-0">
              <div className="rounded-[28px] bg-navy p-2.5 shadow-2xl shadow-navy/25">
                <HeroChatWidget />
              </div>
            </Reveal>
          </div>
        </section>

        {/* ══════════ TRUST STRIP ══════════ */}
        <section aria-label="Track record" className="border-y border-gray-200 bg-white px-4 sm:px-6 py-10 sm:py-12">
          <dl
            className={cn(
              'mx-auto grid max-w-5xl grid-cols-2 gap-x-6 gap-y-8 text-center',
              stats.length === 4 ? 'md:grid-cols-4' : 'md:grid-cols-3'
            )}
          >
            {stats.map((s) => (
              <div key={s.label}>
                <dt className="sr-only">{s.label}</dt>
                <dd className="font-serif text-3xl text-navy sm:text-4xl">{s.value}</dd>
                <dd className="mt-1 text-sm text-gray-500">{s.label}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ══════════ MEET YOUR BANKER ══════════ */}
        {siteConfig.bankerPhoto && (
          <section id="banker" aria-label="Meet your banker" className="scroll-mt-20 px-4 sm:px-6 pt-20 sm:pt-24">
            <Reveal>
              <div className="mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-[auto_1fr] md:gap-14">
                <BocaBankerAvatar
                  size={240}
                  src={siteConfig.bankerPhoto}
                  alt={bankerName}
                  className="mx-auto"
                />
                <div className="text-center md:text-left">
                  <Eyebrow>Meet your banker</Eyebrow>
                  <h2 className="font-serif text-3xl text-navy sm:text-4xl">
                    {siteConfig.ownerName || 'The banker behind Boca Banker'}
                  </h2>
                  {siteConfig.nmlsId && (
                    <p className="mt-2 text-sm text-gray-500">NMLS #{siteConfig.nmlsId}</p>
                  )}
                  <p className="mx-auto mt-5 max-w-xl leading-relaxed text-gray-600 md:mx-0">
                    Boca Banker’s AI assistant is built on more than 40 years of Boca Raton lending,
                    over $2B in closed loans and 500+ cost segregation studies. The assistant handles
                    the questions and the math, any hour. When you’re ready to move forward, you work
                    with {siteConfig.ownerName ? siteConfig.ownerName.split(' ')[0] : 'him'} directly.
                  </p>
                  <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center md:justify-start">
                    <OpenChatButton className={primaryBtn}>
                      <MessageCircle className="h-5 w-5" />
                      Ask a question
                    </OpenChatButton>
                    {siteConfig.phone && (
                      <a href={telHref(siteConfig.phone)} className={secondaryBtn}>
                        <Phone className="h-5 w-5 text-gold" />
                        Call {siteConfig.phone}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </Reveal>
          </section>
        )}

        {/* ══════════ REVIEWS ══════════ */}
        {reviewSummary.latest.length > 0 && (
          <section id="reviews" aria-label="Client reviews" className="scroll-mt-20 px-4 sm:px-6 py-20 sm:py-24">
            <div className="mx-auto max-w-6xl">
              <Reveal>
                <div className="mb-12 flex flex-col items-center gap-4 text-center sm:flex-row sm:items-end sm:justify-between sm:text-left">
                  <div>
                    <Eyebrow>Client reviews</Eyebrow>
                    <h2 className="font-serif text-3xl text-navy sm:text-4xl">What clients say</h2>
                  </div>
                  <Link
                    href="/reviews"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-gold-dark hover:text-navy"
                  >
                    Read all {reviewSummary.total} reviews
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </Reveal>

              <div className="grid gap-5 md:grid-cols-3">
                {reviewSummary.latest.map((review, i) => (
                  <Reveal key={review.id} delay={i * 80}>
                    <figure className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-6 sm:p-7">
                      <Stars rating={review.rating} />
                      <blockquote className="mt-4 flex-1">
                        <p className="font-serif text-lg leading-snug text-navy line-clamp-2">
                          {review.title}
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-gray-600 line-clamp-5">
                          {review.body}
                        </p>
                      </blockquote>
                      <figcaption className="mt-5 border-t border-gray-100 pt-4">
                        <p className="text-sm font-semibold text-navy">{review.reviewerName}</p>
                        {(review.reviewerCity || review.reviewerState) && (
                          <p className="text-xs text-gray-500">
                            {[review.reviewerCity, review.reviewerState].filter(Boolean).join(', ')}
                          </p>
                        )}
                      </figcaption>
                    </figure>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ══════════ PATHS ══════════ */}
        <section id="paths" aria-label="How he can help" className="scroll-mt-20 bg-white px-4 sm:px-6 py-20 sm:py-24 border-y border-gray-200">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <div className="mx-auto mb-12 max-w-2xl text-center">
                <Eyebrow>How he can help</Eyebrow>
                <h2 className="font-serif text-3xl text-navy sm:text-4xl">Start with where you are</h2>
                <p className="mt-4 text-gray-600">
                  Pick a topic and the conversation starts with your question already asked.
                </p>
              </div>
            </Reveal>

            <div className="grid gap-5 md:grid-cols-3">
              {paths.map((p, i) => (
                <Reveal key={p.title} delay={i * 80}>
                  <div className="flex h-full flex-col rounded-2xl border border-gray-200 bg-cream p-6 sm:p-7">
                    <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-navy text-amber-400">
                      <p.icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-serif text-2xl text-navy">{p.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-gray-600">{p.desc}</p>
                    <ul className="mt-5 flex-1 space-y-2">
                      {p.points.map((point) => (
                        <li key={point} className="flex items-start gap-2 text-sm text-navy">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                          {point}
                        </li>
                      ))}
                    </ul>
                    <Link
                      href={p.href}
                      className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-gold-dark hover:text-navy"
                    >
                      Read the guide
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <OpenChatButton
                      prompt={p.prompt}
                      className="mt-4 inline-flex items-center justify-between gap-2 rounded-xl border border-navy/15 bg-white px-4 py-3 text-sm font-semibold text-navy transition-colors hover:border-navy hover:bg-navy hover:text-white"
                    >
                      {p.cta}
                      <ArrowRight className="h-4 w-4" />
                    </OpenChatButton>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════ HOW IT WORKS ══════════ */}
        <section id="how-it-works" aria-label="How it works" className="scroll-mt-20 px-4 sm:px-6 py-20 sm:py-24">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <div className="mb-12 text-center">
                <Eyebrow>How it works</Eyebrow>
                <h2 className="font-serif text-3xl text-navy sm:text-4xl">From question to closing</h2>
              </div>
            </Reveal>

            <ol className="grid gap-8 md:grid-cols-3 md:gap-6">
              {steps.map((step, i) => (
                <Reveal key={step.title} delay={i * 100}>
                  <li className="relative border-t-2 border-gold pt-6">
                    <span className="font-serif text-4xl text-gold">{String(i + 1).padStart(2, '0')}</span>
                    <h3 className="mt-3 text-lg font-semibold text-navy">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-gray-600">{step.desc}</p>
                  </li>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        {/* ══════════ FAQ ══════════ */}
        <section id="faq" aria-label="Frequently asked questions" className="scroll-mt-20 bg-white px-4 sm:px-6 py-20 sm:py-24 border-t border-gray-200">
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <div className="mb-10 text-center">
                <Eyebrow>FAQ</Eyebrow>
                <h2 className="font-serif text-3xl text-navy sm:text-4xl">Common questions</h2>
              </div>
            </Reveal>

            <div className="divide-y divide-gray-200 border-y border-gray-200">
              {faqs.map((faq) => (
                <details key={faq.q} className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-left font-semibold text-navy [&::-webkit-details-marker]:hidden">
                    <span>{faq.q}</span>
                    <ChevronDown className="h-5 w-5 shrink-0 text-gray-400 transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="pb-5 pr-9 text-sm leading-relaxed text-gray-600">{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════ CTA ══════════ */}
        <section aria-label="Get started" className="bg-navy px-4 sm:px-6 py-20 sm:py-24">
          <Reveal>
            <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
              <BocaBankerAvatar size={88} />
              <h2 className="mt-6 font-serif text-3xl leading-tight text-white sm:text-4xl">
                Have a question about your next loan?
              </h2>
              <p className="mt-4 max-w-xl text-white/70">
                Ask now and get an answer in seconds. No signup, no pressure.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <OpenChatButton className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-7 py-3.5 font-semibold text-navy transition-colors hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-navy">
                  <MessageCircle className="h-5 w-5" />
                  Ask a question
                </OpenChatButton>
                {siteConfig.phone && (
                  <a
                    href={telHref(siteConfig.phone)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 px-7 py-3.5 font-semibold text-white transition-colors hover:bg-white/10"
                  >
                    <Phone className="h-5 w-5" />
                    {siteConfig.phone}
                  </a>
                )}
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <SiteFooter />

      {/* Mobile floating chat button + fullscreen overlay */}
      <MobileChatButton />
    </div>
  )
}
