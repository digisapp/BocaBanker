'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { MessageCircle, X } from 'lucide-react'
import BocaBankerAvatar from './BocaBankerAvatar'
import { isDesktop, onOpenChat, type ChatRequest } from './chat-events'

// Only fetched when the overlay is first opened — keeps the AI chat bundle
// out of the landing page's initial JS on mobile.
const GuestChatWidget = dynamic(() => import('./GuestChatWidget'), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-gray-50" aria-hidden="true" />,
})

export default function MobileChatButton() {
  const [open, setOpen] = useState(false)
  const [request, setRequest] = useState<ChatRequest | null>(null)

  // "Ask" buttons elsewhere on the page open the overlay on small screens
  useEffect(
    () =>
      onOpenChat((r) => {
        if (isDesktop()) return
        setRequest(r)
        setOpen(true)
      }),
    []
  )

  // Lock body scroll when overlay is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const close = () => {
    setOpen(false)
    // The widget remounts on reopen, so drop the request or it would resend
    setRequest(null)
  }

  return (
    <div className="lg:hidden">
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-4 right-4 z-50 flex h-14 items-center gap-2 rounded-full bg-navy pl-4 pr-5 text-sm font-semibold text-white shadow-lg shadow-navy/30 transition-transform hover:scale-105 active:scale-95 animate-bounce-subtle"
          style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
          aria-label="Open chat"
        >
          <MessageCircle className="h-5 w-5 text-amber-400" />
          Ask
        </button>
      )}

      {/* Fullscreen overlay */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Chat with Boca Banker"
        className={`fixed inset-0 z-50 flex flex-col bg-white transition-transform duration-300 ease-out ${
          open ? 'translate-y-0' : 'translate-y-full pointer-events-none'
        }`}
        aria-hidden={!open}
      >
        {/* Header */}
        <div
          className="flex h-14 items-center justify-between border-b border-gray-100 bg-cream px-4"
          style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
        >
          <div className="flex items-center gap-2.5">
            <BocaBankerAvatar size={32} />
            <div>
              <p className="text-sm font-semibold text-gray-900">Boca Banker</p>
              <p className="text-[11px] text-gray-500">AI assistant · replies in seconds</p>
            </div>
          </div>
          <button
            onClick={close}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            aria-label="Close chat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Chat body — fills remaining height */}
        <div className="flex-1 min-h-0 overflow-hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          {open && <GuestChatWidget request={request} embedded />}
        </div>
      </div>
    </div>
  )
}
