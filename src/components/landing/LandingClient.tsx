'use client'

/**
 * Client-only islands for the (server-rendered) landing page. Keeping these
 * small lets the hero/FAQ/feature markup ship as static HTML, and keeps the
 * AI chat bundle off the critical path.
 */

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import dynamic from 'next/dynamic'
import { cn } from '@/lib/utils'
import { DESKTOP_QUERY, isDesktop, onOpenChat, openChat, type ChatRequest } from './chat-events'

/* ─── Scroll Reveal ─── */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode
  className?: string
  delay?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  // Visible in the server HTML so content never depends on JS. Once hydrated,
  // content that starts off-screen is hidden and then animated in on scroll.
  const [state, setState] = useState<'static' | 'hidden' | 'shown'>('static')

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let first = true
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          if (!first) setState('shown')
          obs.unobserve(el)
        } else if (first) {
          setState('hidden')
        }
        first = false
      },
      { threshold: 0.12, rootMargin: '0px 0px -30px 0px' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={cn(
        state !== 'static' && 'transition-all duration-700 ease-out',
        state === 'hidden' && 'opacity-0 translate-y-6',
        className
      )}
      style={state === 'shown' ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  )
}

/* ─── Nav (background changes once scrolled) ─── */
export function LandingNav({ children }: { children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40)
    fn()
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <nav
      aria-label="Main navigation"
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
        scrolled
          ? 'bg-white/90 backdrop-blur-xl shadow-sm border-b border-gray-100'
          : 'bg-transparent'
      )}
    >
      {children}
    </nav>
  )
}

/* ─── Opens the guest chat (hero widget on desktop, overlay on mobile) ─── */
export function OpenChatButton({
  prompt,
  className,
  children,
}: {
  prompt?: string
  className?: string
  children: ReactNode
}) {
  return (
    <button type="button" className={className} onClick={() => openChat(prompt)}>
      {children}
    </button>
  )
}

/* ─── Guest chat (lazy) ─── */

const GuestChatWidget = dynamic(() => import('@/components/landing/GuestChatWidget'), {
  // The widget reads localStorage during init, so it must not SSR.
  ssr: false,
  loading: () => <ChatSkeleton />,
})

function ChatSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="mx-auto max-w-2xl h-[520px] bg-white rounded-3xl border border-gray-100 animate-pulse"
    />
  )
}

function subscribeDesktop(cb: () => void) {
  const mql = window.matchMedia(DESKTOP_QUERY)
  mql.addEventListener('change', cb)
  return () => mql.removeEventListener('change', cb)
}

/**
 * Hero chat widget — desktop only (mobile uses MobileChatButton). Only mounts
 * on wide viewports so phones never download the AI chat bundle up front.
 */
export function HeroChatWidget() {
  const desktop = useSyncExternalStore(subscribeDesktop, isDesktop, () => false)
  const ref = useRef<HTMLDivElement>(null)
  const [request, setRequest] = useState<ChatRequest | null>(null)

  useEffect(
    () =>
      onOpenChat((r) => {
        if (!isDesktop()) return
        setRequest(r)
        ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }),
    []
  )

  return (
    <div ref={ref} id="chat" className="scroll-mt-24">
      {desktop ? <GuestChatWidget request={request} /> : <ChatSkeleton />}
    </div>
  )
}
