'use client'

import { useEffect } from 'react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Dashboard error:', error)
  }, [error])

  return (
    <div className="flex items-center justify-center h-64 px-4">
      <div className="text-center max-w-md">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 mx-auto mb-3">
          <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">
          Something went wrong
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          This page encountered an error. Your data is safe.
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 px-5 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
