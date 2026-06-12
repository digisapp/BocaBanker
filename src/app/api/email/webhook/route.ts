import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { Webhook } from 'svix';
import { db } from '@/db';
import { emails, emailLogs, clients } from '@/db/schema';
import { logger } from '@/lib/logger';
import { eq, ilike, or, and, desc, isNull, sql, type SQL } from 'drizzle-orm';
import {
  classifyAndDraftReply,
  storeClassification,
  sendAutoReply,
} from '@/lib/ai/ai-email';
import { getResend } from '@/lib/email/resend';
import { getDefaultOwnerId } from '@/lib/email/default-owner';

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

// ── Header normalization ───────────────────────────────────────────

/**
 * Resend inbound payloads may deliver headers either as a plain object
 * ({ 'In-Reply-To': '...' }) or as an array of { name, value } pairs.
 * Normalize both shapes into a lowercase-keyed record.
 */
function normalizeHeaders(raw: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!raw) return out;

  if (Array.isArray(raw)) {
    for (const entry of raw) {
      if (entry && typeof entry === 'object') {
        const { name, value } = entry as { name?: unknown; value?: unknown };
        if (typeof name === 'string' && typeof value === 'string') {
          out[name.toLowerCase()] = value;
        }
      }
    }
    return out;
  }

  if (typeof raw === 'object') {
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof value === 'string') {
        out[key.toLowerCase()] = value;
      }
    }
  }

  return out;
}

/**
 * Auto-responder loop guard: detect auto-generated mail
 * (Auto-Submitted != no, X-Autoreply/X-Autorespond, Precedence: auto_reply|bulk|junk).
 */
function isAutoResponder(headers: Record<string, string>): boolean {
  const autoSubmitted = headers['auto-submitted'];
  if (autoSubmitted && autoSubmitted.trim().toLowerCase() !== 'no') return true;
  if (headers['x-autoreply'] || headers['x-autorespond']) return true;
  const precedence = (headers['precedence'] || '').trim().toLowerCase();
  if (['auto_reply', 'auto-reply', 'bulk', 'junk'].includes(precedence)) return true;
  return false;
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

      // Idempotency: Svix retries re-deliver the same event — if we've
      // already stored this Resend email, acknowledge and stop.
      if (resendEmailId) {
        const [existing] = await db
          .select({ id: emails.id })
          .from(emails)
          .where(eq(emails.resendId, resendEmailId))
          .limit(1);
        if (existing) {
          logger.info('email-webhook', `Duplicate delivery for ${resendEmailId}, skipping`);
          return NextResponse.json({ success: true, duplicate: true });
        }
      }

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

      // Normalize headers (Resend may send an object or an array of {name, value})
      const normalizedHeaders = normalizeHeaders(headers);
      const rfcMessageId =
        normalizedHeaders['message-id']?.replace(/^<|>$/g, '').trim() || null;
      const autoGenerated = isAutoResponder(normalizedHeaders);

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

      // Spam filter — flag and store (recoverable) rather than dropping
      const spamFiltered = isSpam(parsedFromEmail, subject || '', fullText);
      if (spamFiltered) {
        logger.info('email-webhook', `Spam flagged: ${parsedFromEmail}`);
      }

      const toAddress = Array.isArray(toEmails) ? toEmails[0] : toEmails;

      // Match sender to existing client
      const matchedClients = await db
        .select({ id: clients.id, userId: clients.userId })
        .from(clients)
        .where(ilike(clients.email, parsedFromEmail))
        .limit(1);
      const matchedClient = matchedClients[0] || null;

      // Resolve owner: matched client's user, otherwise the default admin so
      // emails from unknown senders still show up in the admin inbox.
      const ownerUserId = matchedClient?.userId ?? (await getDefaultOwnerId());

      // Owner scoping for thread-matching queries (null-safe)
      const ownerCondition = ownerUserId
        ? eq(emails.userId, ownerUserId)
        : isNull(emails.userId);

      // ── Thread detection (3 tiers) — skipped for spam ─────────────
      let threadId: string | null = null;
      let inReplyToId: string | null = null;

      const inReplyToHeader = normalizedHeaders['in-reply-to'] || null;
      const referencesHeader = normalizedHeaders['references'] || null;

      // Tier 1: In-Reply-To / References headers
      if (!spamFiltered && (inReplyToHeader || referencesHeader)) {
        const headerIds = [inReplyToHeader, referencesHeader]
          .filter(Boolean)
          .join(' ')
          .match(/<([^>]+)>/g)
          ?.map((id) => id.slice(1, -1)) || [];

        if (headerIds.length > 0) {
          // RFC message-ids look like `local@domain`; our resendId column stores
          // a bare Resend UUID. Compare against the stored RFC Message-ID in
          // metadata, the full header id, and the header id's local part.
          const idConditions: SQL[] = [];
          for (const hid of headerIds) {
            idConditions.push(sql`${emails.metadata}->>'messageId' = ${hid}`);
            idConditions.push(eq(emails.resendId, hid));
            const localPart = hid.split('@')[0];
            if (localPart && localPart !== hid) {
              idConditions.push(eq(emails.resendId, localPart));
            }
          }

          const originals = await db
            .select({ id: emails.id, threadId: emails.threadId })
            .from(emails)
            .where(or(...idConditions))
            .limit(1);

          if (originals[0]) {
            inReplyToId = originals[0].id;
            threadId = originals[0].threadId || originals[0].id;
          }
        }
      }

      // Tier 2: Subject match (scoped to the resolved owner)
      if (!spamFiltered && !threadId && subject) {
        const normalized = normalizeSubject(subject);
        if (normalized.length > 0) {
          const candidates = await db
            .select({ id: emails.id, threadId: emails.threadId, subject: emails.subject })
            .from(emails)
            .where(and(
              eq(emails.direction, 'outbound'),
              eq(emails.toEmail, parsedFromEmail),
              ownerCondition,
            ))
            .orderBy(desc(emails.createdAt))
            .limit(10);

          const match = candidates.find((e) => normalizeSubject(e.subject) === normalized);
          if (match) {
            inReplyToId = match.id;
            threadId = match.threadId || match.id;
          }
        }
      }

      // Tier 3: Sender match (scoped to the resolved owner)
      if (!spamFiltered && !threadId && parsedFromEmail) {
        const [recent] = await db
          .select({ id: emails.id, threadId: emails.threadId })
          .from(emails)
          .where(and(
            eq(emails.direction, 'outbound'),
            eq(emails.toEmail, parsedFromEmail),
            ownerCondition,
          ))
          .orderBy(desc(emails.createdAt))
          .limit(1);

        if (recent) {
          inReplyToId = recent.id;
          threadId = recent.threadId || recent.id;
        }
      }

      // Insert inbound email — onConflictDoNothing backstops the idempotency
      // pre-check via the partial unique index on resend_id.
      const metadata: Record<string, unknown> = {};
      if (rfcMessageId) metadata.messageId = rfcMessageId;
      if (spamFiltered) metadata.spamFiltered = true;
      if (autoGenerated) metadata.autoGenerated = true;

      const [inserted] = await db.insert(emails).values({
        userId: ownerUserId,
        clientId: matchedClient?.id || null,
        direction: 'inbound',
        fromEmail: parsedFromEmail,
        fromName: parsedFromName,
        toEmail: toAddress,
        cc: Array.isArray(cc) ? cc.join(', ') : cc || null,
        subject: subject || '(no subject)',
        bodyHtml: fullHtml,
        bodyText: fullText,
        status: 'received',
        resendId: resendEmailId || null,
        threadId,
        inReplyToId,
        isRead: spamFiltered,
        metadata,
      }).onConflictDoNothing().returning({ id: emails.id });

      if (!inserted?.id) {
        // Conflict — a concurrent retry already inserted this email.
        logger.info('email-webhook', `Concurrent duplicate for ${resendEmailId}, skipping`);
        return NextResponse.json({ success: true, duplicate: true });
      }

      // Update original email status (only after a confirmed new insert)
      if (inReplyToId) {
        await db
          .update(emails)
          .set({ status: 'replied', repliedAt: new Date() })
          .where(eq(emails.id, inReplyToId));
      }

      logger.info('email-webhook', `Inbound from ${parsedFromEmail}, thread: ${threadId || 'new'}`);

      // ── Async AI classification (after response, up to 3 retries) ───
      // Skipped for spam and auto-generated mail (auto-responder loop guard).
      if (!spamFiltered && !autoGenerated) {
        const emailId = inserted.id;
        after(async () => {
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
                  userId: ownerUserId,
                  clientId: matchedClient?.id || null,
                  threadId,
                  messageId: rfcMessageId,
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
        });
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
