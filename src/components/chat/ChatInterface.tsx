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

export function ChatInterface() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        body: () => ({ conversationId: activeConversationId }),
      }),
    [activeConversationId]
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
    <div className="flex h-[calc(100vh-8rem)] glass-card overflow-hidden">
      {/* Sidebar - Conversation History */}
      <div
        className={cn(
          'border-r border-gold/15 bg-navy/40 transition-all duration-300 flex flex-col',
          sidebarOpen ? 'w-72' : 'w-0 overflow-hidden'
        )}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-gold/15">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-gold" />
            <span className="text-sm font-medium text-foreground">
              Conversations
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={startNewConversation}
            className="text-gold hover:text-gold-light hover:bg-gold/10"
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
                <p className="text-xs text-muted-foreground">
                  No conversations yet.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
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
                    'hover:bg-navy-lighter/60',
                    activeConversationId === conv.id
                      ? 'bg-navy-lighter border border-gold/20 text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <div className="truncate font-medium text-xs">
                    {conv.title}
                  </div>
                  <div className="text-[10px] text-muted-foreground/60 mt-0.5">
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
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gold/15">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft
              className={cn(
                'h-4 w-4 transition-transform',
                !sidebarOpen && 'rotate-180'
              )}
            />
          </Button>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gold-gradient text-navy font-serif font-bold text-xs">
              BB
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Boca Banker
              </h2>
              <p className="text-[10px] text-muted-foreground">
                Cost Segregation & Tax Strategy Advisor
              </p>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4">
          {loadingHistory ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-gold" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gold-gradient/20 mb-4">
                <Landmark className="h-8 w-8 text-gold" />
              </div>
              <h3 className="text-lg font-serif font-semibold text-gold-gradient mb-2">
                Welcome to Boca Banker
              </h3>
              <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
                I have over 40 years of experience in commercial banking, real
                estate finance, and cost segregation analysis. Ask me anything
                about accelerating depreciation, tax strategy, or maximizing
                your property investment returns.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-6 w-full max-w-lg">
                {[
                  'What is a cost segregation study?',
                  'How does bonus depreciation work?',
                  'Explain MACRS depreciation schedules',
                  'Who benefits from cost segregation?',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => handleChatSubmit(suggestion)}
                    className="glass-card-hover px-3 py-2.5 text-xs text-left text-muted-foreground hover:text-foreground transition-colors"
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
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gold-gradient text-navy font-serif font-bold text-xs flex-shrink-0">
                      BB
                    </div>
                    <div className="glass-card border-l-2 border-l-gold rounded-xl rounded-bl-sm px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse" />
                        <div
                          className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse"
                          style={{ animationDelay: '0.2s' }}
                        />
                        <div
                          className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse"
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
