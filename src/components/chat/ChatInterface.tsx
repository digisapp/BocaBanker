'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { UIMessage } from 'ai';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  MessageSquarePlus,
  History,
  ChevronLeft,
  Loader2,
  Landmark,
  Trash2,
} from 'lucide-react';
import { cn, getTextContent } from '@/lib/utils';
import { useConversations } from '@/hooks/useConversations';
import { useMessageHistory } from '@/hooks/useMessageHistory';

interface ChatInterfaceProps {
  initialGuestHandoff?: boolean;
}

export function ChatInterface({ initialGuestHandoff = false }: ChatInterfaceProps) {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.innerWidth >= 768;
  });
  const [guestHandoff, setGuestHandoff] = useState(initialGuestHandoff);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    conversations,
    pendingDeleteId,
    setPendingDeleteId,
    fetchConversations,
    loadConversationMessages,
    deleteConversation,
  } = useConversations();

  const {
    activeConversationId,
    setActiveConversationId,
    loadingHistory,
    loadConversation,
    startNewConversation,
  } = useMessageHistory();

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        body: () => ({
          conversationId: activeConversationId,
          ...(guestHandoff ? { isGuestHandoff: true } : {}),
        }),
        // Capture conversationId from response header without global fetch mutation
        fetch: async (input, init) => {
          const response = await window.fetch(input, init);
          const convId = response.headers.get('X-Conversation-Id');
          if (convId && !activeConversationId) {
            setActiveConversationId(convId);
          }
          return response;
        },
      }),
    [activeConversationId, guestHandoff, setActiveConversationId]
  );

  const {
    messages,
    sendMessage,
    status,
    setMessages,
  } = useChat({
    transport,
    onFinish: () => {
      fetchConversations();
    },
  });

  const isLoading = status === 'submitted' || status === 'streaming';

  // Guest handoff: load guest chat history from localStorage and bootstrap
  useEffect(() => {
    if (!initialGuestHandoff) return;

    try {
      const stored = localStorage.getItem('bb_guest_chat_history');
      if (stored) {
        const guestMessages = JSON.parse(stored) as UIMessage[];
        // Filter out the greeting message and only keep user/assistant messages with content
        const validMessages = guestMessages.filter(
          (m) => m.id !== 'greeting' && (m.role === 'user' || m.role === 'assistant')
        );
        if (validMessages.length > 0) {
          setMessages(validMessages);
        }
        // Clear guest storage
        localStorage.removeItem('bb_guest_chat_history');
        localStorage.removeItem('bb_guest_msg_count');
      }
    } catch {
      // Ignore localStorage errors
    }

    // Clear the handoff flag after first send
    setGuestHandoff(false);
  }, [initialGuestHandoff, setMessages]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const handleLoadConversation = (conversationId: string) => {
    loadConversation(
      conversationId,
      loadConversationMessages,
      setMessages,
      () => {
        if (window.innerWidth < 768) setSidebarOpen(false);
      }
    );
  };

  const handleStartNew = () => {
    startNewConversation(setMessages);
  };

  const handleDelete = (convId: string) => {
    deleteConversation(convId, activeConversationId, handleStartNew);
  };

  const handleChatSubmit = (message: string) => {
    sendMessage({ text: message });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Sidebar backdrop (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Conversation History */}
      <div
        className={cn(
          'border-r border-gray-200 bg-gray-50 transition-all duration-300 flex flex-col',
          'fixed inset-y-0 left-0 z-40 md:relative md:z-auto',
          sidebarOpen ? 'w-72' : 'w-0 overflow-hidden'
        )}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-medium text-gray-900">
              Conversations
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={handleStartNew}
            className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
            title="New conversation"
          >
            <MessageSquarePlus className="h-4 w-4" />
          </Button>
        </div>

        {/* Conversation List */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {conversations.length === 0 ? (
              <div className="px-3 py-8 text-center">
                <p className="text-xs text-gray-500">
                  No conversations yet.
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Start chatting with Boca Banker!
                </p>
              </div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={cn(
                    'group relative flex items-center rounded-lg transition-all text-sm',
                    'hover:bg-gray-100',
                    activeConversationId === conv.id
                      ? 'bg-white border border-gray-200 text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-900'
                  )}
                >
                  <button
                    onClick={() => handleLoadConversation(conv.id)}
                    className="flex-1 text-left px-3 py-2.5 min-w-0"
                  >
                    <div className="truncate font-medium text-xs">
                      {conv.title}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      {formatDate(conv.updatedAt)}
                    </div>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(conv.id);
                    }}
                    onBlur={() => setPendingDeleteId(null)}
                    className={cn(
                      'mr-1.5 flex h-6 w-6 items-center justify-center rounded transition-all flex-shrink-0',
                      pendingDeleteId === conv.id
                        ? 'text-red-500 bg-red-50 opacity-100'
                        : 'text-gray-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100'
                    )}
                    title={pendingDeleteId === conv.id ? 'Click again to delete' : 'Delete conversation'}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Chat Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-500 hover:text-gray-900"
          >
            <ChevronLeft
              className={cn(
                'h-4 w-4 transition-transform',
                !sidebarOpen && 'rotate-180'
              )}
            />
          </Button>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-serif font-bold text-xs">
              BB
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                Boca Banker
              </h2>
              <p className="text-[10px] text-gray-500">
                Banking, Mortgage & Cost Segregation Advisor
              </p>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4">
          {loadingHistory ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 mb-4">
                <Landmark className="h-8 w-8 text-amber-600" />
              </div>
              <h3 className="text-lg font-serif font-semibold text-amber-600 mb-2">
                Welcome to Boca Banker
              </h3>
              <p className="text-sm text-gray-500 max-w-md leading-relaxed">
                Ask me anything about banking, mortgages, cost segregation,
                tax strategy, or maximizing your property investment returns.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-6 w-full max-w-lg">
                {[
                  'What is a cost segregation study?',
                  'How do I evaluate a mortgage rate?',
                  'How does bonus depreciation work?',
                  'What should I know before buying commercial property?',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => handleChatSubmit(suggestion)}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:border-gray-200 hover:shadow px-3 py-2.5 text-xs text-left text-gray-500 hover:text-gray-900 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4 pb-4">
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  role={message.role as 'user' | 'assistant'}
                  content={getTextContent(message)}
                  parts={message.parts}
                />
              ))}
              {isLoading &&
                messages[messages.length - 1]?.role !== 'assistant' && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-serif font-bold text-xs flex-shrink-0">
                      BB
                    </div>
                    <div className="bg-gray-100 text-gray-800 border-l-2 border-l-amber-500 rounded-xl rounded-bl-sm px-4 py-3">
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
          )}
        </ScrollArea>

        {/* Input Area */}
        <ChatInput onSubmit={handleChatSubmit} isLoading={isLoading} />
      </div>
    </div>
  );
}
