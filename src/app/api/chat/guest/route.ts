import { streamText } from 'ai';
import { xai } from '@ai-sdk/xai';
import { getGuestCount, createGuestCountCookie } from '@/lib/guest-chat/cookie';
import { GUEST_SYSTEM_PROMPT } from '@/lib/ai/guest-system-prompt';

const MAX_GUEST_MESSAGES = 3;
const MAX_MESSAGE_ENTRIES = 7;

export async function POST(request: Request) {
  try {
    const count = getGuestCount(request);

    if (count >= MAX_GUEST_MESSAGES) {
      return new Response(
        JSON.stringify({ error: 'Guest message limit reached' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

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

    const result = streamText({
      model: xai('grok-3'),
      system: GUEST_SYSTEM_PROMPT,
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
    console.error('Guest chat API error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
