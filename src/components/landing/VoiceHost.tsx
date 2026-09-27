'use client'

import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import { onOpenVoice, type VoiceRequest } from './chat-events'
import VoiceScreen from './VoiceScreen'

// Fetched on the first Talk tap; until then the screen shows "Connecting…"
const VoiceCall = lazy(() => import('./VoiceCall'))

function releaseMic(mic: Promise<MediaStream>) {
  // Stopping the tracks turns off the browser's recording indicator
  mic.then((s) => s.getTracks().forEach((t) => t.stop())).catch(() => {})
}

/** Shows the voice call screen whenever a Talk button is tapped. */
export default function VoiceHost() {
  const [call, setCall] = useState<VoiceRequest | null>(null)
  const callRef = useRef<VoiceRequest | null>(null)

  useEffect(
    () =>
      onOpenVoice((r) => {
        // One call at a time; release the extra microphone request
        if (callRef.current) {
          releaseMic(r.mic)
          return
        }
        callRef.current = r
        setCall(r)
      }),
    []
  )

  const close = useCallback(() => {
    if (callRef.current) releaseMic(callRef.current.mic)
    callRef.current = null
    setCall(null)
  }, [])

  // Keep the page behind from scrolling while the call screen is up
  useEffect(() => {
    if (!call) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [call])

  if (!call) return null
  return (
    <Suspense fallback={<VoiceScreen phase="connecting" onEnd={close} />}>
      <VoiceCall key={call.id} mic={call.mic} onClose={close} />
    </Suspense>
  )
}
