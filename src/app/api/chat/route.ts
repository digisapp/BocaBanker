import { requireAuth, ApiError } from '@/lib/api/auth'
import { apiError } from '@/lib/api/response'
import { createChatStream, getMessageText } from '@/lib/api/chat-shared'
import { createAuthLeadCapture } from '@/lib/ai/tool-executors'
import { BOCA_BANKER_SYSTEM_PROMPT } from '@/lib/ai/boca-banker-prompt'
import { logger } from '@/lib/logger'
import { rateLimit } from '@/lib/rate-limit'
import { db } from '@/db'
import { chatMessages, chatConversations } from '@/db/schema'
import { and, desc, eq } from 'drizzle-orm'

// Streaming responses with up to 5 tool steps + web search can exceed the
// default function timeout.
export const maxDuration = 60

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
/** Hard cap on the history array the client may post. */
const MAX_MESSAGES = 400
/** Only the most recent messages are sent to the model (bounds token cost). */
const MODEL_CONTEXT_MESSAGES = 40
/** Max characters for the newly submitted user message. */
const MAX_USER_MESSAGE_CHARS = 8000

export async function POST(request: Request) {
  try {
    const user = await requireAuth()

    // 30 messages per minute per authenticated user
    const rl = await rateLimit(`chat:${user.id}`, { maxRequests: 30, windowMs: 60_000 })
    if (!rl.success) {
      return apiError('Rate limit exceeded. Please wait before sending another message.', 429)
    }
    const { messages, conversationId, isGuestHandoff, trigger } = await request.json()

    if (!Array.isArray(messages) || messages.length === 0) {
      return apiError('messages must be a non-empty array', 400)
    }
    if (messages.length > MAX_MESSAGES) {
      return apiError(`Conversation is too long (max ${MAX_MESSAGES} messages). Please start a new conversation.`, 400)
    }

    const lastMessage = messages[messages.length - 1]
    if (
      lastMessage?.role === 'user' &&
      getMessageText(lastMessage).length > MAX_USER_MESSAGE_CHARS
    ) {
      return apiError(`Message is too long (max ${MAX_USER_MESSAGE_CHARS} characters)`, 400)
    }

    let activeConversationId = conversationId

    // Verify the caller owns the conversation they're appending to
    if (activeConversationId) {
      if (typeof activeConversationId !== 'string' || !UUID_RE.test(activeConversationId)) {
        return apiError('Invalid conversationId', 400)
      }
      const [conversation] = await db
        .select({ id: chatConversations.id })
        .from(chatConversations)
        .where(
          and(
            eq(chatConversations.id, activeConversationId),
            eq(chatConversations.userId, user.id)
          )
        )
        .limit(1)
      if (!conversation) {
        return apiError('Conversation not found', 404)
      }
    }

    // Create a new conversation if none provided
    const isNewConversation = !activeConversationId
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

    const makeTitle = (content: string) =>
      content.length > 60 ? content.substring(0, 60) + '...' : content

    // Guest handoff: save ALL prior messages to the new conversation
    if (isGuestHandoff && messages.length > 0) {
      // Single batched insert (was one round-trip per message). Rows in one
      // statement would share the same now() default, so assign strictly
      // increasing timestamps to keep the history ordered on reload.
      const baseTime = Date.now()
      const rows = messages
        .filter((msg: { role: string }) => msg.role === 'user' || msg.role === 'assistant')
        .map((msg: { role: 'user' | 'assistant' }) => ({
          role: msg.role,
          content: getMessageText(msg),
        }))
        .filter((row: { content: string }) => row.content)
        .map((row: { role: 'user' | 'assistant'; content: string }, i: number) => ({
          ...row,
          conversationId: activeConversationId,
          createdAt: new Date(baseTime + i),
        }))

      if (rows.length > 0) {
        await db.insert(chatMessages).values(rows)
      }

      // Set title from first user message
      const firstUserMsg = messages.find((m: { role: string }) => m.role === 'user')
      if (firstUserMsg) {
        await db
          .update(chatConversations)
          .set({ title: makeTitle(getMessageText(firstUserMsg)), updatedAt: new Date() })
          .where(eq(chatConversations.id, activeConversationId))
      }
    } else if (lastMessage && lastMessage.role === 'user') {
      const userContent = getMessageText(lastMessage)

      // On a regenerate (retry after an error) the original request may
      // already have persisted this user message — don't store it twice.
      let alreadySaved = false
      if (trigger === 'regenerate-message' && !isNewConversation) {
        const [latest] = await db
          .select({ role: chatMessages.role, content: chatMessages.content })
          .from(chatMessages)
          .where(eq(chatMessages.conversationId, activeConversationId))
          .orderBy(desc(chatMessages.createdAt))
          .limit(1)
        alreadySaved = latest?.role === 'user' && latest.content === userContent
      }

      if (!alreadySaved) {
        await db.insert(chatMessages).values({
          conversationId: activeConversationId,
          role: 'user',
          content: userContent,
        })
      }

      // Title the conversation from its first user message. Only a brand new
      // conversation needs a title — no need to load the whole history.
      await db
        .update(chatConversations)
        .set(
          isNewConversation
            ? { title: makeTitle(userContent), updatedAt: new Date() }
            : { updatedAt: new Date() }
        )
        .where(eq(chatConversations.id, activeConversationId))
    }

    const result = await createChatStream({
      // Bound model input: only the most recent turns are sent to the LLM.
      messages: messages.slice(-MODEL_CONTEXT_MESSAGES),
      systemPrompt: BOCA_BANKER_SYSTEM_PROMPT,
      captureLeadExecutor: createAuthLeadCapture(user.id),
      maxSearchResults: 5,
      searchSources: [{ type: 'web' }, { type: 'news' }],
      onFinish: async ({ text, steps }) => {
        // `text` is only the LAST step's text; with tool use the answer may
        // span multiple steps, so join all step texts.
        const content =
          steps?.map((s) => s.text).filter(Boolean).join('\n\n') || text
        if (content) {
          try {
            await db.insert(chatMessages).values({
              conversationId: activeConversationId,
              role: 'assistant',
              content,
            })
          } catch (err) {
            logger.error('chat-api', 'Failed to persist assistant message', err)
          }
        }
      },
    })

    // Drain the stream server-side so onFinish (message persistence) still
    // runs if the client disconnects mid-generation.
    void result.consumeStream()

    return result.toUIMessageStreamResponse({
      headers: {
        'X-Conversation-Id': activeConversationId,
      },
      onError: (error) => {
        logger.error('chat-api', 'Chat stream error', error)
        return 'Boca Banker ran into a problem generating a response. Please try again.'
      },
    })
  } catch (error) {
    if (error instanceof ApiError) return error.response
    logger.error('chat-api', 'Chat API error', error)
    return apiError('Internal Server Error')
  }
}
