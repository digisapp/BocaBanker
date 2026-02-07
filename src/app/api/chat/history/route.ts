import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { chatConversations, chatMessages } from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    // If a specific conversationId is provided, return its messages
    if (conversationId) {
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
        return NextResponse.json(
          { error: 'Conversation not found' },
          { status: 404 }
        );
      }

      const messages = await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.conversationId, conversationId))
        .orderBy(chatMessages.createdAt);

      return NextResponse.json({ conversation, messages });
    }

    // Otherwise return all conversations for the user
    const conversations = await db
      .select()
      .from(chatConversations)
      .where(eq(chatConversations.userId, user.id))
      .orderBy(desc(chatConversations.updatedAt));

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error('Chat history error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
