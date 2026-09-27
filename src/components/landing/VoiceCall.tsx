'use client'

/**
 * A live voice conversation with the Boca Banker voice agent (the same Grok
 * Voice agent that answers the phone line), over LiveKit. Loaded only when a
 * visitor taps Talk, so livekit-client stays out of the page bundle.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ParticipantKind,
  Room,
  RoomEvent,
  Track,
  createAudioAnalyser,
  type LocalAudioTrack,
  type LocalTrackPublication,
  type Participant,
  type RemoteAudioTrack,
} from 'livekit-client'
import VoiceScreen, { type Caption, type VoicePhase } from './VoiceScreen'
import { openChat } from './chat-events'

/** Give up if the agent hasn't joined by then (e.g. it isn't deployed or is down). */
const AGENT_JOIN_TIMEOUT_MS = 20_000
/** Backstop for the agent's own 10-minute limit on website calls. */
const MAX_CALL_MS = 11 * 60_000
const MAX_CAPTIONS = 6

// Names the LiveKit agents framework uses for its state and transcripts
const AGENT_STATE = 'lk.agent.state'
const TRANSCRIPTION_TOPIC = 'lk.transcription'
const SEGMENT_ID = 'lk.segment_id'
const TRANSCRIBED_TRACK = 'lk.transcribed_track_id'

const TYPE_INSTEAD = 'Please type your question instead.'

function micErrorMessage(err: unknown): string {
  const name = err instanceof DOMException ? err.name : ''
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'Microphone access is turned off. Allow the microphone for bocabanker.com in your browser settings, or type your question instead.'
  }
  if (name === 'NotFoundError') return `No microphone was found on this device. ${TYPE_INSTEAD}`
  if (name === 'NotReadableError') return `Another app is using your microphone. Close it and try again, or type your question instead.`
  return "This browser can't use the microphone here. Open bocabanker.com in Safari or Chrome, or type your question instead."
}

function upsertCaption(prev: Caption[], next: Caption): Caption[] {
  const i = prev.findIndex((c) => c.id === next.id)
  if (i === -1) return [...prev, next].slice(-MAX_CAPTIONS)
  const copy = prev.slice()
  copy[i] = next
  return copy
}

interface VoiceCallProps {
  mic: Promise<MediaStream>
  onClose: () => void
}

export default function VoiceCall({ mic, onClose }: VoiceCallProps) {
  const [phase, setPhase] = useState<VoicePhase>('connecting')
  const [agentState, setAgentState] = useState('initializing')
  const [error, setError] = useState<string | null>(null)
  const [muted, setMuted] = useState(false)
  const [captions, setCaptions] = useState<Caption[]>([])
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [needsAudioTap, setNeedsAudioTap] = useState(false)
  const roomRef = useRef<Room | null>(null)
  const micPubRef = useRef<LocalTrackPublication | null>(null)
  const orbRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    const room = new Room()
    roomRef.current = room
    const timers: ReturnType<typeof setTimeout>[] = []
    const cleanups: (() => void)[] = []
    let agent: Participant | null = null
    let agentMeter: ReturnType<typeof createAudioAnalyser> | null = null
    let micMeter: ReturnType<typeof createAudioAnalyser> | null = null
    let raf = 0

    const fail = (message: string) => {
      if (cancelled) return
      setError(message)
      setPhase('error')
      void room.disconnect()
    }

    const isAgent = (p: Participant) => p.kind === ParticipantKind.AGENT

    const onAgent = (p: Participant) => {
      if (agent) return
      agent = p
      setAgentState(p.attributes[AGENT_STATE] ?? 'initializing')
      setStartedAt(Date.now())
      setPhase('live')
      timers.push(setTimeout(() => void room.disconnect(), MAX_CALL_MS))
    }

    room
      .on(RoomEvent.ParticipantConnected, (p) => {
        if (isAgent(p)) onAgent(p)
      })
      .on(RoomEvent.ParticipantAttributesChanged, (_changed, p) => {
        if (p === agent && p.attributes[AGENT_STATE]) setAgentState(p.attributes[AGENT_STATE])
      })
      .on(RoomEvent.TrackSubscribed, (track, _pub, participant) => {
        if (track.kind !== Track.Kind.Audio) return
        const el = track.attach()
        document.body.appendChild(el)
        cleanups.push(() => {
          track.detach(el)
          el.remove()
        })
        if (isAgent(participant) && !agentMeter) {
          agentMeter = createAudioAnalyser(track as RemoteAudioTrack)
        }
      })
      .on(RoomEvent.AudioPlaybackStatusChanged, () => setNeedsAudioTap(!room.canPlaybackAudio))
      .on(RoomEvent.Disconnected, () => {
        // The agent hung up (it deletes the room), the time limit hit, or the network dropped
        if (!cancelled) setPhase((p) => (p === 'error' ? p : 'ended'))
      })

    // Captions. Each segment is its own stream of text deltas; a newer stream
    // for the same segment (an updated guess at what the visitor said)
    // replaces the older one.
    room.registerTextStreamHandler(TRANSCRIPTION_TOPIC, async (reader, { identity }) => {
      const attrs = reader.info.attributes ?? {}
      const id = attrs[SEGMENT_ID] ?? reader.info.id
      const trackId = attrs[TRANSCRIBED_TRACK]
      const from =
        identity === room.localParticipant.identity || (!!trackId && trackId === micPubRef.current?.trackSid)
          ? 'you'
          : 'agent'
      let text = ''
      for await (const chunk of reader) {
        if (cancelled) return
        text += chunk
        const caption: Caption = { id, from, text: text.trim() }
        if (caption.text) setCaptions((prev) => upsertCaption(prev, caption))
      }
    })

    // Drive the rings around the avatar with whoever is talking
    const tick = () => {
      const level = Math.max(agentMeter?.calculateVolume() ?? 0, micMeter?.calculateVolume() ?? 0)
      orbRef.current?.style.setProperty('--level', Math.min(1, level * 3).toFixed(3))
      raf = requestAnimationFrame(tick)
    }

    const start = async () => {
      let stream: MediaStream
      try {
        stream = await mic
      } catch (err) {
        fail(micErrorMessage(err))
        return
      }
      if (cancelled) return

      let session: { serverUrl?: string; token?: string; error?: string } = {}
      try {
        const res = await fetch('/api/voice/session', { method: 'POST' })
        session = await res.json().catch(() => ({}))
        if (!res.ok || !session.serverUrl || !session.token) {
          fail(session.error || `Voice chat isn't available right now. ${TYPE_INSTEAD}`)
          return
        }
      } catch {
        fail('Network error. Check your connection and try again.')
        return
      }
      if (cancelled) return

      await room.connect(session.serverUrl, session.token)
      if (cancelled) return
      const [track] = stream.getAudioTracks()
      const pub = await room.localParticipant.publishTrack(track, { source: Track.Source.Microphone })
      micPubRef.current = pub
      if (pub.track) micMeter = createAudioAnalyser(pub.track as LocalAudioTrack)
      raf = requestAnimationFrame(tick)

      const present = [...room.remoteParticipants.values()].find(isAgent)
      if (present) onAgent(present)
      timers.push(
        setTimeout(() => {
          if (!agent) fail(`Boca Banker’s voice assistant isn’t answering right now. ${TYPE_INSTEAD}`)
        }, AGENT_JOIN_TIMEOUT_MS)
      )
    }

    start().catch(() => fail(`Couldn't connect the call. Try again in a moment, or type your question instead.`))

    return () => {
      cancelled = true
      timers.forEach(clearTimeout)
      cancelAnimationFrame(raf)
      cleanups.forEach((fn) => fn())
      void agentMeter?.cleanup()
      void micMeter?.cleanup()
      room.unregisterTextStreamHandler(TRANSCRIPTION_TOPIC)
      room.removeAllListeners()
      void room.disconnect()
    }
  }, [mic])

  const toggleMute = useCallback(async () => {
    const pub = micPubRef.current
    if (!pub) return
    if (pub.isMuted) await pub.unmute()
    else await pub.mute()
    setMuted(pub.isMuted)
  }, [])

  const startAudio = useCallback(() => {
    void roomRef.current?.startAudio().then(() => setNeedsAudioTap(false))
  }, [])

  const typeInstead = useCallback(() => {
    onClose()
    openChat()
  }, [onClose])

  return (
    <VoiceScreen
      phase={phase}
      agentState={agentState}
      muted={muted}
      error={error}
      captions={captions}
      startedAt={startedAt}
      needsAudioTap={needsAudioTap}
      orbRef={orbRef}
      onEnd={onClose}
      onToggleMute={toggleMute}
      onStartAudio={startAudio}
      onTypeInstead={typeInstead}
    />
  )
}
