import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/admin';

const signupSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }).max(100),
  email: z.string().email({ message: 'Invalid email address' }),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = signupSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.issues[0]?.message || 'Validation failed' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { name, email } = parsed.data;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const { error } = await supabaseAdmin.auth.signInWithOtp({
      email,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${appUrl}/api/auth/callback?next=${encodeURIComponent('/chat?from=guest')}`,
      },
    });

    if (error) {
      console.error('Guest signup OTP error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to send magic link. Please try again.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Guest signup error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
