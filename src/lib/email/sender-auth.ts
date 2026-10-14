/**
 * Is an inbound message really from the address in its From header?
 *
 * From is trivially forged. Anything automated that answers a message (the
 * AI auto-reply) must only answer a sender that proved the address: a reply
 * to a forged From lands on a third party, which is how an inbox gets turned
 * into a relay for mail to people who never wrote to us. A message that
 * explicitly FAILED DMARC is also kept out of existing threads (dmarcVerdict).
 *
 * Resend's receiving servers (Amazon SES) stamp an Authentication-Results
 * header with their SPF / DKIM / DMARC verdicts. A sender can put their own
 * Authentication-Results header in a message too, so only one that starts
 * with the receiving server's authserv-id counts, and a value carrying more
 * than one DMARC verdict (two headers folded together) is refused outright.
 * Only an aligned DMARC pass proves the From address: SPF alone authenticates
 * the envelope sender, not the From a reply would go to.
 *
 * Callers pass every copy of the header folded together in message order
 * (the receiving server prepends its own, so it comes first), never one
 * picked copy. SES always states a DMARC verdict (`none` when the domain has
 * no policy), so any extra copy carrying one, agreeing or not, makes the
 * whole value unauthenticated whichever order the copies arrive in. The
 * Resend SDK (6.9) exposes no separate server-computed verdict on a received
 * email, only `headers`.
 *
 * Pure, so unit tested. Same rule as the Axleyard inbox.
 */

export const TRUSTED_AUTHSERV_ID = 'amazonses.com';

export interface SenderAuth {
  spf: string | null;
  dkim: string | null;
  dmarc: string | null;
}

export function parseAuthResults(header: string | null | undefined): SenderAuth | null {
  const value = (header || '').trim();
  if (!value) return null;
  if (!value.toLowerCase().startsWith(`${TRUSTED_AUTHSERV_ID};`)) return null;
  if ((value.match(/(?:^|[;\s])dmarc=/gi) || []).length > 1) return null;
  const pick = (key: string) => value.match(new RegExp(`(?:^|[;\\s])${key}=([a-z]+)`, 'i'))?.[1]?.toLowerCase() ?? null;
  const auth = { spf: pick('spf'), dkim: pick('dkim'), dmarc: pick('dmarc') };
  return auth.spf || auth.dkim || auth.dmarc ? auth : null;
}

export function senderAuthenticated(auth: SenderAuth | null | undefined): boolean {
  return auth?.dmarc === 'pass';
}

export type DmarcVerdict = 'pass' | 'fail' | 'none' | 'unknown';

/**
 * The DMARC verdict stored on an inbound row; it decides how far the From
 * address is trusted beyond auto-reply (threading, the UI warning).
 *
 * `fail` is the verdict acted on: the sender's domain publishes DMARC and
 * this message failed it, so the From is very likely forged. Any copy saying
 * fail counts, whatever order the copies arrive in, once the receiving
 * server's copy is present: a sender can only make its own mail look worse
 * that way, never someone else's look better. Otherwise it is the single
 * trusted verdict (parseAuthResults), and `unknown` when there is none or
 * more than one.
 */
export function dmarcVerdict(header: string | null | undefined): DmarcVerdict {
  const value = (header || '').trim();
  if (!new RegExp(`(?:^|\\s)${TRUSTED_AUTHSERV_ID.replace(/\./g, '\\.')};`, 'i').test(value)) return 'unknown';
  if (/(?:^|[;\s])dmarc=fail\b/i.test(value)) return 'fail';
  const dmarc = parseAuthResults(value)?.dmarc;
  return dmarc === 'pass' || dmarc === 'none' ? dmarc : 'unknown';
}
