import Link from 'next/link'
import { Mail, MessageCircle, Phone } from 'lucide-react'
import { cn } from '@/lib/utils'
import { siteConfig, telHref } from '@/lib/site-config'
import { topicLinks } from '@/content/topics'
import BocaBankerAvatar from '@/components/landing/BocaBankerAvatar'
import { LandingNav, OpenChatButton } from '@/components/landing/LandingClient'

// Server-rendered building blocks shared by the homepage and the topic pages.

export const primaryBtn =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-navy px-6 py-3.5 text-sm sm:text-base font-semibold text-white shadow-lg shadow-navy/20 transition-colors hover:bg-navy-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2'
export const secondaryBtn =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-6 py-3.5 text-sm sm:text-base font-semibold text-navy transition-colors hover:border-navy/40 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2'

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn('text-xs font-semibold tracking-[0.18em] uppercase text-balance text-gold-dark mb-3', className)}>
      {children}
    </p>
  )
}

export function bankerName() {
  return siteConfig.ownerName || 'Boca Banker'
}

/**
 * Call and Ask buttons at the right of the nav. On phones the call button is
 * icon-only, and when it's shown "Ask a question" shortens to "Ask" so both fit.
 */
export function NavCallAsk() {
  return (
    <>
      {siteConfig.phone && (
        <a
          href={telHref(siteConfig.phone)}
          aria-label={`Call ${siteConfig.phone}`}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-navy hover:bg-white sm:h-9 sm:w-auto sm:gap-1.5 sm:px-3 sm:text-sm sm:font-medium"
        >
          <Phone className="h-4 w-4 text-gold" />
          <span className="hidden sm:inline">{siteConfig.phone}</span>
        </a>
      )}
      <OpenChatButton className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-navy px-4 text-sm font-semibold text-white transition-colors hover:bg-navy-light sm:h-9">
        <MessageCircle className="h-4 w-4" />
        {siteConfig.phone ? (
          <>
            <span className="sm:hidden">Ask</span>
            <span className="hidden sm:inline">Ask a question</span>
          </>
        ) : (
          'Ask a question'
        )}
      </OpenChatButton>
    </>
  )
}

/** Header for inner pages: logo, topic links, and the Call/Ask buttons. */
export function SiteHeader({ current }: { current?: string }) {
  return (
    <header>
      <LandingNav>
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <BocaBankerAvatar size={36} priority />
            <span className="font-serif text-xl text-navy">Boca Banker</span>
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="hidden lg:flex items-center gap-1 text-sm text-gray-600">
              {topicLinks.map((t) => (
                <Link
                  key={t.slug}
                  href={t.slug}
                  aria-current={t.slug === current ? 'page' : undefined}
                  className={cn(
                    'rounded-lg px-3 py-2 hover:text-navy',
                    t.slug === current && 'font-semibold text-navy'
                  )}
                >
                  {t.navLabel}
                </Link>
              ))}
            </div>
            <NavCallAsk />
          </div>
        </div>
      </LandingNav>
    </header>
  )
}

// Footer links get 36px-tall rows on phones; from md up they keep the compact spacing.
const footerList = 'flex flex-col text-sm text-gray-600 md:gap-2.5'
const footerItem = 'py-2 md:py-0'

export function SiteFooter() {
  const name = bankerName()
  return (
    <footer className="border-t border-gray-200 bg-cream px-4 sm:px-6 pt-14 pb-24 lg:pb-14">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="mb-4 flex items-center gap-2.5">
              <BocaBankerAvatar size={32} />
              <span className="font-serif text-lg text-navy">Boca Banker</span>
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-gray-600">
              Mortgage and real estate finance guidance backed by 40+ years of Boca Raton banking.
              Home loans, refinancing, and cost segregation.
            </p>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold text-navy">Loans &amp; tools</h3>
            <nav aria-label="Loans and tools" className={footerList}>
              {topicLinks.map((t) => (
                <Link key={t.slug} href={t.slug} className={cn(footerItem, 'hover:text-navy')}>
                  {t.footerLabel}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold text-navy">Explore</h3>
            <nav aria-label="Footer navigation" className={footerList}>
              <Link href="/#paths" className={cn(footerItem, 'hover:text-navy')}>How he can help</Link>
              <Link href="/#how-it-works" className={cn(footerItem, 'hover:text-navy')}>How it works</Link>
              <Link href="/#faq" className={cn(footerItem, 'hover:text-navy')}>FAQ</Link>
              <Link href="/reviews" className={cn(footerItem, 'hover:text-navy')}>Reviews</Link>
            </nav>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold text-navy">Contact</h3>
            <div className={footerList}>
              {siteConfig.phone && (
                <a href={telHref(siteConfig.phone)} className={cn(footerItem, 'inline-flex items-center gap-2 hover:text-navy')}>
                  <Phone className="h-4 w-4 text-gold" />
                  {siteConfig.phone}
                </a>
              )}
              {siteConfig.email && (
                <a href={`mailto:${siteConfig.email}`} className={cn(footerItem, 'inline-flex items-center gap-2 hover:text-navy')}>
                  <Mail className="h-4 w-4 text-gold" />
                  {siteConfig.email}
                </a>
              )}
              <OpenChatButton className={cn(footerItem, 'inline-flex items-center gap-2 text-left hover:text-navy')}>
                <MessageCircle className="h-4 w-4 text-gold" />
                Ask in the chat
              </OpenChatButton>
              <p className={cn(footerItem, 'text-gray-500')}>Boca Raton, FL</p>
            </div>
          </div>
        </div>

        <div className="mt-12 space-y-3 border-t border-gray-200 pt-6 text-xs leading-relaxed text-gray-500">
          <p>
            <span className="font-semibold text-gray-600">Equal Housing Opportunity.</span>
            {siteConfig.nmlsId && <> {name}, NMLS #{siteConfig.nmlsId}.</>}{' '}
            Chat responses are generated by AI for general information only. They are not a loan
            commitment, rate quote, or offer to lend, and are not tax, legal, or financial advice.
            All loans are subject to credit approval and underwriting. Loan program requirements are
            set by the agencies and investors behind them and can change.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p>&copy; {new Date().getFullYear()} Boca Banker. All rights reserved.</p>
            <Link href="/login" className="-my-2.5 self-start py-2.5 hover:text-navy">Sign in</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
