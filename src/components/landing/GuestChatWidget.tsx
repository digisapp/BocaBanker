'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { UIMessage } from 'ai';
import { Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import BocaBankerAvatar from './BocaBankerAvatar';
import LeadCaptureOverlay from './LeadCaptureOverlay';

const MAX_GUEST_MESSAGES = 3;
const LS_COUNT_KEY = 'bb_guest_msg_count';
const LS_HISTORY_KEY = 'bb_guest_chat_history';

const GREETING_MESSAGE: UIMessage = {
  id: 'greeting',
  role: 'assistant' as const,
  parts: [
    {
      type: 'text' as const,
      text: "Hey there! I'm Boca Banker — Ask me anything about cost segregation, tax strategy, or property analysis. I'm all ears!",
    },
  ],
};

function getTextContent(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('');
}

export default function GuestChatWidget() {
  const [userMsgCount, setUserMsgCount] = useState(0);
  const [showOverlay, setShowOverlay] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load count from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(LS_COUNT_KEY);
    if (stored) {
      const count = parseInt(stored, 10);
      if (!isNaN(count)) {
        setUserMsgCount(count);
        if (count >= MAX_GUEST_MESSAGES) setShowOverlay(true);
      }
    }
  }, []);

  const transport = useMemo(
    () => new DefaultChatTransport({ api: '/api/chat/guest' }),
    []
  );

  const { messages, sendMessage, status, setMessages } = useChat({
    transport,
    onError: (error) => {
      if (error.message?.includes('403')) {
        setShowOverlay(true);
      }
    },
  });

  // Set greeting message on mount
  useEffect(() => {
    setMessages([GREETING_MESSAGE]);
  }, [setMessages]);

  const isLoading = status === 'submitted' || status === 'streaming';

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Persist messages to localStorage for handoff
  useEffect(() => {
    if (messages.length > 1) {
      localStorage.setItem(LS_HISTORY_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputValue.trim();
    if (!text || isLoading || userMsgCount >= MAX_GUEST_MESSAGES) return;

    const newCount = userMsgCount + 1;
    setUserMsgCount(newCount);
    localStorage.setItem(LS_COUNT_KEY, String(newCount));
    setInputValue('');

    sendMessage({ text });

    if (newCount >= MAX_GUEST_MESSAGES) {
      // Show overlay after a short delay so user sees the response start
      setTimeout(() => setShowOverlay(true), 3000);
    }
  };

  const remaining = MAX_GUEST_MESSAGES - userMsgCount;

  return (
    <div className="mx-auto max-w-2xl bg-white rounded-3xl shadow-xl shadow-black/5 border border-gray-100 overflow-hidden relative">
      {/* Lead capture overlay */}
      {showOverlay && (
        <LeadCaptureOverlay onDismiss={() => setShowOverlay(false)} />
      )}

      {/* Chat header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-3">
          <BocaBankerAvatar size={36} />
          <div>
            <p className="font-semibold text-gray-900 text-sm">Boca Banker</p>
            <p className="text-xs text-green-500 flex items-center gap-1">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
              Online
            </p>
          </div>
        </div>
        {remaining > 0 && (
          <span className="text-xs font-medium text-gray-400 bg-gray-100 rounded-full px-3 py-1">
            {remaining} free message{remaining !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="p-6 space-y-4 max-h-[400px] overflow-y-auto">
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
                'max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                msg.role === 'user'
                  ? 'bg-sky-500 text-white rounded-br-md'
                  : 'bg-gray-100 text-gray-800 rounded-bl-md'
              )}
            >
              {getTextContent(msg)}
            </div>
          </div>
        ))}

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
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-gray-100">
        <form onSubmit={handleSubmit} className="flex items-center gap-3">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={
              userMsgCount >= MAX_GUEST_MESSAGES
                ? 'Sign up to keep chatting...'
                : 'Ask Boca Banker anything...'
            }
            disabled={userMsgCount >= MAX_GUEST_MESSAGES}
            className="flex-1 bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading || userMsgCount >= MAX_GUEST_MESSAGES}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-white disabled:opacity-50 transition-opacity hover:opacity-90"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
