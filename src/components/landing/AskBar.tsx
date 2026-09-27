'use client'

import { useRef, useState } from 'react'
import { ArrowUp, AudioLines } from 'lucide-react'
import { cn } from '@/lib/utils'
import { STARTER_PROMPTS, VOICE_ENABLED, openChat, openVoice, preloadChat } from './chat-events'

/** Starts a voice conversation with the AI (see VoiceHost). */
export function TalkButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={openVoice}
      aria-label="Talk to Boca Banker"
      className={cn(
        'inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-navy pl-3.5 pr-4 text-sm font-semibold text-white transition-colors hover:bg-navy-light active:scale-95',
        className
      )}
    >
      <AudioLines className="h-4 w-4 text-amber-400" />
      Talk
    </button>
  )
}

export function SendButton({ disabled, className }: { disabled?: boolean; className?: string }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      aria-label="Send"
      className={cn(
        'flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-navy text-white transition-opacity hover:opacity-90 disabled:opacity-30',
        className
      )}
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  )
}

/**
 * The homepage's "ask anything" box on phones and tablets (desktop shows the
 * live chat instead). Typing happens right here; sending opens the fullscreen
 * chat with the question already asked. Marked data-chat-cta so the bottom bar
 * stays hidden while this is on screen.
 */
export function HeroAskBar({ className }: { className?: string }) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const hasText = value.trim().length > 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const text = value.trim()
    if (!text) return
    // Drop the keyboard so the answer has the whole screen
    inputRef.current?.blur()
    setValue('')
    openChat(text)
  }

  return (
    <div data-chat-cta className={cn('lg:hidden', className)}>
      <form
        onSubmit={handleSubmit}
        className="mx-auto flex max-w-xl items-center gap-2 rounded-full border border-gray-200 bg-white p-1.5 pl-5 shadow-xl shadow-navy/10 transition-shadow focus-within:border-navy/30 focus-within:ring-4 focus-within:ring-amber-400/25"
      >
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={preloadChat}
          placeholder="Ask anything about mortgages…"
          aria-label="Ask Boca Banker a question"
          enterKeyHint="send"
          maxLength={2000}
          className="min-w-0 flex-1 bg-transparent py-2.5 text-base text-navy placeholder-gray-400 focus:outline-none"
        />
        {hasText || !VOICE_ENABLED ? <SendButton disabled={!hasText} /> : <TalkButton />}
      </form>

      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {STARTER_PROMPTS.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => openChat(s.prompt)}
            className="rounded-full border border-amber-200 bg-white/70 px-3.5 py-2 text-sm font-medium text-navy transition-colors hover:border-amber-300 hover:bg-amber-50"
          >
            {s.label}
          </button>
        ))}
      </div>

      <p className="mt-3 text-center text-xs text-gray-500">
        {VOICE_ENABLED
          ? 'Type a question, or tap Talk to ask out loud. Free, no signup.'
          : 'Free, no signup. Answers in seconds.'}
      </p>
    </div>
  )
}
