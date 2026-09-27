/**
 * Lets any "Ask" button on the landing page open the guest chat — the inline
 * hero widget on desktop, the fullscreen overlay on mobile — optionally
 * sending a starter question. "Talk" buttons open the voice call screen the
 * same way.
 */

export interface ChatRequest {
  id: number
  prompt?: string
  /**
   * The visitor tapped a text box, so the keyboard is already up: the chat may
   * move focus into its own input (iOS keeps the keyboard when focus moves
   * between fields, but won't raise it for a focus outside a tap).
   */
  focus?: boolean
  /** Returns (and clears) whatever the visitor typed before the chat opened. */
  takeDraft?: () => string
}

export interface VoiceRequest {
  id: number
  /** Microphone, requested during the tap so iOS shows its prompt right away. */
  mic: Promise<MediaStream>
}

export const DESKTOP_QUERY = '(min-width: 1024px)'

/** Set in next.config.ts when the web app has LiveKit credentials. */
export const VOICE_ENABLED = process.env.NEXT_PUBLIC_VOICE_ENABLED === 'true'

export const STARTER_PROMPTS = [
  { label: '30-year fixed rates', prompt: 'What rate could I get on a 30-year fixed?' },
  { label: 'Should I refinance?', prompt: 'Should I refinance my mortgage?' },
  { label: 'Cost seg on a $1M rental', prompt: 'How much could cost segregation save on a $1M rental?' },
]

const EVENT = 'bb:open-chat'
const VOICE_EVENT = 'bb:open-voice'
let seq = 0

export function openChat(prompt?: string, opts?: Pick<ChatRequest, 'focus' | 'takeDraft'>) {
  window.dispatchEvent(new CustomEvent<ChatRequest>(EVENT, { detail: { id: ++seq, prompt, ...opts } }))
}

export function onOpenChat(cb: (request: ChatRequest) => void) {
  const handler = (e: Event) => cb((e as CustomEvent<ChatRequest>).detail)
  window.addEventListener(EVENT, handler)
  return () => window.removeEventListener(EVENT, handler)
}

/** Call from a click handler: the microphone request must start inside the tap. */
export function openVoice() {
  const mic = navigator.mediaDevices?.getUserMedia
    ? navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })
    : Promise.reject(new DOMException('No microphone API', 'NotSupportedError'))
  // The call screen handles the rejection; this stops an "unhandled" warning meanwhile
  mic.catch(() => {})
  window.dispatchEvent(new CustomEvent<VoiceRequest>(VOICE_EVENT, { detail: { id: ++seq, mic } }))
}

export function onOpenVoice(cb: (request: VoiceRequest) => void) {
  const handler = (e: Event) => cb((e as CustomEvent<VoiceRequest>).detail)
  window.addEventListener(VOICE_EVENT, handler)
  return () => window.removeEventListener(VOICE_EVENT, handler)
}

export function isDesktop() {
  return window.matchMedia(DESKTOP_QUERY).matches
}

/** Starts downloading the chat bundle so it opens without a loading flash. */
export function preloadChat() {
  void import('./GuestChatWidget')
}
