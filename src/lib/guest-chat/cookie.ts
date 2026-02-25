import crypto from 'crypto';

const SECRET = process.env.GUEST_CHAT_SECRET;
if (!SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('GUEST_CHAT_SECRET environment variable is required in production');
}
const SIGNING_KEY = SECRET || 'dev-guest-secret-local-only';
const COOKIE_NAME = 'bb_guest_count';
const MAX_AGE = 86400; // 24 hours

interface GuestPayload {
  count: number;
  ts: number;
}

function sign(payload: GuestPayload): string {
  const data = JSON.stringify(payload);
  const hmac = crypto.createHmac('sha256', SIGNING_KEY).update(data).digest('hex');
  return `${Buffer.from(data).toString('base64')}.${hmac}`;
}

function verify(cookie: string): GuestPayload | null {
  const [b64, hmac] = cookie.split('.');
  if (!b64 || !hmac) return null;

  try {
    const data = Buffer.from(b64, 'base64').toString('utf-8');
    const expected = crypto.createHmac('sha256', SIGNING_KEY).update(data).digest('hex');
    if (hmac !== expected) return null;
    return JSON.parse(data) as GuestPayload;
  } catch {
    return null;
  }
}

export function getGuestCount(request: Request): number {
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  if (!match) return 0;

  const payload = verify(decodeURIComponent(match[1]));
  if (!payload) return 0;

  // Expire after 24h
  if (Date.now() - payload.ts > MAX_AGE * 1000) return 0;

  return payload.count;
}

export function createGuestCountCookie(newCount: number): string {
  const payload: GuestPayload = { count: newCount, ts: Date.now() };
  const value = sign(payload);
  return `${COOKIE_NAME}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}`;
}
