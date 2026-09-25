import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Check, ChevronDown, MessageCircle, Phone } from 'lucide-react'
import { siteConfig, telHref } from '@/lib/site-config'
import { SITE_URL } from '@/lib/seo'
import { getTopic, type Block, type Topic } from '@/content/topics'
import BocaBankerAvatar from '@/components/landing/BocaBankerAvatar'
import MobileChatButton from '@/components/landing/MobileChatButton'
import { HeroChatWidget, OpenChatButton, Reveal } from '@/components/landing/LandingClient'
import { Eyebrow, SiteFooter, SiteHeader, primaryBtn, secondaryBtn } from './site'

export function topicMetadata(topic: Topic): Metadata {
  const title = `${topic.title} | Boca Banker`
  return {
    title: topic.title,
    description: topic.description,
    alternates: { canonical: topic.slug },
    openGraph: {
      type: 'article',
      locale: 'en_US',
      siteName: 'Boca Banker',
      url: topic.slug,
      title,
      description: topic.description,
      images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Boca Banker' }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: topic.description,
      images: ['/opengraph-image'],
    },
  }
}

/** Renders "[label](/path)" inline links; everything else is plain text. */
function RichText({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]]+\]\(\/[^)]*\))/g)
  return (
    <>
      {parts.map((part, i) => {
        const m = part.match(/^\[([^\]]+)\]\((\/[^)]*)\)$/)
        return m ? (
          <Link key={i} href={m[2]} className="py-1 font-medium text-gold-dark underline underline-offset-2 hover:text-navy">
            {m[1]}
          </Link>
        ) : (
          part
        )
      })}
    </>
  )
}

function plain(text: string) {
  return text.replace(/\[([^\]]+)\]\(\/[^)]*\)/g, '$1')
}

function ContentBlock({ block }: { block: Block }) {
  if (typeof block === 'string') {
    return (
      <p className="leading-relaxed text-gray-700">
        <RichText text={block} />
      </p>
    )
  }
  if ('list' in block) {
    return (
      <ul className="space-y-3">
        {block.list.map((item) => {
          // "Lead: rest" items get a bold lead-in
          const m = item.match(/^([^:]{2,60}): (.+)$/)
          return (
            <li key={item} className="flex items-start gap-3 leading-relaxed text-gray-700">
              <Check className="mt-1 h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
              <span>
                {m ? (
                  <>
                    <strong className="font-semibold text-navy">{m[1]}:</strong> <RichText text={m[2]} />
                  </>
                ) : (
                  <RichText text={item} />
                )}
              </span>
            </li>
          )
        })}
      </ul>
    )
  }
  if ('steps' in block) {
    return (
      <ol className="space-y-4">
        {block.steps.map((step, i) => (
          <li key={step} className="flex items-start gap-4 leading-relaxed text-gray-700">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy font-serif text-sm text-amber-400">
              {i + 1}
            </span>
            <span className="pt-1">
              <RichText text={step} />
            </span>
          </li>
        ))}
      </ol>
    )
  }
  return (
    <p className="rounded-xl border-l-2 border-gold bg-white px-5 py-4 text-sm leading-relaxed text-navy">
      <RichText text={block.note} />
    </p>
  )
}

export default function TopicPage({ topic, children }: { topic: Topic; children?: React.ReactNode }) {
  const related = topic.related.map(getTopic)
  const url = `${SITE_URL}${topic.slug}`

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${url}#webpage`,
        url,
        name: topic.title,
        description: topic.description,
        isPartOf: { '@id': `${SITE_URL}/#website` },
        about: { '@id': `${SITE_URL}/#organization` },
        inLanguage: 'en-US',
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: topic.cardTitle, item: url },
        ],
      },
      {
        '@type': 'FAQPage',
        '@id': `${url}#faq`,
        mainEntity: topic.faqs.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: plain(f.a) },
        })),
      },
      ...(topic.serviceType
        ? [
            {
              '@type': 'Service',
              '@id': `${url}#service`,
              name: topic.cardTitle,
              serviceType: topic.serviceType,
              description: topic.description,
              provider: { '@id': `${SITE_URL}/#organization` },
              areaServed: [
                { '@type': 'City', name: 'Boca Raton' },
                { '@type': 'AdministrativeArea', name: 'Palm Beach County' },
                { '@type': 'AdministrativeArea', name: 'Broward County' },
              ],
            },
          ]
        : []),
    ],
  }

  return (
    <div className="min-h-screen bg-cream text-navy">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteHeader current={topic.slug} />

      <main>
        {/* ── Hero ── */}
        <section aria-label="Introduction" className="relative overflow-hidden px-4 sm:px-6 pt-28 pb-14 sm:pt-36 sm:pb-20">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-32 right-[-10%] h-[520px] w-[520px] rounded-full bg-amber-100/60 blur-[100px]"
          />
          <div className="relative mx-auto max-w-3xl text-center">
            <nav aria-label="Breadcrumb" className="mb-6 text-sm text-gray-500">
              {/* Inline link: the vertical padding widens its tap area without shifting layout */}
              <Link href="/" className="py-2.5 hover:text-navy">Home</Link>
              <span aria-hidden="true" className="mx-2">/</span>
              <span className="text-navy">{topic.cardTitle}</span>
            </nav>
            <Eyebrow>{topic.eyebrow}</Eyebrow>
            <h1 className="font-serif text-4xl leading-[1.08] tracking-tight text-navy sm:text-5xl">{topic.h1}</h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-gray-600 sm:text-lg">{topic.intro}</p>
            <div data-chat-cta className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <OpenChatButton prompt={topic.chatPrompt} className={primaryBtn}>
                <MessageCircle className="h-5 w-5" />
                {topic.ctaLabel}
              </OpenChatButton>
              {siteConfig.phone && (
                <a href={telHref(siteConfig.phone)} className={secondaryBtn}>
                  <Phone className="h-5 w-5 text-gold" />
                  Call {siteConfig.phone}
                </a>
              )}
            </div>
          </div>
        </section>

        {/* ── Page-specific tool (e.g. the calculator) ── */}
        {children && <section className="px-4 sm:px-6 pb-16">{children}</section>}

        {/* ── Highlights ── */}
        {topic.highlights && (
          <section aria-label="Key points" className="border-y border-gray-200 bg-white px-4 sm:px-6 py-12">
            <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
              {topic.highlights.map((h) => (
                <div key={h.title} className="border-t-2 border-gold pt-5">
                  <h2 className="text-lg font-semibold text-navy">{h.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">{h.desc}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Article ── */}
        <article className="px-4 sm:px-6 py-16 sm:py-20">
          <div className="mx-auto max-w-3xl space-y-14">
            {topic.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="font-serif text-2xl text-navy sm:text-3xl">{section.heading}</h2>
                <div className="mt-5 space-y-5">
                  {section.blocks.map((block, i) => (
                    <ContentBlock key={i} block={block} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </article>

        {/* ── FAQ ── */}
        <section id="faq" aria-label="Frequently asked questions" className="scroll-mt-20 border-t border-gray-200 bg-white px-4 sm:px-6 py-16 sm:py-20">
          <div className="mx-auto max-w-3xl">
            <div className="mb-8 text-center">
              <Eyebrow>FAQ</Eyebrow>
              <h2 className="font-serif text-3xl text-navy sm:text-4xl">Common questions</h2>
            </div>
            <div className="divide-y divide-gray-200 border-y border-gray-200">
              {topic.faqs.map((faq) => (
                <details key={faq.q} className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-left font-semibold text-navy [&::-webkit-details-marker]:hidden">
                    <h3>{faq.q}</h3>
                    <ChevronDown className="h-5 w-5 shrink-0 text-gray-400 transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="pb-5 pr-9 text-sm leading-relaxed text-gray-600">
                    <RichText text={faq.a} />
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── Ask (live chat on desktop) ── */}
        <section id="ask" aria-label="Ask a question" className="scroll-mt-20 bg-navy px-4 sm:px-6 py-16 sm:py-20">
          <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-14">
            <div className="text-center lg:text-left">
              <BocaBankerAvatar size={72} className="mx-auto lg:mx-0" />
              <h2 className="mt-6 font-serif text-3xl leading-tight text-white sm:text-4xl">
                Have a question about your situation?
              </h2>
              <p className="mx-auto mt-4 max-w-md text-white/70 lg:mx-0">
                Ask Boca Banker’s AI assistant and get an answer in seconds. When you’re ready, share your
                contact details in the chat and Boca Banker follows up personally.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
                <OpenChatButton
                  prompt={topic.chatPrompt}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-7 py-3.5 font-semibold text-navy transition-colors hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-navy"
                >
                  <MessageCircle className="h-5 w-5" />
                  {topic.ctaLabel}
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
            <div className="hidden lg:block min-w-0">
              <div className="rounded-[28px] bg-white/10 p-2.5">
                <HeroChatWidget />
              </div>
            </div>
          </div>
        </section>

        {/* ── Related ── */}
        <section aria-label="Related guides" className="px-4 sm:px-6 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <h2 className="mb-8 text-center font-serif text-3xl text-navy">Keep reading</h2>
            <div className="grid gap-5 md:grid-cols-3">
              {related.map((r) => (
                <Reveal key={r.slug}>
                  <Link
                    href={r.slug}
                    className="group flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-6 transition-colors hover:border-navy/40"
                  >
                    <h3 className="font-serif text-xl text-navy">{r.cardTitle}</h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-600">{r.cardDesc}</p>
                    <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-gold-dark group-hover:text-navy">
                      Read more
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </Link>
                </Reveal>
              ))}
            </div>
            <p className="mt-10 text-center text-sm text-gray-600">
              See what clients say in{' '}
              <Link href="/reviews" className="py-2.5 font-semibold text-gold-dark hover:text-navy">
                Boca Banker’s reviews
              </Link>
              .
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
      <MobileChatButton />
    </div>
  )
}
