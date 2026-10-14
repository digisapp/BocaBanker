/**
 * Where does mail for the inbound domain actually go?
 *
 * Resend can have receiving switched on and still get nothing: senders
 * deliver to whatever the domain's MX record names, and that record lives at
 * the DNS host (GoDaddy for bocabanker.com), not in Resend. This looks it up
 * live, read-only, so the status check can say which half is missing.
 *
 * Lookups are bounded and never throw: a slow or failing resolver makes the
 * answer `unknown`, it never breaks the status route.
 */
import { resolveMx, resolveNs } from 'node:dns/promises';

const LOOKUP_TIMEOUT_MS = 2500;

export type MxState =
  /** The most preferred MX is Resend's (Amazon SES inbound). */
  | 'resend'
  /** Mail is delivered somewhere else (Google Workspace, an old host…). */
  | 'other'
  /** No MX at all (or a null MX): nothing can deliver mail to the domain. */
  | 'none'
  /** The lookup failed or timed out. */
  | 'unknown';

export interface MxRecord {
  exchange: string;
  priority: number;
}

export interface MxCheck {
  state: MxState;
  /** MX records, most preferred (lowest priority number) first. */
  records: MxRecord[];
  /** Host that gets the mail: the most preferred MX. Null when there is none. */
  preferred: string | null;
  /** A Resend MX is listed, but another host outranks it and gets the mail. */
  resendOutranked: boolean;
  /** Why the lookup failed (state `unknown`). */
  error?: string;
}

const bare = (host: string) => host.trim().toLowerCase().replace(/\.$/, '');

/**
 * Resend receives through Amazon SES inbound, `inbound-smtp.<region>.amazonaws.com`.
 * `expected` is the exact value Resend lists for the domain, when known.
 */
export function isResendMxHost(exchange: string, expected?: string | null): boolean {
  const host = bare(exchange);
  if (!host) return false;
  if (expected && host === bare(expected)) return true;
  return host.includes('inbound-smtp') || host.endsWith('.amazonaws.com') || host.includes('resend');
}

/** Pure: what a set of MX records means for Resend receiving. */
export function classifyMx(records: MxRecord[], expected?: string | null): MxCheck {
  // A null MX (`0 .`, RFC 7505) says "this domain takes no mail".
  const sorted = records
    .map((r) => ({ exchange: bare(r.exchange), priority: r.priority }))
    .filter((r) => r.exchange)
    .sort((a, b) => a.priority - b.priority);
  if (sorted.length === 0) return { state: 'none', records: [], preferred: null, resendOutranked: false };

  // Senders use the lowest priority number; ties share the mail, so every
  // top-priority host must be Resend's or some mail goes elsewhere.
  const top = sorted.filter((r) => r.priority === sorted[0].priority);
  const preferredIsResend = top.every((r) => isResendMxHost(r.exchange, expected));
  const preferred = (top.find((r) => !isResendMxHost(r.exchange, expected)) ?? top[0]).exchange;
  return {
    state: preferredIsResend ? 'resend' : 'other',
    records: sorted,
    preferred,
    resendOutranked: !preferredIsResend && sorted.some((r) => isResendMxHost(r.exchange, expected)),
  };
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`DNS lookup timed out after ${ms} ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function errorCode(err: unknown): string | undefined {
  return err && typeof err === 'object' && 'code' in err ? String((err as { code: unknown }).code) : undefined;
}

export async function checkMx(domain: string, expected?: string | null, timeoutMs = LOOKUP_TIMEOUT_MS): Promise<MxCheck> {
  try {
    return classifyMx(await withTimeout(resolveMx(domain), timeoutMs), expected);
  } catch (err) {
    // ENODATA: the name exists but has no MX. ENOTFOUND: the name does not
    // exist. Either way no mail reaches the domain.
    const code = errorCode(err);
    if (code === 'ENODATA' || code === 'ENOTFOUND') {
      return { state: 'none', records: [], preferred: null, resendOutranked: false };
    }
    return {
      state: 'unknown',
      records: [],
      preferred: null,
      resendOutranked: false,
      error: code || (err instanceof Error ? err.message : 'DNS lookup failed'),
    };
  }
}

const DNS_PROVIDERS: Array<[RegExp, string]> = [
  [/\.domaincontrol\.com$/, 'GoDaddy'],
  [/\.cloudflare\.com$/, 'Cloudflare'],
  [/\.vercel-dns\.com$/, 'Vercel'],
  [/\.awsdns-[\w-]+\.\w+$/, 'Route 53'],
  [/\.registrar-servers\.com$/, 'Namecheap'],
];

/** Where the zone's records are edited, by its nameservers (`ns39.domaincontrol.com` → GoDaddy). */
export function dnsProviderName(nameservers: string[]): string | null {
  for (const ns of nameservers.map(bare)) {
    const hit = DNS_PROVIDERS.find(([re]) => re.test(ns));
    if (hit) return hit[1];
  }
  return null;
}

/** DNS provider of a zone, or null when unknown or the lookup fails. */
export async function lookupDnsProvider(zone: string, timeoutMs = LOOKUP_TIMEOUT_MS): Promise<string | null> {
  try {
    return dnsProviderName(await withTimeout(resolveNs(zone), timeoutMs));
  } catch {
    return null;
  }
}
