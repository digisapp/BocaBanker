import { streamText } from 'ai';
import { xai } from '@ai-sdk/xai';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { chatMessages, chatConversations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { BOCA_BANKER_SYSTEM_PROMPT } from '@/lib/ai/boca-banker-prompt';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { messages, conversationId, isGuestHandoff } = await request.json();

    let activeConversationId = conversationId;

    // Create a new conversation if none provided
    if (!activeConversationId) {
      const [newConversation] = await db
        .insert(chatConversations)
        .values({
          userId: user.id,
          title: 'New Conversation',
        })
        .returning();

      activeConversationId = newConversation.id;
    }

    // Extract text content from UIMessage parts or plain content
    const getMessageContent = (msg: { content?: string; parts?: { type: string; text?: string }[] }): string => {
      if (msg.parts) {
        return msg.parts
          .filter((p: { type: string }) => p.type === 'text')
          .map((p: { text?: string }) => p.text || '')
          .join('');
      }
      return msg.content || '';
    };

    // Guest handoff: save ALL prior messages to the new conversation
    if (isGuestHandoff && messages.length > 0) {
      for (const msg of messages) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          const content = getMessageContent(msg);
          if (content) {
            await db.insert(chatMessages).values({
              conversationId: activeConversationId,
              role: msg.role,
              content,
            });
          }
        }
      }

      // Set title from first user message
      const firstUserMsg = messages.find((m: { role: string }) => m.role === 'user');
      if (firstUserMsg) {
        const content = getMessageContent(firstUserMsg);
        const title = content.length > 60 ? content.substring(0, 60) + '...' : content;
        await db
          .update(chatConversations)
          .set({ title, updatedAt: new Date() })
          .where(eq(chatConversations.id, activeConversationId));
      }
    } else {
      // Get the latest user message
      const lastUserMessage = messages[messages.length - 1];

      // Save user message to database
      if (lastUserMessage && lastUserMessage.role === 'user') {
        const userContent = getMessageContent(lastUserMessage);

        await db.insert(chatMessages).values({
          conversationId: activeConversationId,
          role: 'user',
          content: userContent,
        });

        // Update conversation title from first user message
        const existingMessages = await db
          .select()
          .from(chatMessages)
          .where(eq(chatMessages.conversationId, activeConversationId));

        // If this is the first user message, use it to set the title
        const userMessages = existingMessages.filter((m) => m.role === 'user');
        if (userMessages.length <= 1) {
          const title =
            userContent.length > 60
              ? userContent.substring(0, 60) + '...'
              : userContent;

          await db
            .update(chatConversations)
            .set({ title, updatedAt: new Date() })
            .where(eq(chatConversations.id, activeConversationId));
        } else {
          await db
            .update(chatConversations)
            .set({ updatedAt: new Date() })
            .where(eq(chatConversations.id, activeConversationId));
        }
      }
    }

    // Convert UIMessage format to CoreMessage format for the AI SDK
    const coreMessages = messages.map((msg: { role: string; content?: string; parts?: { type: string; text?: string }[] }) => ({
      role: msg.role,
      content: getMessageContent(msg),
    }));

    const result = streamText({
      model: xai('grok-3'),
      system: BOCA_BANKER_SYSTEM_PROMPT,
      messages: coreMessages,
      onFinish: async ({ text }) => {
        // Save assistant response to database
        await db.insert(chatMessages).values({
          conversationId: activeConversationId,
          role: 'assistant',
          content: text,
        });
      },
    });

    return result.toUIMessageStreamResponse({
      headers: {
        'X-Conversation-Id': activeConversationId,
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
