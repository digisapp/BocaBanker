'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, MessageCircle, Mic, MicOff, PhoneOff, Volume2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import BocaBankerAvatar from './BocaBankerAvatar'

export type VoicePhase = 'connecting' | 'live' | 'ended' | 'error'

export interface Caption {
  id: string
  from: 'agent' | 'you'
  text: string
}

interface VoiceScreenProps {
  phase: VoicePhase
  /** The agent's `lk.agent.state`: initializing, listening, thinking or speaking. */
  agentState?: string
  muted?: boolean
  error?: string | null
  captions?: Caption[]
  /** When the agent joined, for the call timer. */
  startedAt?: number | null
  /** The browser blocked playback until the visitor taps. */
  needsAudioTap?: boolean
  /** Gets a `--level` CSS variable (0–1) that drives the rings around the avatar. */
  orbRef?: React.Ref<HTMLDivElement>
  onEnd: () => void
  onToggleMute?: () => void
  onStartAudio?: () => void
  onTypeInstead?: () => void
}

function statusText(phase: VoicePhase, agentState: string | undefined, muted: boolean) {
  if (phase === 'connecting') return 'Connecting…'
  if (phase === 'ended') return 'Call ended'
  if (phase === 'error') return 'Voice chat unavailable'
  if (agentState === 'speaking') return 'Speaking…'
  if (agentState === 'thinking') return 'Thinking…'
  if (agentState === 'listening') return muted ? 'You’re muted' : 'Listening…'
  return 'Connecting…'
}

function Elapsed({ since }: { since: number }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const s = Math.max(0, Math.floor((now - since) / 1000))
  return (
    <span className="tabular-nums">
      {Math.floor(s / 60)}:{String(s % 60).padStart(2, '0')}
    </span>
  )
}

/**
 * Fullscreen voice call UI, Grok-voice style. Purely presentational: VoiceCall
 * runs the call, and VoiceHost shows this in the "connecting" state while the
 * call code loads.
 */
export default function VoiceScreen({
  phase,
  agentState,
  muted = false,
  error,
  captions = [],
  startedAt,
  needsAudioTap,
  orbRef,
  onEnd,
  onToggleMute,
  onStartAudio,
  onTypeInstead,
}: VoiceScreenProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const active = phase === 'connecting' || phase === 'live'
  const speaking = phase === 'live' && agentState === 'speaking'
  const thinking = phase === 'live' && agentState === 'thinking'
  const recent = captions.slice(-2)

  useEffect(() => {
    dialogRef.current?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onEnd()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onEnd])

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Voice chat with Boca Banker"
      tabIndex={-1}
      className="fixed inset-0 z-[60] flex flex-col bg-navy text-white outline-none"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {/* Header */}
      <div className="flex h-14 shrink-0 items-center justify-between pl-5 pr-2">
        <div>
          <p className="text-sm font-semibold">Boca Banker</p>
          <p className="text-xs text-white/60">
            AI voice assistant
            {phase === 'live' && startedAt && (
              <>
                {' · '}
                <Elapsed since={startedAt} />
              </>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={onEnd}
          aria-label={active ? 'End call' : 'Close'}
          className="flex h-11 w-11 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Avatar, status and captions */}
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center">
        <div
          ref={orbRef}
          className="relative flex h-60 w-60 shrink-0 items-center justify-center"
          style={{ '--level': 0 } as React.CSSProperties}
        >
          <div
            aria-hidden="true"
            className={cn(
              'absolute inset-0 rounded-full bg-amber-400/10 transition-transform duration-150 ease-out',
              (speaking || thinking) && 'animate-pulse'
            )}
            style={{ transform: 'scale(calc(0.72 + var(--level) * 0.28))' }}
          />
          <div
            aria-hidden="true"
            className="absolute inset-8 rounded-full bg-amber-400/15 transition-transform duration-100 ease-out"
            style={{ transform: 'scale(calc(0.85 + var(--level) * 0.3))' }}
          />
          <BocaBankerAvatar
            size={132}
            className={cn('relative transition-opacity', phase === 'connecting' && 'opacity-70')}
          />
        </div>

        <p aria-live="polite" className="mt-6 flex items-center gap-2 text-lg font-medium">
          {phase === 'connecting' && <Loader2 className="h-4 w-4 animate-spin text-amber-400" />}
          {statusText(phase, agentState, muted)}
        </p>

        {phase === 'error' && error && <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/70">{error}</p>}

        {phase === 'ended' && (
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/70">
            Thanks for talking with Boca Banker. You can keep going by text anytime.
          </p>
        )}

        {needsAudioTap && active && (
          <button
            type="button"
            onClick={onStartAudio}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-amber-400 px-5 py-3 text-sm font-semibold text-navy"
          >
            <Volume2 className="h-4 w-4" />
            Tap to hear Boca Banker
          </button>
        )}

        {/* Live captions: the latest line from each side */}
        {phase === 'live' && (
          <div className="mt-6 min-h-[6rem] w-full max-w-md space-y-2">
            {recent.map((c) => (
              <p
                key={c.id}
                className={cn(
                  'line-clamp-3 leading-snug',
                  c.from === 'agent' ? 'text-base text-white' : 'text-sm text-white/55'
                )}
              >
                {c.text}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="shrink-0 px-6 pb-6 pt-2">
        {active ? (
          <div className="flex items-start justify-center gap-12">
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={onToggleMute}
                disabled={phase !== 'live'}
                aria-pressed={muted}
                aria-label={muted ? 'Unmute microphone' : 'Mute microphone'}
                className={cn(
                  'flex h-16 w-16 items-center justify-center rounded-full transition-colors disabled:opacity-40',
                  muted ? 'bg-white text-navy' : 'bg-white/10 text-white hover:bg-white/15'
                )}
              >
                {muted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
              </button>
              <span className="text-xs text-white/60">{muted ? 'Unmute' : 'Mute'}</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={onEnd}
                aria-label="End call"
                className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 text-white transition-colors hover:bg-red-600"
              >
                <PhoneOff className="h-6 w-6" />
              </button>
              <span className="text-xs text-white/60">End</span>
            </div>
          </div>
        ) : (
          <div className="mx-auto flex max-w-sm flex-col gap-3">
            {onTypeInstead && (
              <button
                type="button"
                onClick={onTypeInstead}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-6 py-3.5 font-semibold text-navy transition-colors hover:bg-amber-300"
              >
                <MessageCircle className="h-5 w-5" />
                {phase === 'error' ? 'Type your question instead' : 'Keep chatting by text'}
              </button>
            )}
            <button
              type="button"
              onClick={onEnd}
              className="rounded-xl border border-white/25 px-6 py-3.5 font-semibold text-white transition-colors hover:bg-white/10"
            >
              Done
            </button>
          </div>
        )}
        <p className="mt-5 text-center text-[11px] leading-snug text-white/40">
          Boca Banker’s AI assistant · General information, not a loan offer
        </p>
      </div>
    </div>
  )
}
