'use client';

import { cn } from '@/lib/utils';
import type { UIMessage } from 'ai';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  parts?: UIMessage['parts'];
  createdAt?: Date | string;
}

function isToolPart(part: UIMessage['parts'][number]): boolean {
  return typeof part.type === 'string' && part.type.startsWith('tool-');
}

function getToolName(part: UIMessage['parts'][number]): string {
  return typeof part.type === 'string' ? part.type.replace(/^tool-/, '') : '';
}

export function ChatMessage({ role, content, parts, createdAt }: ChatMessageProps) {
  const isUser = role === 'user';

  const formattedTime = createdAt
    ? new Date(createdAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  const renderContent = () => {
    if (!parts || parts.length === 0) {
      return (
        <div className="whitespace-pre-wrap text-sm leading-relaxed">
          {content}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {parts.map((part, index) => {
          if (part.type === 'text') {
            return (
              <div
                key={index}
                className="whitespace-pre-wrap text-sm leading-relaxed"
              >
                {part.text}
              </div>
            );
          }

          if (isToolPart(part)) {
            const toolName = getToolName(part);
            const toolPart = part as Record<string, unknown>;

            // Hide silent tools from the UI
            if (toolName === 'capture_lead' || toolName === 'schedule_consultation') {
              return null;
            }

            // Show mortgage calculation results in a styled card
            if (toolName === 'calculate_mortgage' && toolPart.state === 'output-available') {
              const result = toolPart.output as Record<string, number>;
              return (
                <div
                  key={index}
                  className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-2"
                >
                  <div className="text-xs font-semibold text-amber-800 mb-2">
                    Mortgage Calculation
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-700">
                    <div>Loan Amount:</div>
                    <div className="font-medium">
                      ${result.principal?.toLocaleString()}
                    </div>
                    <div>Rate / Term:</div>
                    <div className="font-medium">
                      {result.annualRate}% / {result.termYears}yr
                    </div>
                    <div className="border-t border-amber-200 pt-1 mt-1">Monthly P&I:</div>
                    <div className="font-medium border-t border-amber-200 pt-1 mt-1">
                      ${result.monthlyPI?.toLocaleString()}
                    </div>
                    {result.monthlyTotal !== result.monthlyPI && (
                      <>
                        <div>Monthly Total:</div>
                        <div className="font-medium">
                          ${result.monthlyTotal?.toLocaleString()}
                        </div>
                      </>
                    )}
                    <div>Total Interest:</div>
                    <div className="font-medium">
                      ${result.totalInterest?.toLocaleString()}
                    </div>
                    <div>Total Cost:</div>
                    <div className="font-medium">
                      ${result.totalCost?.toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            }

            // Show loading state for in-progress tool calls
            if (
              toolPart.state === 'input-streaming' ||
              toolPart.state === 'input-available'
            ) {
              return (
                <div key={index} className="text-xs text-gray-400 italic">
                  Looking up information...
                </div>
              );
            }
          }

          return null;
        })}
      </div>
    );
  };

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
        {renderContent()}

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
