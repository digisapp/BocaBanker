'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { UIMessage } from 'ai';
import { Send } from 'lucide-react';
import { cn, getTextContent } from '@/lib/utils';
import BocaBankerAvatar from './BocaBankerAvatar';
import InlineLeadCaptureCard from './InlineLeadCaptureCard';
import ChatMarkdown from './ChatMarkdown';
import type { ChatRequest } from './chat-events';

const LS_COUNT_KEY = 'bb_guest_msg_count';
const LS_HISTORY_KEY = 'bb_guest_chat_history';
const LS_LEAD_CAPTURED_KEY = 'bb_lead_captured';
const LS_LEAD_DISMISSED_KEY = 'bb_lead_dismissed';
const LEAD_CARD_THRESHOLD = 3;

const GREETING_MESSAGE: UIMessage = {
  id: 'greeting',
  role: 'assistant' as const,
  parts: [
    {
      type: 'text' as const,
      text: "Hi, I'm Boca Banker. Ask me anything about buying a home, refinancing, or cost segregation on an investment property, and I'll give you a straight answer.",
    },
  ],
};

const STARTER_PROMPTS = [
  'What rate could I get on a 30-year fixed?',
  'Should I refinance my mortgage?',
  'How much could cost segregation save on a $1M rental?',
];

interface GuestChatWidgetProps {
  /** Latest "open chat" request from an Ask button; its prompt is sent once. */
  request?: ChatRequest | null;
  /** Rendered inside the mobile overlay, which supplies its own header. */
  embedded?: boolean;
}

export default function GuestChatWidget({ request, embedded = false }: GuestChatWidgetProps) {
  const [userMsgCount, setUserMsgCount] = useState(() => {
    if (typeof window === 'undefined') return 0;
    const stored = localStorage.getItem(LS_COUNT_KEY);
    return stored ? parseInt(stored, 10) || 0 : 0;
  });
  const [leadCaptured, setLeadCaptured] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(LS_LEAD_CAPTURED_KEY) === 'true';
  });
  const [leadDismissed, setLeadDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(LS_LEAD_DISMISSED_KEY) === 'true';
  });
  const [inputValue, setInputValue] = useState('');
  const messagesRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const handledRequestId = useRef<number | null>(null);

  const transport = useMemo(
    () => new DefaultChatTransport({ api: '/api/chat/guest' }),
    []
  );

  const { messages, sendMessage, status, setMessages, error, clearError } = useChat({
    transport,
    experimental_throttle: 50,
  });

  // DefaultChatTransport puts the non-2xx response body in error.message.
  const errorText = useMemo(() => {
    if (!error) return null;
    try {
      const parsed = JSON.parse(error.message);
      if (parsed && typeof parsed.error === 'string') return parsed.error as string;
    } catch {
      // not JSON
    }
    return 'Something went wrong. Please try again.';
  }, [error]);

  // On mount, restore any saved guest history (e.g. after closing/reopening
  // the mobile chat overlay); otherwise show the greeting message.
  useEffect(() => {
    let restored: UIMessage[] | null = null;
    try {
      const stored = localStorage.getItem(LS_HISTORY_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as UIMessage[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          restored = parsed;
        }
      }
    } catch {
      // Ignore localStorage/parse errors and fall back to the greeting
    }
    setMessages(restored ?? [GREETING_MESSAGE]);
  }, [setMessages]);

  const isLoading = status === 'submitted' || status === 'streaming';

  // Derive lead card visibility from state (no effect needed)
  const showLeadCard =
    status === 'ready' &&
    userMsgCount >= LEAD_CARD_THRESHOLD &&
    !leadCaptured &&
    !leadDismissed &&
    messages.length > 1 &&
    messages[messages.length - 1]?.role === 'assistant';

  const scrollToBottom = useCallback((smooth: boolean) => {
    // Scroll only the message list — scrollIntoView would also scroll the page
    const el = messagesRef.current;
    el?.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  useEffect(() => {
    scrollToBottom(status !== 'streaming');
  }, [messages, showLeadCard, status, scrollToBottom]);

  // Persist messages to localStorage for handoff. Skip while streaming so we
  // don't serialize the whole history on every token.
  useEffect(() => {
    if (status === 'streaming') return;
    if (messages.length > 1) {
      try {
        localStorage.setItem(LS_HISTORY_KEY, JSON.stringify(messages));
      } catch {
        // Storage full/blocked — handoff history is best-effort
      }
    }
  }, [messages, status]);

  const submitText = useCallback(
    (raw: string) => {
      const text = raw.trim();
      if (!text || isLoading) return;

      const newCount = userMsgCount + 1;
      setUserMsgCount(newCount);
      try {
        localStorage.setItem(LS_COUNT_KEY, String(newCount));
      } catch {
        // Storage blocked — the count only gates the lead card
      }
      setInputValue('');

      if (error) clearError();
      sendMessage({ text });
    },
    [isLoading, userMsgCount, error, clearError, sendMessage]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitText(inputValue);
  };

  // Act on each "open chat" request once: send its starter question, or just
  // focus the input. Waits until the greeting/history has been loaded and any
  // in-flight reply has finished.
  useEffect(() => {
    if (!request || handledRequestId.current === request.id) return;
    if (messages.length === 0 || isLoading) return;
    handledRequestId.current = request.id;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot response to an external "Ask" click, guarded by handledRequestId
    if (request.prompt) submitText(request.prompt);
    else inputRef.current?.focus({ preventScroll: true });
  }, [request, messages.length, isLoading, submitText]);

  const showStarters =
    !isLoading && messages.length === 1 && messages[0]?.id === GREETING_MESSAGE.id;

  const handleLeadDismiss = () => {
    setLeadDismissed(true);
    localStorage.setItem(LS_LEAD_DISMISSED_KEY, 'true');
  };

  const handleLeadSuccess = (name: string) => {
    setLeadCaptured(true);
    try {
      localStorage.setItem(LS_LEAD_CAPTURED_KEY, 'true');
    } catch {
      // Storage blocked — the card may reappear on reload, which is harmless
    }
    // The card disappears once captured, so confirm in the conversation itself
    setMessages((prev) => [
      ...prev,
      {
        id: `lead-thanks-${Date.now()}`,
        role: 'assistant',
        parts: [
          {
            type: 'text',
            text: `Thanks, ${name}! I've passed your details along and Boca Banker will be in touch soon. Feel free to keep asking questions in the meantime.`,
          },
        ],
      },
    ]);
  };

  const firstQuestion = messages.find((m) => m.role === 'user');

  const startOver = () => {
    try {
      localStorage.removeItem(LS_HISTORY_KEY);
    } catch {
      // Storage blocked — nothing persisted to clear
    }
    clearError();
    setMessages([GREETING_MESSAGE]);
  };

  return (
    <div
      className={cn(
        'relative flex h-full flex-col overflow-hidden bg-white',
        !embedded && 'mx-auto max-w-2xl rounded-3xl border border-gray-100 shadow-xl shadow-black/5'
      )}
    >
      {/* Chat header */}
      {!embedded && (
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 bg-cream">
          <div className="flex items-center gap-3">
            <BocaBankerAvatar size={36} />
            <div>
              <p className="font-semibold text-gray-900 text-sm">Boca Banker</p>
              <p className="text-xs text-gray-500">AI assistant · replies in seconds</p>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div
        className={cn(
          'p-4 sm:p-6 space-y-4 flex-1 min-h-0 overflow-y-auto',
          !embedded && 'h-[400px] flex-none'
        )}
        aria-live="polite"
        ref={messagesRef}
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              'flex gap-3',
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            {msg.role === 'assistant' && (
              <BocaBankerAvatar size={32} className="flex-shrink-0 mt-1" />
            )}
            <div
              className={cn(
                'max-w-[85%] sm:max-w-[80%] rounded-2xl px-3 py-2.5 sm:px-4 sm:py-3 text-sm leading-relaxed',
                msg.role === 'user'
                  ? 'bg-navy text-white rounded-br-md'
                  : 'bg-gray-100 text-gray-800 rounded-bl-md'
              )}
            >
              {msg.role === 'assistant' ? (
                <ChatMarkdown text={getTextContent(msg)} />
              ) : (
                <span className="whitespace-pre-line">{getTextContent(msg)}</span>
              )}
            </div>
          </div>
        ))}

        {/* Starter questions */}
        {showStarters && (
          <div className="flex flex-wrap gap-2 pl-11">
            {STARTER_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => submitText(prompt)}
                className="rounded-full border border-amber-200 bg-amber-50/60 px-3 py-1.5 text-left text-xs font-medium text-navy transition-colors hover:border-amber-300 hover:bg-amber-100"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {/* Typing indicator */}
        {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex gap-3 justify-start">
            <BocaBankerAvatar size={32} className="flex-shrink-0 mt-1" />
            <div className="bg-gray-100 text-gray-800 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                <div
                  className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"
                  style={{ animationDelay: '0.2s' }}
                />
                <div
                  className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"
                  style={{ animationDelay: '0.4s' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Inline lead capture card */}
        {showLeadCard && !leadCaptured && (
          <InlineLeadCaptureCard
            question={firstQuestion ? getTextContent(firstQuestion) : undefined}
            onDismiss={handleLeadDismiss}
            onSuccess={handleLeadSuccess}
          />
        )}

        {errorText && !isLoading && (
          <div role="alert" className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
            <p>{errorText}</p>
            {messages.length > 1 && (
              <button
                type="button"
                onClick={startOver}
                className="mt-1 font-semibold text-red-700 underline underline-offset-2"
              >
                Start a new conversation
              </button>
            )}
          </div>
        )}

      </div>

      {/* Input */}
      <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-100">
        <form onSubmit={handleSubmit} className="flex items-center gap-2 sm:gap-3">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask about rates, refinancing, cost seg…"
            aria-label="Your question"
            maxLength={2000}
            className="flex-1 bg-gray-50 rounded-xl px-3 sm:px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            aria-label="Send"
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy text-white disabled:opacity-40 transition-opacity hover:opacity-90 flex-shrink-0"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
