import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { db } from '@/db';
import { emails, emailLogs, clients } from '@/db/schema';
import { logger } from '@/lib/logger';
import { eq, ilike, or, and, desc } from 'drizzle-orm';
import {
  classifyAndDraftReply,
  storeClassification,
  sendAutoReply,
} from '@/lib/ai/ai-email';
import { getResend } from '@/lib/email/resend';

// ── Spam filtering ─────────────────────────────────────────────────

const SPAM_KEYWORDS = [
  'unsubscribe', 'viagra', 'lottery', 'winner', 'nigerian prince',
  'click here now', 'act now', 'limited time', 'free money',
  'make money fast', 'earn extra cash', 'no obligation',
  'you have been selected', 'congratulations you won',
  'cryptocurrency opportunity', 'bitcoin investment',
];

const SPAM_SENDER_PATTERNS = [
  /noreply@/i, /no-reply@/i, /mailer-daemon@/i, /postmaster@/i,
  /bounce@/i, /notifications?@/i, /newsletter@/i, /marketing@/i,
  /promo(tions?)?@/i,
];

function isSpam(fromEmail: string, subject: string, bodyText: string | null): boolean {
  if (SPAM_SENDER_PATTERNS.some((p) => p.test(fromEmail))) return true;
  const content = `${subject} ${bodyText || ''}`.toLowerCase();
  const hits = SPAM_KEYWORDS.filter((kw) => content.includes(kw));
  return hits.length >= 2;
}

// ── Subject normalization ──────────────────────────────────────────

function normalizeSubject(subject: string): string {
  return subject.replace(/^(re|fwd|fw):\s*/gi, '').trim().toLowerCase();
}

// ── Webhook handler ────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

    // Verify Svix signature — mandatory; set RESEND_WEBHOOK_SECRET in your environment
    if (!webhookSecret) {
      logger.error('email-webhook', 'RESEND_WEBHOOK_SECRET is not configured');
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    const svixId = request.headers.get('svix-id');
    const svixTimestamp = request.headers.get('svix-timestamp');
    const svixSignature = request.headers.get('svix-signature');

    if (!svixId || !svixTimestamp || !svixSignature) {
      return NextResponse.json({ error: 'Missing Svix headers' }, { status: 401 });
    }

    try {
      const wh = new Webhook(webhookSecret);
      wh.verify(rawBody, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      });
    } catch {
      logger.error('email-webhook', 'Svix signature verification failed');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    const { type, data } = body;

    // ── Inbound email ──────────────────────────────────────────────
    if (type === 'email.received') {
      const {
        from: fromRaw,
        to: toEmails,
        subject,
        html: webhookHtml,
        text: webhookText,
        email_id: resendEmailId,
        headers,
        cc,
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

      // Fetch full email body from Resend API (webhook only sends metadata)
      let fullHtml = webhookHtml || null;
      let fullText = webhookText || null;

      if (resendEmailId) {
        try {
          const resend = getResend();
          const fullEmail = await resend.emails.get(resendEmailId);
          if (fullEmail.data) {
            fullHtml = (fullEmail.data as unknown as Record<string, unknown>).html as string || fullHtml;
            fullText = (fullEmail.data as unknown as Record<string, unknown>).text as string || fullText;
          }
        } catch (fetchErr) {
          logger.error('email-webhook', 'Failed to fetch full email body', fetchErr);
        }
      }

      // Spam filter
      if (isSpam(parsedFromEmail, subject || '', fullText)) {
        logger.info('email-webhook', `Spam filtered: ${parsedFromEmail}`);
        return NextResponse.json({ success: true, filtered: 'spam' });
      }

      const toAddress = Array.isArray(toEmails) ? toEmails[0] : toEmails;

      // Match sender to existing client
      const matchedClients = await db
        .select({ id: clients.id, userId: clients.userId })
        .from(clients)
        .where(ilike(clients.email, parsedFromEmail))
        .limit(1);
      const matchedClient = matchedClients[0] || null;

      // ── Thread detection (3 tiers) ────────────────────────────────
      let threadId: string | null = null;
      let inReplyToId: string | null = null;

      const inReplyToHeader = headers?.['in-reply-to'] || headers?.['In-Reply-To'] || null;
      const referencesHeader = headers?.['references'] || headers?.['References'] || null;

      // Tier 1: In-Reply-To / References headers
      if (inReplyToHeader || referencesHeader) {
        const headerIds = [inReplyToHeader, referencesHeader]
          .filter(Boolean)
          .join(' ')
          .match(/<([^>]+)>/g)
          ?.map((id) => id.slice(1, -1)) || [];

        if (headerIds.length > 0) {
          const originals = await db
            .select({ id: emails.id, threadId: emails.threadId })
            .from(emails)
            .where(or(...headerIds.map((hid) => eq(emails.resendId, hid))))
            .limit(1);

          if (originals[0]) {
            inReplyToId = originals[0].id;
            threadId = originals[0].threadId || originals[0].id;
          }
        }
      }

      // Tier 2: Subject match
      if (!threadId && subject) {
        const normalized = normalizeSubject(subject);
        if (normalized.length > 0) {
          const candidates = await db
            .select({ id: emails.id, threadId: emails.threadId, subject: emails.subject })
            .from(emails)
            .where(and(eq(emails.direction, 'outbound'), eq(emails.toEmail, parsedFromEmail)))
            .orderBy(desc(emails.createdAt))
            .limit(10);

          const match = candidates.find((e) => normalizeSubject(e.subject) === normalized);
          if (match) {
            inReplyToId = match.id;
            threadId = match.threadId || match.id;
          }
        }
      }

      // Tier 3: Sender match
      if (!threadId && parsedFromEmail) {
        const [recent] = await db
          .select({ id: emails.id, threadId: emails.threadId })
          .from(emails)
          .where(and(eq(emails.direction, 'outbound'), eq(emails.toEmail, parsedFromEmail)))
          .orderBy(desc(emails.createdAt))
          .limit(1);

        if (recent) {
          inReplyToId = recent.id;
          threadId = recent.threadId || recent.id;
        }
      }

      // Update original email status
      if (inReplyToId) {
        await db
          .update(emails)
          .set({ status: 'replied', repliedAt: new Date() })
          .where(eq(emails.id, inReplyToId));
      }

      // Insert inbound email
      const [inserted] = await db.insert(emails).values({
        userId: matchedClient?.userId || null,
        clientId: matchedClient?.id || null,
        direction: 'inbound',
        fromEmail: parsedFromEmail,
        fromName: parsedFromName,
        toEmail: toAddress,
        cc: cc || null,
        subject: subject || '(no subject)',
        bodyHtml: fullHtml,
        bodyText: fullText,
        status: 'received',
        resendId: resendEmailId || null,
        threadId,
        inReplyToId,
        isRead: false,
      }).returning({ id: emails.id });

      logger.info('email-webhook', `Inbound from ${parsedFromEmail}, thread: ${threadId || 'new'}`);

      // ── Async AI classification (non-blocking, up to 3 retries) ─────
      if (inserted?.id) {
        const emailId = inserted.id;
        (async () => {
          const MAX_ATTEMPTS = 3;
          for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            try {
              const classification = await classifyAndDraftReply(
                parsedFromEmail,
                parsedFromName,
                subject || '(no subject)',
                fullText,
                fullHtml,
              );
              await storeClassification(emailId, classification);
              logger.info('ai-email', `Classified ${emailId}: ${classification.category} (${classification.confidence})`);

              if (classification.autoSendable) {
                await sendAutoReply(emailId, {
                  fromEmail: parsedFromEmail,
                  fromName: parsedFromName,
                  subject: subject || '(no subject)',
                  bodyHtml: fullHtml,
                  bodyText: fullText,
                  userId: matchedClient?.userId || null,
                  clientId: matchedClient?.id || null,
                  threadId,
                }, classification);
              }
              break; // success — exit retry loop
            } catch (err) {
              if (attempt < MAX_ATTEMPTS) {
                const delay = attempt * 2000; // 2 s, 4 s
                logger.warn('ai-email', `AI classification attempt ${attempt} failed, retrying in ${delay}ms`, err);
                await new Promise((r) => setTimeout(r, delay));
              } else {
                logger.error('ai-email', `AI classification failed after ${MAX_ATTEMPTS} attempts for ${emailId}`, err);
              }
            }
          }
        })();
      }

      return NextResponse.json({ success: true });
    }

    // ── Delivery status updates ────────────────────────────────────
    if (type === 'email.delivered' || type === 'email.bounced') {
      const { email_id: resendId } = data;
      if (resendId) {
        const newStatus = type === 'email.delivered' ? 'delivered' : 'bounced';

        await db.update(emails).set({ status: newStatus }).where(eq(emails.resendId, resendId));
        await db.update(emailLogs).set({ status: newStatus }).where(eq(emailLogs.resendId, resendId));

        logger.info('email-webhook', `Email ${resendId}: ${newStatus}`);
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: true, ignored: true });
  } catch (error) {
    logger.error('email-webhook', 'Webhook error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
