/**
 * Lets any "Ask" button on the landing page open the guest chat — the inline
 * hero widget on desktop, the fullscreen overlay on mobile — optionally
 * sending a starter question.
 */

export interface ChatRequest {
  id: number
  prompt?: string
}

export const DESKTOP_QUERY = '(min-width: 1024px)'

const EVENT = 'bb:open-chat'
let seq = 0

export function openChat(prompt?: string) {
  window.dispatchEvent(new CustomEvent<ChatRequest>(EVENT, { detail: { id: ++seq, prompt } }))
}

export function onOpenChat(cb: (request: ChatRequest) => void) {
  const handler = (e: Event) => cb((e as CustomEvent<ChatRequest>).detail)
  window.addEventListener(EVENT, handler)
  return () => window.removeEventListener(EVENT, handler)
}

export function isDesktop() {
  return window.matchMedia(DESKTOP_QUERY).matches
}
