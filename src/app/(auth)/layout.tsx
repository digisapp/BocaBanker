import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-cream text-navy">
      {/* Same warm glow as the homepage hero */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 right-[-10%] h-[520px] w-[520px] rounded-full bg-amber-100/60 blur-[100px]"
      />

      <header className="relative mx-auto flex h-16 w-full max-w-6xl items-center px-4 sm:px-6">
        <Link
          href="/"
          className="-mx-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Boca Banker home
        </Link>
      </header>

      <main className="relative flex flex-1 items-center justify-center px-4 pb-16 pt-2 sm:px-6 sm:pt-6">
        {children}
      </main>
    </div>
  )
}
