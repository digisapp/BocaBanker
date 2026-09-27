'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useVisualViewport } from '@/hooks/useVisualViewport'
import BocaBankerAvatar from './BocaBankerAvatar'
import { TalkButton } from './AskBar'
import VoiceHost from './VoiceHost'
import { VOICE_ENABLED, isDesktop, onOpenChat, openChat, preloadChat, type ChatRequest } from './chat-events'

// Only fetched when the overlay is first opened (or the bottom bar appears) —
// keeps the AI chat bundle out of the landing page's initial JS on mobile.
const GuestChatWidget = dynamic(() => import('./GuestChatWidget'), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-gray-50" aria-hidden="true" />,
})

/**
 * The page's chat launcher: on phones, a bottom "ask" bar and the fullscreen
 * chat it opens; on every screen size, the voice call screen.
 */
export default function MobileChatButton() {
  const [open, setOpen] = useState(false)
  const [request, setRequest] = useState<ChatRequest | null>(null)
  // Whether the page's own Ask button or box (marked data-chat-cta) is on
  // screen. Starts true so the bottom bar doesn't flash in before hydration.
  const [ctaVisible, setCtaVisible] = useState(true)
  // Where the chat puts its "New chat" button, in this overlay's header
  const [headerSlot, setHeaderSlot] = useState<HTMLDivElement | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const barInputRef = useRef<HTMLInputElement>(null)

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

  // Hide the bottom bar while the page's own Ask button is on screen, so the
  // first screen doesn't show two ways to ask on top of each other.
  useEffect(() => {
    const cta = document.querySelector('[data-chat-cta]')
    if (!cta) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- no inline Ask button on this page
      setCtaVisible(false)
      return
    }
    // The top inset keeps the bar hidden while the CTA sits under the fixed nav
    const obs = new IntersectionObserver(([e]) => setCtaVisible(e.isIntersecting), {
      rootMargin: '-64px 0px 0px 0px',
    })
    obs.observe(cta)
    return () => obs.disconnect()
  }, [])

  const barHidden = open || ctaVisible

  // Once the bar shows, the visitor is reading the page: fetch the chat now so
  // tapping the bar opens it without a loading flash.
  useEffect(() => {
    if (!barHidden && !isDesktop()) preloadChat()
  }, [barHidden])

  const close = () => {
    setOpen(false)
    // The widget remounts on reopen, so drop the request or it would resend
    setRequest(null)
  }

  // The bar's field raises the keyboard; the chat then takes over the focus
  // (and anything typed meanwhile) so the keyboard stays up.
  const openFromBar = () => {
    const input = barInputRef.current
    openChat(undefined, {
      focus: true,
      takeDraft: () => {
        const text = input?.value ?? ''
        if (input) input.value = ''
        return text
      },
    })
  }

  // Lock body scroll, support Escape, and move focus into the dialog while open
  const keepFocus = !!request?.focus
  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    // Focusing the dialog would drop the keyboard the bottom bar just raised
    if (!keepFocus) dialogRef.current?.focus({ preventScroll: true })
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
  }, [open, keepFocus])

  return (
    <>
      <div className="lg:hidden">
        {/* Bottom ask bar. Not inert while the overlay is open: that would blur
            its field and drop the keyboard before the chat takes over focus. */}
        <div
          inert={ctaVisible}
          className={cn(
            // Only the pill takes taps; the fade above it lets them through
            'pointer-events-none fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-cream via-cream/90 to-transparent px-3 pt-6 transition-all duration-300',
            barHidden && 'translate-y-4 opacity-0'
          )}
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)' }}
        >
          <div
            className={cn(
              'mx-auto flex max-w-xl items-center gap-2 rounded-full border border-gray-200 bg-white p-1.5 pl-2 shadow-lg shadow-navy/15',
              !barHidden && 'pointer-events-auto'
            )}
          >
            <BocaBankerAvatar size={32} className="shrink-0" />
            <input
              ref={barInputRef}
              type="text"
              onFocus={openFromBar}
              placeholder="Ask Boca Banker anything…"
              aria-label="Ask Boca Banker a question"
              enterKeyHint="send"
              className="min-w-0 flex-1 bg-transparent py-2.5 text-base text-navy placeholder-gray-400 focus:outline-none"
            />
            {VOICE_ENABLED && <TalkButton />}
          </div>
        </div>

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
              <div className="flex items-center">
                <div ref={setHeaderSlot} className="contents" />
                <button
                  onClick={close}
                  className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                  aria-label="Close chat"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Chat body — fills remaining height */}
          <div className="flex-1 min-h-0 overflow-hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
            {open && <GuestChatWidget request={request} embedded headerSlot={headerSlot} />}
          </div>
        </div>
      </div>

      <VoiceHost />
    </>
  )
}
