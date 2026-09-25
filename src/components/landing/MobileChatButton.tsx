'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { MessageCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useVisualViewport } from '@/hooks/useVisualViewport'
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
  // Whether the page's own Ask button (marked data-chat-cta) is on screen.
  // Starts true so the floating button doesn't flash in before hydration.
  const [ctaVisible, setCtaVisible] = useState(true)
  const dialogRef = useRef<HTMLDivElement>(null)

  // While open, pin the overlay to the visible area so the iOS keyboard can't
  // push its header (and close button) off screen
  const viewport = useVisualViewport(open)

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

  // Links to /#chat (the desktop hero chat) open the overlay on phones instead
  useEffect(() => {
    if (window.location.hash === '#chat' && !isDesktop()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of the URL on arrival
      setOpen(true)
    }
  }, [])

  // Hide the floating button while the page's own Ask button is on screen, so
  // the first screen doesn't show two Ask buttons on top of each other.
  useEffect(() => {
    const cta = document.querySelector('[data-chat-cta]')
    if (!cta) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- no inline Ask button on this page
      setCtaVisible(false)
      return
    }
    // The top inset keeps the button hidden while the CTA sits under the fixed nav
    const obs = new IntersectionObserver(([e]) => setCtaVisible(e.isIntersecting), {
      rootMargin: '-64px 0px 0px 0px',
    })
    obs.observe(cta)
    return () => obs.disconnect()
  }, [])

  const close = () => {
    setOpen(false)
    // The widget remounts on reopen, so drop the request or it would resend
    setRequest(null)
  }

  // Lock body scroll, support Escape, and move focus into the dialog while open
  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    dialogRef.current?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      setRequest(null)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const fabHidden = open || ctaVisible

  return (
    <div className="lg:hidden">
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        inert={fabHidden}
        className={cn(
          'fixed bottom-4 right-4 z-50 flex h-14 items-center gap-2 rounded-full bg-navy pl-4 pr-5 text-sm font-semibold text-white shadow-lg shadow-navy/30 transition-all duration-300 active:scale-95',
          fabHidden && 'pointer-events-none translate-y-4 opacity-0'
        )}
        style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
        aria-label="Open chat"
      >
        <MessageCircle className="h-5 w-5 text-amber-400" />
        Ask
      </button>

      {/* Fullscreen overlay */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Chat with Boca Banker"
        tabIndex={-1}
        inert={!open}
        className={cn(
          'fixed inset-x-0 top-0 z-50 flex h-full flex-col bg-white outline-none transition-transform duration-300 ease-out',
          open ? 'translate-y-0' : 'translate-y-full pointer-events-none'
        )}
        style={viewport ? { top: viewport.top, height: viewport.height } : undefined}
      >
        {/* Header */}
        <div
          className="shrink-0 border-b border-gray-100 bg-cream"
          style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
        >
          <div className="flex h-14 items-center justify-between pl-4 pr-2">
            <div className="flex items-center gap-2.5">
              <BocaBankerAvatar size={32} />
              <div>
                <p className="text-sm font-semibold text-gray-900">Boca Banker</p>
                <p className="text-xs text-gray-500">AI assistant · replies in seconds</p>
              </div>
            </div>
            <button
              onClick={close}
              className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              aria-label="Close chat"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Chat body — fills remaining height */}
        <div className="flex-1 min-h-0 overflow-hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          {open && <GuestChatWidget request={request} embedded />}
        </div>
      </div>
    </div>
  )
}
