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
    <p className={cn('text-xs font-semibold tracking-[0.18em] uppercase text-gold-dark mb-3', className)}>
      {children}
    </p>
  )
}

export function bankerName() {
  return siteConfig.ownerName || 'Boca Banker'
}

/** Header for inner pages: logo, topic links, and the Ask button. */
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
            <OpenChatButton className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy-light">
              <MessageCircle className="h-4 w-4" />
              Ask a question
            </OpenChatButton>
          </div>
        </div>
      </LandingNav>
    </header>
  )
}

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
            <nav aria-label="Loans and tools" className="flex flex-col gap-2.5 text-sm text-gray-600">
              {topicLinks.map((t) => (
                <Link key={t.slug} href={t.slug} className="hover:text-navy">
                  {t.footerLabel}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold text-navy">Explore</h3>
            <nav aria-label="Footer navigation" className="flex flex-col gap-2.5 text-sm text-gray-600">
              <Link href="/#paths" className="hover:text-navy">How he can help</Link>
              <Link href="/#how-it-works" className="hover:text-navy">How it works</Link>
              <Link href="/#faq" className="hover:text-navy">FAQ</Link>
              <Link href="/reviews" className="hover:text-navy">Reviews</Link>
            </nav>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold text-navy">Contact</h3>
            <div className="flex flex-col gap-2.5 text-sm text-gray-600">
              {siteConfig.phone && (
                <a href={telHref(siteConfig.phone)} className="inline-flex items-center gap-2 hover:text-navy">
                  <Phone className="h-4 w-4 text-gold" />
                  {siteConfig.phone}
                </a>
              )}
              {siteConfig.email && (
                <a href={`mailto:${siteConfig.email}`} className="inline-flex items-center gap-2 hover:text-navy">
                  <Mail className="h-4 w-4 text-gold" />
                  {siteConfig.email}
                </a>
              )}
              <OpenChatButton className="inline-flex items-center gap-2 text-left hover:text-navy">
                <MessageCircle className="h-4 w-4 text-gold" />
                Ask in the chat
              </OpenChatButton>
              <p className="text-gray-500">Boca Raton, FL</p>
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
            <Link href="/login" className="hover:text-navy">Sign in</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
