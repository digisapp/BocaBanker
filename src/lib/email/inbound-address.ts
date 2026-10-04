/**
 * Inbox addressing helpers. Pure (no DB, no network) so they are unit
 * testable and shared by the Resend webhook, the send path, and the AI
 * auto-reply.
 *
 * Threading model
 * ---------------
 * Every outbound email sets Reply-To to a per-thread plus-address,
 * `<inbox>+<threadId>@<inbound domain>`. Resend delivers mail for ANY local
 * part on a receiving domain, so a reply comes back already tagged with the
 * thread it belongs to. That is exact, independent of whether the
 * recipient's mail client preserves In-Reply-To, and needs no subject
 * matching. Google Workspace and most other mailboxes also deliver
 * plus-addressed mail to the base mailbox, so nothing is lost if the domain
 * is not on Resend yet.
 *
 * Which domain receives
 * ---------------------
 * `ADMIN_EMAIL_ADDRESS` names the mailbox. When it is not set, the inbox is
 * the From address (`RESEND_FROM_EMAIL`, default team@bocabanker.com), so
 * "reply to this email" keeps going where it always went. Its domain is the
 * one that needs Resend receiving + an MX record. Mail for bocabanker.com
 * itself or any *.bocabanker.com subdomain is also treated as ours, so the
 * receiving domain can move between the apex and a subdomain without a code
 * change.
 *
 * Resend webhooks are account-wide: every receiving domain on the account
 * (other projects included) fires `email.received` at every endpoint. The
 * webhook keeps only mail with at least one recipient on our domains.
 */

export const PRIMARY_DOMAIN = 'bocabanker.com';

/** Who mail goes out as. The address people see on bocabanker.com pages. */
export const DEFAULT_FROM_ADDRESS = 'team@bocabanker.com';
export const FROM_NAME = 'Boca Banker';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

function cleanEnv(name: string): string {
  return (process.env[name] || '').trim().replace(/^['"]|['"]$/g, '');
}

export function isValidEmail(value: string | null | undefined): value is string {
  return !!value && value.length <= 254 && EMAIL_RE.test(value);
}

/** Bare sender address for outbound mail (`RESEND_FROM_EMAIL`, bare or `Name <addr>`). */
export function getFromAddress(): string {
  const { email } = parseEmailAddress(cleanEnv('RESEND_FROM_EMAIL'));
  return isValidEmail(email) ? email : DEFAULT_FROM_ADDRESS;
}

/** `Boca Banker <team@bocabanker.com>` — the From header on outbound mail. */
export function getFrom(): string {
  const { name } = parseEmailAddress(cleanEnv('RESEND_FROM_EMAIL'));
  return `${name || FROM_NAME} <${getFromAddress()}>`;
}

/** The bare receiving mailbox (env override, defaults to the From address). */
export function getInboundAddress(): string {
  const raw = cleanEnv('ADMIN_EMAIL_ADDRESS');
  const { email } = parseEmailAddress(raw);
  return isValidEmail(email) ? email : getFromAddress();
}

/** Domain part of the inbound address — the domain that must receive in Resend. */
export function getInboundDomain(inboundAddress: string = getInboundAddress()): string {
  return inboundAddress.slice(inboundAddress.lastIndexOf('@') + 1).toLowerCase();
}

/** `inbox@x` + thread `t` → `inbox+t@x`. Falls back to the bare address for a non-UUID. */
export function threadReplyAddress(threadId: string, inboundAddress: string = getInboundAddress()): string {
  const at = inboundAddress.lastIndexOf('@');
  if (at < 0 || !UUID_RE.test(threadId)) return inboundAddress;
  return `${inboundAddress.slice(0, at)}+${threadId.toLowerCase()}@${inboundAddress.slice(at + 1)}`;
}

/** Bare address (+ display name) from `"Name" <a@b>`, `Name <a@b>`, `<a@b>` or `a@b`. */
export function parseEmailAddress(raw: string | null | undefined): { name: string | null; email: string } {
  const s = decodeEncodedWords((raw || '').trim());
  const m = s.match(/^"?([^"<]*?)"?\s*<([^<>\s]+@[^<>\s]+)>$/);
  if (m) return { name: m[1].trim() || null, email: m[2].trim().toLowerCase() };
  return { name: null, email: s.replace(/^<|>$/g, '').trim().toLowerCase() };
}

/**
 * RFC 2047 encoded words (`=?UTF-8?B?...?=`), how non-ASCII names like
 * "José" arrive in raw headers. Adjacent encoded words join without the
 * whitespace between them. Anything undecodable is left as-is.
 */
export function decodeEncodedWords(value: string): string {
  if (!value.includes('=?')) return value;
  return value
    .replace(/\?=\s+=\?/g, '?==?')
    .replace(/=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g, (whole, charset: string, enc: string, text: string) => {
      try {
        const bytes = enc.toUpperCase() === 'B'
          ? Buffer.from(text, 'base64')
          : Buffer.from(
              text.replace(/_/g, ' ').replace(/=([0-9A-Fa-f]{2})/g, (_m, hex: string) => String.fromCharCode(parseInt(hex, 16))),
              'latin1',
            );
        return new TextDecoder(charset).decode(bytes);
      } catch {
        return whole;
      }
    });
}

/**
 * Display name of an inbound sender. On a fetched Resend email `from` is the
 * bare address; the name only survives in the raw From header. Null when
 * there is none (callers fall back to the address).
 */
export function senderDisplayName(fromHeader: unknown, fallbackFrom?: string | null): string | null {
  const candidates = [typeof fromHeader === 'string' ? fromHeader : '', fallbackFrom || ''];
  for (const raw of candidates) {
    const { name } = parseEmailAddress(raw);
    const clean = (name || '').replace(/["<>\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
    if (clean) return clean;
  }
  return null;
}

/** Our receiving domains: the inbound address's domain, bocabanker.com, and any *.bocabanker.com. */
export function isOurInboundAddress(raw: string | null | undefined, inboundAddress: string = getInboundAddress()): boolean {
  const { email } = parseEmailAddress(raw);
  const at = email.lastIndexOf('@');
  if (at < 0) return false;
  const domain = email.slice(at + 1);
  return domain === getInboundDomain(inboundAddress) || domain === PRIMARY_DOMAIN || domain.endsWith(`.${PRIMARY_DOMAIN}`);
}

/**
 * The first recipient that is ours, or null when the mail was for another
 * project's domain on the same Resend account. Checks Resend's
 * `received_for` (envelope recipients — catches BCC) plus To/Cc/Bcc.
 */
export function findOurRecipient(
  addresses: Array<string | null | undefined>,
  inboundAddress: string = getInboundAddress(),
): string | null {
  for (const raw of addresses) {
    if (isOurInboundAddress(raw, inboundAddress)) return parseEmailAddress(raw).email;
  }
  return null;
}

/**
 * Find our thread tag in any recipient address of an inbound mail (To, Cc,
 * and Resend's `received_for` for forwarded mail). Returns null when no
 * address is `<ourLocal>+<uuid>@<ourDomain>`.
 */
export function parseThreadIdFromAddresses(
  addresses: Array<string | null | undefined>,
  inboundAddress: string = getInboundAddress(),
): string | null {
  const at = inboundAddress.lastIndexOf('@');
  if (at < 0) return null;
  const ourLocal = inboundAddress.slice(0, at).toLowerCase();
  const ourDomain = inboundAddress.slice(at + 1).toLowerCase();

  for (const raw of addresses) {
    const { email } = parseEmailAddress(raw);
    const i = email.lastIndexOf('@');
    if (i < 0 || email.slice(i + 1) !== ourDomain) continue;
    const local = email.slice(0, i);
    const plus = local.indexOf('+');
    if (plus < 0 || local.slice(0, plus) !== ourLocal) continue;
    const tag = local.slice(plus + 1);
    if (UUID_RE.test(tag)) return tag.toLowerCase();
  }
  return null;
}

/**
 * Reasons an inbound email must never receive an automatic reply, no matter
 * how confident the classifier is. Without these, an out-of-office responder
 * (or another bot) and our auto-reply ping-pong forever, and anything sent
 * from our own domain / a mailer-daemon gets a cheerful "Thanks for reaching
 * out" back.
 */
export function autoReplySuppressionReason(args: {
  from: string;
  headers?: Record<string, string | string[] | undefined> | null;
}): string | null {
  const from = (args.from || '').toLowerCase().trim();
  if (!from || !from.includes('@')) return 'no sender address';
  const localPart = from.split('@')[0];
  const domain = from.split('@')[1];
  if (domain === PRIMARY_DOMAIN || domain?.endsWith(`.${PRIMARY_DOMAIN}`)) {
    return 'sender is our own domain';
  }
  if (/^(no-?reply|do-?not-?reply|mailer-daemon|postmaster|bounce|bounces|notifications?|alerts?|auto-?reply|newsletter|marketing|promo(tions?)?)\b/.test(localPart)) {
    return `sender looks automated (${localPart})`;
  }

  const h: Record<string, string> = {};
  for (const [k, v] of Object.entries(args.headers || {})) {
    if (v == null) continue;
    h[k.toLowerCase()] = Array.isArray(v) ? v.join(' ') : String(v);
  }
  const autoSubmitted = (h['auto-submitted'] || '').trim().toLowerCase();
  if (autoSubmitted && autoSubmitted !== 'no') return `Auto-Submitted: ${autoSubmitted}`;
  const precedence = (h['precedence'] || h['x-precedence'] || '').trim().toLowerCase();
  if (/bulk|list|junk|auto[-_]reply/.test(precedence)) return `Precedence: ${precedence}`;
  if (h['x-auto-response-suppress'] || h['x-autoreply'] || h['x-autorespond'] || h['list-id'] || h['list-unsubscribe']) {
    return 'automated/list mail headers present';
  }
  return null;
}
