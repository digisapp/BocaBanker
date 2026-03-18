'use client';

import { useState, useCallback } from 'react';
import { logger } from '@/lib/logger';

export interface Conversation {
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

interface UseConversationsReturn {
  conversations: Conversation[];
  pendingDeleteId: string | null;
  setPendingDeleteId: (id: string | null) => void;
  fetchConversations: () => Promise<void>;
  loadConversationMessages: (conversationId: string) => Promise<StoredMessage[] | null>;
  deleteConversation: (
    convId: string,
    activeConversationId: string | null,
    onDeleted: () => void
  ) => Promise<void>;
}

export function useConversations(): UseConversationsReturn {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/history');
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch (error) {
      logger.error('useConversations', 'Failed to fetch conversations', error);
    }
  }, []);

  const loadConversationMessages = useCallback(
    async (conversationId: string): Promise<StoredMessage[] | null> => {
      try {
        const res = await fetch(
          `/api/chat/history?conversationId=${conversationId}`
        );
        if (res.ok) {
          const data = await res.json();
          return (data.messages || []).filter(
            (m: StoredMessage) => m.role !== 'system'
          );
        }
      } catch (error) {
        logger.error('useConversations', 'Failed to load conversation', error);
      }
      return null;
    },
    []
  );

  const deleteConversation = useCallback(
    async (
      convId: string,
      activeConversationId: string | null,
      onDeleted: () => void
    ) => {
      // First click: set pending. Second click: delete.
      if (pendingDeleteId !== convId) {
        setPendingDeleteId(convId);
        return;
      }
      setPendingDeleteId(null);
      try {
        const res = await fetch('/api/chat/history', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversationId: convId }),
        });
        if (res.ok) {
          if (activeConversationId === convId) {
            onDeleted();
          }
          // Refresh the conversation list
          const listRes = await fetch('/api/chat/history');
          if (listRes.ok) {
            const data = await listRes.json();
            setConversations(data.conversations || []);
          }
        }
      } catch (error) {
        logger.error('useConversations', 'Failed to delete conversation', error);
      }
    },
    [pendingDeleteId]
  );

  return {
    conversations,
    pendingDeleteId,
    setPendingDeleteId,
    fetchConversations,
    loadConversationMessages,
    deleteConversation,
  };
}
