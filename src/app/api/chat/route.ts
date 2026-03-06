import { requireAuth, ApiError } from '@/lib/api/auth'
import { apiError } from '@/lib/api/response'
import { createChatStream, getMessageText } from '@/lib/api/chat-shared'
import { createAuthLeadCapture } from '@/lib/ai/tool-executors'
import { BOCA_BANKER_SYSTEM_PROMPT } from '@/lib/ai/boca-banker-prompt'
import { logger } from '@/lib/logger'
import { db } from '@/db'
import { chatMessages, chatConversations } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const { messages, conversationId, isGuestHandoff } = await request.json()

    let activeConversationId = conversationId

    // Create a new conversation if none provided
    if (!activeConversationId) {
      const [newConversation] = await db
        .insert(chatConversations)
        .values({
          userId: user.id,
          title: 'New Conversation',
        })
        .returning()

      activeConversationId = newConversation.id
    }

    // Guest handoff: save ALL prior messages to the new conversation
    if (isGuestHandoff && messages.length > 0) {
      for (const msg of messages) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          const content = getMessageText(msg)
          if (content) {
            await db.insert(chatMessages).values({
              conversationId: activeConversationId,
              role: msg.role,
              content,
            })
          }
        }
      }

      // Set title from first user message
      const firstUserMsg = messages.find((m: { role: string }) => m.role === 'user')
      if (firstUserMsg) {
        const content = getMessageText(firstUserMsg)
        const title = content.length > 60 ? content.substring(0, 60) + '...' : content
        await db
          .update(chatConversations)
          .set({ title, updatedAt: new Date() })
          .where(eq(chatConversations.id, activeConversationId))
      }
    } else {
      // Get the latest user message
      const lastUserMessage = messages[messages.length - 1]

      // Save user message to database
      if (lastUserMessage && lastUserMessage.role === 'user') {
        const userContent = getMessageText(lastUserMessage)

        await db.insert(chatMessages).values({
          conversationId: activeConversationId,
          role: 'user',
          content: userContent,
        })

        // Update conversation title from first user message
        const existingMessages = await db
          .select()
          .from(chatMessages)
          .where(eq(chatMessages.conversationId, activeConversationId))

        const userMessages = existingMessages.filter((m) => m.role === 'user')
        if (userMessages.length <= 1) {
          const title =
            userContent.length > 60
              ? userContent.substring(0, 60) + '...'
              : userContent

          await db
            .update(chatConversations)
            .set({ title, updatedAt: new Date() })
            .where(eq(chatConversations.id, activeConversationId))
        } else {
          await db
            .update(chatConversations)
            .set({ updatedAt: new Date() })
            .where(eq(chatConversations.id, activeConversationId))
        }
      }
    }

    const result = await createChatStream({
      messages,
      systemPrompt: BOCA_BANKER_SYSTEM_PROMPT,
      captureLeadExecutor: createAuthLeadCapture(user.id),
      maxSearchResults: 5,
      searchSources: [{ type: 'web' }, { type: 'news' }],
      onFinish: async ({ text }) => {
        if (text) {
          await db.insert(chatMessages).values({
            conversationId: activeConversationId,
            role: 'assistant',
            content: text,
          })
        }
      },
    })

    return result.toUIMessageStreamResponse({
      headers: {
        'X-Conversation-Id': activeConversationId,
      },
    })
  } catch (error) {
    if (error instanceof ApiError) return error.response
    logger.error('chat-api', 'Chat API error', error)
    return apiError('Internal Server Error')
  }
}
