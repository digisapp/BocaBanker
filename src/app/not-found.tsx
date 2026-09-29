import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { topicLinks } from '@/content/topics'
import BocaBankerAvatar from '@/components/landing/BocaBankerAvatar'
import { Eyebrow, primaryBtn, secondaryBtn } from '@/components/marketing/site'

export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false, follow: true },
}

// Site-wide 404. It uses a plain header/footer rather than SiteHeader/SiteFooter:
// their "Ask" buttons need a chat widget mounted on the page, and a 404 shouldn't
// load the chat bundle.
export default function NotFound() {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-cream text-navy">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 right-[-10%] h-[520px] w-[520px] rounded-full bg-amber-100/60 blur-[100px]"
      />

      <header className="relative mx-auto flex h-16 w-full max-w-6xl items-center px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
        >
          <BocaBankerAvatar size={36} />
          <span className="font-serif text-xl text-navy">Boca Banker</span>
        </Link>
      </header>

      <main className="relative flex flex-1 items-center justify-center px-4 py-16 sm:px-6">
        <div className="mx-auto w-full max-w-xl text-center">
          <div className="flex justify-center">
            <BocaBankerAvatar size={88} priority />
          </div>
          <Eyebrow className="mt-8">Error 404</Eyebrow>
          <h1 className="font-serif text-4xl leading-[1.1] tracking-tight text-navy text-balance sm:text-5xl">
            We couldn’t find that page
          </h1>
          <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-gray-600 sm:text-lg">
            The link may be out of date, or the page may have moved. Let’s get you back on track.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/" className={primaryBtn}>
              <ArrowLeft className="h-5 w-5" />
              Back to home
            </Link>
            <Link href="/reviews" className={secondaryBtn}>
              <Star className="h-5 w-5 text-gold" />
              Read client reviews
            </Link>
          </div>

          <nav aria-label="Guides" className="mt-12 border-t border-gray-200 pt-8">
            <p className="text-sm font-semibold text-navy">Or start with a guide</p>
            <ul className="mt-4 flex flex-wrap justify-center gap-2">
              {topicLinks.map((t) => (
                <li key={t.slug}>
                  <Link
                    href={t.slug}
                    className={cn(
                      'group inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-navy transition-colors',
                      'hover:border-navy/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2'
                    )}
                  >
                    {t.navLabel}
                    <ArrowRight className="h-3.5 w-3.5 text-gold-dark transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </main>

      <footer className="relative border-t border-gray-200 px-4 py-6 text-center text-xs text-gray-500 sm:px-6">
        &copy; {new Date().getFullYear()} Boca Banker · Serving clients nationwide
      </footer>
    </div>
  )
}
