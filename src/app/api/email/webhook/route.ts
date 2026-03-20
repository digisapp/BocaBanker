import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { emails, emailLogs, clients } from '@/db/schema';
import { logger } from '@/lib/logger';
import { eq, ilike, or, and, desc } from 'drizzle-orm';
import crypto from 'crypto';

// ── Spam filtering ─────────────────────────────────────────────────

const SPAM_KEYWORDS = [
  'unsubscribe', 'viagra', 'lottery', 'winner', 'nigerian prince',
  'click here now', 'act now', 'limited time', 'free money',
  'make money fast', 'earn extra cash', 'no obligation',
  'you have been selected', 'congratulations you won',
  'cryptocurrency opportunity', 'bitcoin investment',
];

const SPAM_SENDER_PATTERNS = [
  /noreply@/i,
  /no-reply@/i,
  /mailer-daemon@/i,
  /postmaster@/i,
  /bounce@/i,
  /notifications?@/i,
  /newsletter@/i,
  /marketing@/i,
  /promo(tions?)?@/i,
];

function isSpam(fromEmail: string, subject: string, bodyText: string | null): boolean {
  // Check sender patterns
  if (SPAM_SENDER_PATTERNS.some((pattern) => pattern.test(fromEmail))) {
    return true;
  }

  // Check subject + body for spam keywords
  const content = `${subject} ${bodyText || ''}`.toLowerCase();
  const spamHits = SPAM_KEYWORDS.filter((kw) => content.includes(kw));
  if (spamHits.length >= 2) {
    return true;
  }

  return false;
}

// ── Subject normalization for thread matching ──────────────────────

function normalizeSubject(subject: string): string {
  // Strip Re:, Fwd:, FW:, RE: prefixes (possibly repeated)
  return subject.replace(/^(re|fwd|fw):\s*/gi, '').trim().toLowerCase();
}

// ── Webhook signature verification ─────────────────────────────────

function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) return false;

  const parts = signature.split(',');
  const timestampPart = parts.find((p) => p.startsWith('t='));
  const signaturePart = parts.find((p) => p.startsWith('v1='));

  if (!timestampPart || !signaturePart) return false;

  const timestamp = timestampPart.slice(2);
  const expectedSig = signaturePart.slice(3);

  const signedContent = `${timestamp}.${payload}`;
  const computedSig = crypto
    .createHmac('sha256', secret)
    .update(signedContent)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(computedSig),
    Buffer.from(expectedSig)
  );
}

// ── Webhook handler ────────────────────────────────────────────────

/**
 * POST /api/email/webhook
 *
 * Resend webhook — handles inbound emails and delivery status updates.
 * Public endpoint verified via webhook signature.
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

    if (webhookSecret) {
      const signature = request.headers.get('svix-signature');
      if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
        logger.error('email-webhook', 'Invalid webhook signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const body = JSON.parse(rawBody);
    const { type, data } = body;

    // ── Inbound email ──────────────────────────────────────────────
    if (type === 'email.received') {
      const {
        from: fromRaw,
        to: toEmails,
        subject,
        html,
        text: bodyText,
        email_id: resendId,
        headers,
      } = data;

      // Parse "Name <email>" format
      let parsedFromEmail = fromRaw;
      let parsedFromName: string | null = null;

      if (typeof fromRaw === 'string') {
        const match = fromRaw.match(/^(.+?)\s*<(.+?)>$/);
        if (match) {
          parsedFromName = match[1].trim().replace(/^"|"$/g, '');
          parsedFromEmail = match[2];
        }
      }

      // ── Spam filtering ────────────────────────────────────────────
      if (isSpam(parsedFromEmail, subject || '', bodyText || null)) {
        logger.info('email-webhook', `Spam filtered: ${parsedFromEmail} — "${subject}"`);
        return NextResponse.json({ success: true, filtered: 'spam' });
      }

      const toAddress = Array.isArray(toEmails) ? toEmails[0] : toEmails;

      // Try to match sender to an existing client
      const matchedClients = await db
        .select({ id: clients.id, userId: clients.userId })
        .from(clients)
        .where(ilike(clients.email, parsedFromEmail))
        .limit(1);
      const matchedClient = matchedClients[0] || null;

      // ── Thread detection ──────────────────────────────────────────
      // Priority: 1) In-Reply-To/References headers → 2) Subject match → 3) Sender match
      let threadId: string | null = null;
      let inReplyToId: string | null = null;

      const inReplyToHeader = headers?.['in-reply-to'] || headers?.['In-Reply-To'] || null;
      const referencesHeader = headers?.['references'] || headers?.['References'] || null;

      // Strategy 1: In-Reply-To / References headers
      if (inReplyToHeader || referencesHeader) {
        const headerIds = [inReplyToHeader, referencesHeader]
          .filter(Boolean)
          .join(' ')
          .match(/<([^>]+)>/g)
          ?.map((id) => id.slice(1, -1)) || [];

        if (headerIds.length > 0) {
          const originalEmails = await db
            .select({ id: emails.id, threadId: emails.threadId })
            .from(emails)
            .where(
              or(...headerIds.map((hid) => eq(emails.resendId, hid)))
            )
            .limit(1);

          if (originalEmails[0]) {
            inReplyToId = originalEmails[0].id;
            threadId = originalEmails[0].threadId || originalEmails[0].id;
          }
        }
      }

      // Strategy 2: Subject-based fallback (strip Re:/Fwd: and match)
      if (!threadId && subject) {
        const normalized = normalizeSubject(subject);
        if (normalized.length > 0) {
          // Find outbound email with matching normalized subject sent to this sender
          const subjectMatches = await db
            .select({ id: emails.id, threadId: emails.threadId, subject: emails.subject })
            .from(emails)
            .where(
              and(
                eq(emails.direction, 'outbound'),
                eq(emails.toEmail, parsedFromEmail),
              )
            )
            .orderBy(desc(emails.createdAt))
            .limit(10);

          const match = subjectMatches.find(
            (e) => normalizeSubject(e.subject) === normalized
          );
          if (match) {
            inReplyToId = match.id;
            threadId = match.threadId || match.id;
          }
        }
      }

      // Strategy 3: Sender email match (most recent outbound to them)
      if (!threadId && parsedFromEmail) {
        const recentOutbound = await db
          .select({ id: emails.id, threadId: emails.threadId })
          .from(emails)
          .where(
            and(
              eq(emails.direction, 'outbound'),
              eq(emails.toEmail, parsedFromEmail),
            )
          )
          .orderBy(desc(emails.createdAt))
          .limit(1);

        if (recentOutbound[0]) {
          inReplyToId = recentOutbound[0].id;
          threadId = recentOutbound[0].threadId || recentOutbound[0].id;
        }
      }

      // Update original email status to 'replied'
      if (inReplyToId) {
        await db
          .update(emails)
          .set({ status: 'replied' })
          .where(eq(emails.id, inReplyToId));
      }

      await db.insert(emails).values({
        userId: matchedClient?.userId || null,
        clientId: matchedClient?.id || null,
        direction: 'inbound',
        fromEmail: parsedFromEmail,
        fromName: parsedFromName,
        toEmail: toAddress,
        subject: subject || '(no subject)',
        bodyHtml: html || null,
        bodyText: bodyText || null,
        status: 'received',
        resendId: resendId || null,
        threadId,
        inReplyToId,
        isRead: false,
      });

      logger.info('email-webhook', `Inbound email from ${parsedFromEmail}, thread: ${threadId || 'new'}`);
      return NextResponse.json({ success: true });
    }

    // ── Delivery status updates ────────────────────────────────────
    if (type === 'email.delivered' || type === 'email.bounced') {
      const { email_id: resendId } = data;
      if (resendId) {
        const newStatus = type === 'email.delivered' ? 'delivered' : 'bounced';

        await db
          .update(emails)
          .set({ status: newStatus })
          .where(eq(emails.resendId, resendId));

        await db
          .update(emailLogs)
          .set({ status: newStatus })
          .where(eq(emailLogs.resendId, resendId));

        logger.info('email-webhook', `Email ${resendId} status: ${newStatus}`);
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: true, ignored: true });
  } catch (error) {
    logger.error('email-webhook', 'Webhook processing error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
