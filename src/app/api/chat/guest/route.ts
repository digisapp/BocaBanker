import { streamText } from 'ai';
import { xai } from '@ai-sdk/xai';
import { getGuestCount, createGuestCountCookie } from '@/lib/guest-chat/cookie';
import { GUEST_SYSTEM_PROMPT, GUEST_SYSTEM_PROMPT_LEAD_CAPTURE } from '@/lib/ai/guest-system-prompt';

const LEAD_CAPTURE_THRESHOLD = 3;
const MAX_MESSAGE_ENTRIES = 50;

export async function POST(request: Request) {
  try {
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
    console.error('Guest chat API error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
