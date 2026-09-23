import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, ApiError } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { db } from '@/db';
import { logger } from '@/lib/logger';
import { chatConversations, chatMessages } from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { isUuid } from '@/lib/email/ids';

/** Most recent conversations shown in the sidebar. */
const MAX_CONVERSATIONS = 100;
/** Most recent messages loaded when opening a conversation. */
const MAX_HISTORY_MESSAGES = 200;

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    // If a specific conversationId is provided, return its messages
    if (conversationId) {
      if (!isUuid(conversationId)) {
        return apiError('Conversation not found', 404);
      }
      // Verify the conversation belongs to the user
      const [conversation] = await db
        .select()
        .from(chatConversations)
        .where(
          and(
            eq(chatConversations.id, conversationId),
            eq(chatConversations.userId, user.id)
          )
        );

      if (!conversation) {
        return apiError('Conversation not found', 404);
      }

      // Bounded: newest N messages, returned in chronological order.
      const recent = await db
        .select({
          id: chatMessages.id,
          role: chatMessages.role,
          content: chatMessages.content,
          createdAt: chatMessages.createdAt,
        })
        .from(chatMessages)
        .where(eq(chatMessages.conversationId, conversationId))
        .orderBy(desc(chatMessages.createdAt), desc(chatMessages.id))
        .limit(MAX_HISTORY_MESSAGES);
      const messages = recent.reverse();

      return NextResponse.json({ conversation, messages });
    }

    // Otherwise return all conversations for the user
    const conversations = await db
      .select({
        id: chatConversations.id,
        title: chatConversations.title,
        updatedAt: chatConversations.updatedAt,
      })
      .from(chatConversations)
      .where(eq(chatConversations.userId, user.id))
      .orderBy(desc(chatConversations.updatedAt))
      .limit(MAX_CONVERSATIONS);

    return NextResponse.json({ conversations });
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('chat-api', 'Chat history error', error);
    return apiError('Internal server error');
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireAuth();
    const { conversationId } = await request.json();

    if (!isUuid(conversationId)) {
      return apiError('conversationId is required', 400);
    }

    // Verify ownership
    const [conversation] = await db
      .select({ id: chatConversations.id })
      .from(chatConversations)
      .where(
        and(
          eq(chatConversations.id, conversationId),
          eq(chatConversations.userId, user.id)
        )
      );

    if (!conversation) {
      return apiError('Conversation not found', 404);
    }

    // Delete messages first (FK), then conversation
    await db.delete(chatMessages).where(eq(chatMessages.conversationId, conversationId));
    await db.delete(chatConversations).where(eq(chatConversations.id, conversationId));

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('chat-api', 'Delete conversation error', error);
    return apiError('Internal server error');
  }
}
