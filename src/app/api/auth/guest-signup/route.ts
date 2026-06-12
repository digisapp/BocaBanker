import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

const signupSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }).max(100),
  email: z.string().email({ message: 'Invalid email address' }),
  propertyLocation: z.string().max(200).optional(),
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

    const { name, email, propertyLocation } = parsed.data;

    // This endpoint triggers outbound magic-link emails to arbitrary addresses,
    // so throttle both per-IP and per-target-email to prevent email bombing.
    const ip = getClientIp(request);
    const [ipLimit, emailLimit] = await Promise.all([
      rateLimit(`guest-signup:ip:${ip}`, { maxRequests: 10, windowMs: 60 * 60_000 }),
      rateLimit(`guest-signup:email:${email.toLowerCase()}`, { maxRequests: 3, windowMs: 60 * 60_000 }),
    ]);
    if (!ipLimit.success || !emailLimit.success) {
      return new Response(
        JSON.stringify({ error: 'Too many signup attempts. Please try again later.' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const { error } = await supabaseAdmin.auth.signInWithOtp({
      email,
      options: {
        data: {
          full_name: name,
          ...(propertyLocation && { property_location: propertyLocation }),
        },
        emailRedirectTo: `${appUrl}/api/auth/callback?next=${encodeURIComponent('/chat?from=guest')}`,
      },
    });

    if (error) {
      logger.error('auth-api', 'Guest signup OTP error', error);
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
    logger.error('auth-api', 'Guest signup error', error);
    return new Response(
      JSON.stringify({ error: 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
