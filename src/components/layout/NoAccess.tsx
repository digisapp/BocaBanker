'use client'

import { Loader2, LogOut } from 'lucide-react'
import BocaBankerAvatar from '@/components/landing/BocaBankerAvatar'

interface NoAccessProps {
  email?: string | null
  signingOut: boolean
  onSignOut: () => void
}

/**
 * Full-screen stand-in for the dashboard when a signed-in account isn't the
 * owner. Every data API already answers 403 for these accounts, so showing the
 * shell would only produce a wall of errors.
 */
export default function NoAccess({ email, signingOut, onSignOut }: NoAccessProps) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-cream px-4 py-16 text-navy sm:px-6">
      {/* Same warm glow as the sign-in page */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 right-[-10%] h-[520px] w-[520px] rounded-full bg-amber-100/60 blur-[100px]"
      />

      <div
        role="alert"
        className="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white px-6 py-8 text-center shadow-xl shadow-navy/5 sm:px-8 sm:py-10"
      >
        <div className="flex justify-center">
          <BocaBankerAvatar size={64} priority />
        </div>
        <h1 className="mt-5 font-serif text-2xl leading-tight text-navy sm:text-3xl">
          This account doesn&apos;t have access to Boca Banker
        </h1>
        <p className="mt-3 text-sm text-gray-600">
          {email ? (
            <>
              You&apos;re signed in as{' '}
              <span className="font-medium break-all text-navy">{email}</span>.{' '}
            </>
          ) : null}
          The dashboard is only available to the owner&apos;s account.
        </p>

        <button
          type="button"
          onClick={onSignOut}
          disabled={signingOut}
          className="mt-8 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-navy px-6 text-sm font-semibold text-white shadow-lg shadow-navy/20 transition-colors hover:bg-navy-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:text-base"
        >
          {signingOut ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing out...
            </>
          ) : (
            <>
              <LogOut className="h-4 w-4" />
              Sign out
            </>
          )}
        </button>
      </div>
    </div>
  )
}
