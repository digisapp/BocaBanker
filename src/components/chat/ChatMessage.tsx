'use client';

import { cn } from '@/lib/utils';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  createdAt?: Date | string;
}

export function ChatMessage({ role, content, createdAt }: ChatMessageProps) {
  const isUser = role === 'user';

  const formattedTime = createdAt
    ? new Date(createdAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div
      className={cn(
        'flex w-full gap-3 animate-fade-in',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      {/* Assistant avatar */}
      {!isUser && (
        <div className="flex-shrink-0 mt-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-serif font-bold text-xs">
            BB
          </div>
        </div>
      )}

      <div
        className={cn(
          'max-w-[75%] rounded-xl px-4 py-3',
          isUser
            ? 'bg-sky-500 text-white rounded-br-sm'
            : 'bg-gray-100 text-gray-800 border-l-2 border-l-amber-500 rounded-bl-sm'
        )}
      >
        <div className="whitespace-pre-wrap text-sm leading-relaxed">
          {content}
        </div>

        {formattedTime && (
          <div
            className={cn(
              'mt-1.5 text-[10px]',
              isUser ? 'text-sky-100 text-right' : 'text-gray-500'
            )}
          >
            {formattedTime}
          </div>
        )}
      </div>

      {/* Spacer for user messages (no avatar) */}
      {isUser && <div className="w-8 flex-shrink-0" />}
    </div>
  );
}
