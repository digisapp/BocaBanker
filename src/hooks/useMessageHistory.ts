'use client';

import { useState, useCallback } from 'react';
import type { UIMessage } from 'ai';

interface StoredMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

interface UseMessageHistoryReturn {
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  loadingHistory: boolean;
  loadConversation: (
    conversationId: string,
    fetchMessages: (id: string) => Promise<StoredMessage[] | null>,
    setMessages: (messages: UIMessage[]) => void,
    closeSidebarOnMobile: () => void
  ) => Promise<void>;
  startNewConversation: (setMessages: (messages: UIMessage[]) => void) => void;
}

export function useMessageHistory(): UseMessageHistoryReturn {
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadConversation = useCallback(
    async (
      conversationId: string,
      fetchMessages: (id: string) => Promise<StoredMessage[] | null>,
      setMessages: (messages: UIMessage[]) => void,
      closeSidebarOnMobile: () => void
    ) => {
      setLoadingHistory(true);
      try {
        const storedMessages = await fetchMessages(conversationId);
        if (storedMessages) {
          const loadedMessages: UIMessage[] = storedMessages.map(
            (m: StoredMessage) => ({
              id: m.id,
              role: m.role as 'user' | 'assistant',
              parts: [{ type: 'text' as const, text: m.content }],
            })
          );
          setMessages(loadedMessages);
          setActiveConversationId(conversationId);
          closeSidebarOnMobile();
        }
      } finally {
        setLoadingHistory(false);
      }
    },
    []
  );

  const startNewConversation = useCallback(
    (setMessages: (messages: UIMessage[]) => void) => {
      setActiveConversationId(null);
      setMessages([]);
    },
    []
  );

  return {
    activeConversationId,
    setActiveConversationId,
    loadingHistory,
    loadConversation,
    startNewConversation,
  };
}
