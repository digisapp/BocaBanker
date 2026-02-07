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
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
}

interface StoredMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

function getTextContent(message: UIMessage): string {
  if (message.parts) {
    return message.parts
      .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map((p) => p.text)
      .join('');
  }
  return '';
}

interface ChatInterfaceProps {
  initialGuestHandoff?: boolean;
}

export function ChatInterface({ initialGuestHandoff = false }: ChatInterfaceProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [guestHandoff, setGuestHandoff] = useState(initialGuestHandoff);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        body: () => ({
          conversationId: activeConversationId,
          ...(guestHandoff ? { isGuestHandoff: true } : {}),
        }),
      }),
    [activeConversationId, guestHandoff]
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

  // Capture conversationId from response headers via a fetch wrapper
  useEffect(() => {
    if (activeConversationId) return;

    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request)?.url;
      if (url?.includes('/api/chat') && !url?.includes('/history') && !url?.includes('/guest')) {
        const convId = response.headers.get('X-Conversation-Id');
        if (convId) {
          setActiveConversationId(convId);
          window.fetch = originalFetch; // restore after capture
        }
      }
      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [activeConversationId]);

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

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/history');
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const loadConversation = async (conversationId: string) => {
    setLoadingHistory(true);
    try {
      const res = await fetch(
        `/api/chat/history?conversationId=${conversationId}`
      );
      if (res.ok) {
        const data = await res.json();
        const loadedMessages: UIMessage[] = (data.messages || [])
          .filter((m: StoredMessage) => m.role !== 'system')
          .map((m: StoredMessage) => ({
            id: m.id,
            role: m.role as 'user' | 'assistant',
            parts: [{ type: 'text' as const, text: m.content }],
          }));

        setMessages(loadedMessages);
        setActiveConversationId(conversationId);
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const startNewConversation = () => {
    setActiveConversationId(null);
    setMessages([]);
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
      {/* Sidebar - Conversation History */}
      <div
        className={cn(
          'border-r border-gray-200 bg-gray-50 transition-all duration-300 flex flex-col',
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
            onClick={startNewConversation}
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
                <button
                  key={conv.id}
                  onClick={() => loadConversation(conv.id)}
                  className={cn(
                    'w-full text-left px-3 py-2.5 rounded-lg transition-all text-sm',
                    'hover:bg-gray-100',
                    activeConversationId === conv.id
                      ? 'bg-white border border-gray-200 text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-900'
                  )}
                >
                  <div className="truncate font-medium text-xs">
                    {conv.title}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">
                    {formatDate(conv.updatedAt)}
                  </div>
                </button>
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
