import { NextRequest, NextResponse, after } from 'next/server';
import { Webhook } from 'svix';
import { logger } from '@/lib/logger';
import { AdminInboxService } from '@/lib/email/admin-inbox';
import { getResend, isResendConfigured } from '@/lib/email/resend';
import { classifyAndDraftReply, storeClassification, sendAutoReply } from '@/lib/ai/ai-email';
import {
  autoReplySuppressionReason,
  findOurRecipient,
  parseEmailAddress,
  parseThreadIdFromAddresses,
  senderDisplayName,
} from '@/lib/email/inbound-address';

// Resend webhook for the inbox.
//
// Inbound: Resend receives mail for ANY address on a receiving domain and
// POSTs `email.received`. That event carries METADATA ONLY — ids, bare from,
// to[], subject, attachment names. The body and the headers must be fetched
// from GET /emails/receiving/{email_id}. Replies to mail we sent arrive at
// team+<threadId>@bocabanker.com (see inbound-address.ts), which threads
// them exactly.
//
// Resend webhooks are account-wide: receiving domains of OTHER projects on
// the same account fire here too. Only mail with a recipient on our domains
// is stored; the rest is acknowledged and dropped.
//
// Delivery: `email.delivered` / `email.bounced` / `email.failed` update the
// status of the outbound row with that Resend email id.
//
// Ops: the endpoint registered in Resend must be the apex host,
// https://bocabanker.com/api/email/webhook. www redirects to the apex, and
// Svix treats every 3xx as a failed delivery.

// Body fetch + thread matching + after() AI classification (up to 3 attempts
// with backoff) + auto-reply send all run inside this invocation.
export const maxDuration = 60;
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function lowercaseKeys(raw: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!raw) return out;
  // Resend has delivered headers both as a plain object and as [{name, value}].
  if (Array.isArray(raw)) {
    for (const entry of raw) {
      if (entry && typeof entry === 'object') {
        const { name, value } = entry as { name?: unknown; value?: unknown };
        if (typeof name === 'string' && typeof value === 'string') out[name.toLowerCase()] = value;
      }
    }
    return out;
  }
  if (typeof raw === 'object') {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (v == null) continue;
      out[k.toLowerCase()] = Array.isArray(v) ? v.join(' ') : String(v);
    }
  }
  return out;
}

function toList(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string' && !!v);
  return typeof value === 'string' && value ? [value] : [];
}

export async function POST(request: NextRequest) {
  try {
    // Everything downstream trusts the sender field (inbox, LLM
    // classification, auto-replies from team@bocabanker.com), so an
    // unverified payload is an email-spoofing + outbound-spam vector. Fail closed.
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    if (!webhookSecret) {
      logger.error('email-webhook', 'RESEND_WEBHOOK_SECRET is not configured');
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    // Signature is over the raw body — read text first, parse after verify.
    const rawBody = await request.text();
    let body: { type?: string; data?: Record<string, unknown> };
    try {
      // svix verifies signature + timestamp tolerance (replay window) together
      body = new Webhook(webhookSecret).verify(rawBody, {
        'svix-id': request.headers.get('svix-id') ?? '',
        'svix-timestamp': request.headers.get('svix-timestamp') ?? '',
        'svix-signature': request.headers.get('svix-signature') ?? '',
      }) as { type?: string; data?: Record<string, unknown> };
    } catch {
      logger.warn('email-webhook', 'Svix signature verification failed');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const type = body.type;
    const data = body.data ?? {};

    // ── Inbound email ──────────────────────────────────────────────
    if (type === 'email.received') {
      const emailId = typeof data.email_id === 'string' ? data.email_id : undefined;

      // Cheap pre-filter on the event's own recipients: mail for another
      // project's domain never needs the (paid, rate-limited) fetch.
      const eventRecipients = [...toList(data.received_for), ...toList(data.to), ...toList(data.cc), ...toList(data.bcc)];
      if (eventRecipients.length > 0 && !findOurRecipient(eventRecipients)) {
        return NextResponse.json({ success: true, ignored: 'not our domain' });
      }

      // The webhook has no body/headers. Fetch the full message; without it
      // there is nothing to read or classify, so a fetch failure is returned
      // as 5xx so Svix retries (dedup in the service makes retries safe).
      let full: Awaited<ReturnType<ReturnType<typeof getResend>['emails']['receiving']['get']>>['data'] = null;
      if (emailId && isResendConfigured()) {
        const { data: fetched, error } = await getResend().emails.receiving.get(emailId);
        if (error || !fetched) {
          logger.error('email-webhook', `Failed to fetch received email ${emailId}: ${error?.message}`);
          return NextResponse.json({ error: 'Failed to fetch email content' }, { status: 502 });
        }
        full = fetched;
      } else if (!isResendConfigured()) {
        logger.warn('email-webhook', 'RESEND_API_KEY missing — storing webhook metadata only');
      }

      const recipients: string[] = [
        ...toList(data.received_for),
        ...toList(full?.to ?? data.to),
        ...toList(full?.cc ?? data.cc),
        ...toList(full?.bcc ?? data.bcc),
      ];
      const to = findOurRecipient(recipients);
      if (!to) {
        return NextResponse.json({ success: true, ignored: 'not our domain' });
      }

      const headers = { ...lowercaseKeys(data.headers), ...lowercaseKeys(full?.headers) };
      const fromRaw = typeof (full?.from ?? data.from) === 'string' ? String(full?.from ?? data.from) : '';
      const { email: from } = parseEmailAddress(fromRaw);
      if (!from || !from.includes('@')) {
        // Malformed payload: acknowledge so Svix doesn't retry it forever.
        logger.warn('email-webhook', `Ignoring email ${emailId} with no sender`);
        return NextResponse.json({ success: true, ignored: 'no sender' });
      }
      // Resend's `from` is the bare address; the display name only survives
      // in the raw From header.
      const fromName = senderDisplayName(headers['from'], fromRaw);
      const subject = String(full?.subject || data.subject || '(no subject)');
      const messageId =
        (headers['message-id'] || full?.message_id || (typeof data.message_id === 'string' ? data.message_id : '') || '')
          .replace(/^<|>$/g, '')
          .trim() || null;
      const inReplyToHeader = headers['in-reply-to'] || null;
      const referencesHeader = headers['references'] || null;
      const threadIdHint = parseThreadIdFromAddresses(recipients);
      const cc = toList(full?.cc ?? data.cc).map((c) => parseEmailAddress(c).email);
      const attachments = ((full?.attachments ?? data.attachments ?? []) as Array<{
        id?: string; filename?: string; content_type?: string; size?: number;
      }>)
        .filter((a) => typeof a?.id === 'string' && typeof a?.filename === 'string')
        .map((a) => ({ id: a.id!, filename: a.filename!, contentType: a.content_type || '', size: a.size }));
      // Auto-responders, bounces and list mail: stored, never classified or answered.
      const autoGenerated = autoReplySuppressionReason({ from, headers }) !== null;

      const text = full?.text || (typeof data.text === 'string' ? data.text : '') || null;
      const html = full?.html || (typeof data.html === 'string' ? data.html : '') || null;

      const stored = await AdminInboxService.storeInboundEmail({
        from,
        fromName,
        to,
        subject,
        text,
        html,
        messageId,
        inReplyToHeader,
        referencesHeader,
        threadIdHint,
        resendEmailId: emailId,
        cc,
        attachments,
        autoGenerated,
      });

      if (!stored) {
        return NextResponse.json({ success: true, duplicate: true });
      }

      logger.info('email-webhook', `Inbound from ${from} for ${to}: ${subject} (thread ${stored.threadId})`);

      // ── Async AI classification (after the 200, up to 3 attempts) ───
      // after() keeps the serverless function alive until it finishes — a
      // bare floating promise gets frozen once the response returns.
      // Skipped for spam and auto-generated mail (auto-responder loop guard).
      if (!stored.isSpam && !autoGenerated && process.env.XAI_API_KEY) {
        after(async () => {
          // Retry only the classification + store. The auto-reply is sent at
          // most once, outside the retry loop — a failure after a successful
          // send must never trigger a second email to the sender.
          const MAX_ATTEMPTS = 3;
          let classification: Awaited<ReturnType<typeof classifyAndDraftReply>> | null = null;
          for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            try {
              classification = await classifyAndDraftReply(from, fromName, subject, text, html);
              await storeClassification(stored.id, classification);
              logger.info('ai-email', `Classified ${stored.id}: ${classification.category} (${classification.confidence})`);
              break;
            } catch (err) {
              classification = null;
              if (attempt < MAX_ATTEMPTS) {
                const delay = attempt * 2000; // 2 s, 4 s
                logger.warn('ai-email', `AI classification attempt ${attempt} failed, retrying in ${delay}ms`, err);
                await new Promise((r) => setTimeout(r, delay));
              } else {
                logger.error('ai-email', `AI classification failed after ${MAX_ATTEMPTS} attempts for ${stored.id}`, err);
              }
            }
          }

          if (classification?.autoSendable) {
            try {
              const auto = await sendAutoReply(stored.id, {
                fromEmail: from,
                fromName,
                subject,
                bodyHtml: html,
                bodyText: text,
                userId: stored.userId,
                clientId: stored.clientId,
                threadId: stored.threadId,
                createdAt: stored.createdAt,
                messageId,
                headers,
              }, classification);
              if (!auto.sent) logger.info('ai-email', `No auto-reply for ${stored.id}: ${auto.reason}`);
            } catch (err) {
              logger.error('ai-email', `Auto-reply failed for ${stored.id}`, err);
            }
          }
        });
      }

      return NextResponse.json({ success: true, stored: true });
    }

    // ── Delivery status updates for mail we sent ───────────────────
    // Other projects' sends on the same account arrive here too; the update
    // is keyed by Resend id + our outbound direction, so they match nothing.
    if (type === 'email.delivered' || type === 'email.bounced' || type === 'email.failed') {
      const resendId = typeof data.email_id === 'string' ? data.email_id : undefined;
      if (resendId) {
        const status = type === 'email.delivered' ? 'delivered' : type === 'email.bounced' ? 'bounced' : 'failed';
        await AdminInboxService.updateDeliveryStatus(resendId, status);
        logger.info('email-webhook', `Email ${resendId}: ${status}`);
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: true, ignored: true });
  } catch (error) {
    logger.error('email-webhook', 'Webhook error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
