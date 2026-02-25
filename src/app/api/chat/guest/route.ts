import { streamText } from 'ai';
import { xai } from '@ai-sdk/xai';
import { logger } from '@/lib/logger';
import { getGuestCount, createGuestCountCookie } from '@/lib/guest-chat/cookie';
import { GUEST_SYSTEM_PROMPT, GUEST_SYSTEM_PROMPT_LEAD_CAPTURE } from '@/lib/ai/guest-system-prompt';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

const LEAD_CAPTURE_THRESHOLD = 3;
const MAX_MESSAGE_ENTRIES = 50;

export async function POST(request: Request) {
  try {
    // Rate limit: 20 requests per minute per IP
    const ip = getClientIp(request);
    const rateLimitResult = rateLimit(`guest-chat:${ip}`, {
      maxRequests: 20,
      windowMs: 60_000,
    });

    if (!rateLimitResult.success) {
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again shortly.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)),
          },
        }
      );
    }

    const count = getGuestCount(request);

    const { messages } = await request.json();

    if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGE_ENTRIES) {
      return new Response(
        JSON.stringify({ error: 'Invalid messages' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Convert UIMessage format to CoreMessage format
    const coreMessages = messages.map((msg: { role: string; content?: string; parts?: { type: string; text?: string }[] }) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.parts
        ? msg.parts.filter((p: { type: string }) => p.type === 'text').map((p: { text?: string }) => p.text || '').join('')
        : msg.content || '',
    }));

    // Use lead capture prompt on the 3rd message only, then revert to normal
    const systemPrompt = count === LEAD_CAPTURE_THRESHOLD - 1
      ? GUEST_SYSTEM_PROMPT_LEAD_CAPTURE
      : GUEST_SYSTEM_PROMPT;

    const result = streamText({
      model: xai('grok-3'),
      system: systemPrompt,
      messages: coreMessages,
    });

    const newCount = count + 1;
    const setCookieHeader = createGuestCountCookie(newCount);

    return result.toUIMessageStreamResponse({
      headers: {
        'Set-Cookie': setCookieHeader,
      },
    });
  } catch (error) {
    logger.error('chat-api', 'Guest chat API error', error);
    return new Response(
      JSON.stringify({ error: 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
