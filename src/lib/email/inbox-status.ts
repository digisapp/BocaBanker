/**
 * Is the inbox actually able to receive mail?
 *
 * "No emails" on an inbox page can mean two very different things: nobody
 * wrote, or nothing can arrive. This asks Resend (read-only), live DNS and
 * the environment, and spells out exactly which setting / record is missing
 * and where to fix it, so the Email page can show it. Never throws: whatever
 * can't be checked becomes a problem line instead.
 */
import { getResend, isResendConfigured } from './resend';
import { getFrom, getInboundAddress, getInboundDomain, PRIMARY_DOMAIN } from './inbound-address';
import { checkMx, classifyMx, lookupDnsProvider, type MxCheck } from './inbound-mx';

// www.bocabanker.com 308s to the apex (next.config.ts), and Svix treats
// every 3xx as a failed delivery, so the webhook must point at the apex.
export const CANONICAL_WEBHOOK_URL = 'https://bocabanker.com/api/email/webhook';

export interface DnsRecord {
  record: 'DKIM' | 'SPF' | 'Receiving' | string;
  type: 'TXT' | 'MX' | 'CNAME' | string;
  /** Host as you type it at the registrar (relative to the bocabanker.com zone). */
  host: string;
  value: string;
  priority?: number;
  status: 'verified' | 'pending' | 'failed' | 'not_started' | 'missing' | string;
}

export interface InboxStatus {
  checkedAt: string;
  inboundAddress: string;
  inboundDomain: string;
  from: string;
  env: { resendApiKey: boolean; webhookSecret: boolean; xaiApiKey: boolean };
  /** Where the zone's DNS records are edited (`GoDaddy`), from its nameservers. */
  dnsHost: string | null;
  domain: {
    found: boolean;
    status: string | null;
    sending: string | null;
    receiving: string | null;
    region: string | null;
    records: DnsRecord[];
  };
  /** Live DNS: where mail for the inbound domain is delivered. */
  mx: MxCheck & {
    /** The MX Resend wants, as typed at the DNS host. */
    expected: { host: string; value: string; priority: number };
  };
  webhook: {
    found: boolean;
    endpoint: string | null;
    status: string | null;
    events: string[];
    /** Endpoint is the apex host (www redirects, which Svix counts as failure). */
    canonical: boolean;
    hasReceivedEvent: boolean;
  };
  /** Everything needed for mail to arrive in /email is in place. */
  ready: boolean;
  /** Human-readable blockers, in the order to fix them. */
  problems: string[];
  error?: string;
}

/** Registrar host field for a record under the bocabanker.com zone. */
function zoneHost(fqdnOrRelative: string, domainName: string): string {
  // Resend already returns names relative to the registered zone
  // (`resend._domainkey.inbound`, `send.inbound`); keep those. For the
  // receiving MX we build the host ourselves from the domain name.
  if (fqdnOrRelative === domainName) {
    return domainName === PRIMARY_DOMAIN ? '@' : domainName.replace(`.${PRIMARY_DOMAIN}`, '');
  }
  return fqdnOrRelative;
}

type Page<T> = { data: { data: T[]; has_more: boolean } | null; error: { message: string } | null };

/**
 * Every item of a paginated Resend list. The account is shared with other
 * businesses, so ours may not be on the first page (default 20). Bounded.
 */
async function listAll<T extends { id: string }>(
  label: string,
  fetchPage: (opts: { limit: number; after?: string }) => Promise<Page<T>>,
): Promise<T[]> {
  const all: T[] = [];
  let after: string | undefined;
  for (let i = 0; i < 5; i++) {
    const res = await fetchPage(after ? { limit: 100, after } : { limit: 100 });
    if (res.error) throw new Error(`Resend ${label}: ${res.error.message}`);
    const items = res.data?.data ?? [];
    all.push(...items);
    if (!res.data?.has_more || items.length === 0) break;
    after = items[items.length - 1].id;
  }
  return all;
}

const OUR_WEBHOOK_PATH = /bocabanker\.com\/api\/email\/webhook\/?$/i;

/** Ours among the account's webhooks: exact URL, then email.received, then enabled. */
export function pickWebhook<T extends { endpoint: string; status: string; events: readonly string[] | null }>(hooks: T[]): T | null {
  const rank = (w: T) =>
    (w.endpoint === CANONICAL_WEBHOOK_URL ? 8 : 0) +
    (OUR_WEBHOOK_PATH.test(w.endpoint) ? 4 : 0) +
    ((w.events ?? []).includes('email.received') ? 2 : 0) +
    (w.status === 'enabled' ? 1 : 0);
  return hooks
    .filter((w) => w.endpoint.toLowerCase().includes('bocabanker'))
    .reduce<T | null>((best, w) => (!best || rank(w) > rank(best) ? w : best), null);
}

/** Fills in status.domain / status.webhook from Resend. Sets status.error instead of throwing. */
async function readResend(status: InboxStatus): Promise<void> {
  const inboundDomain = status.inboundDomain;
  try {
    const resend = getResend();
    const [domains, hooks] = await Promise.all([
      listAll('domains', (page) => resend.domains.list(page)),
      listAll('webhooks', (page) => resend.webhooks.list(page)),
    ]);

    // ── Domain ──
    const summary = domains.find((d) => d.name.toLowerCase() === inboundDomain);
    if (summary) {
      const detail = await resend.domains.get(summary.id);
      const d = detail.data;
      const region = d?.region ?? summary.region ?? 'us-east-1';
      status.domain.found = true;
      status.domain.status = d?.status ?? summary.status;
      status.domain.sending = d?.capabilities?.sending ?? summary.capabilities?.sending ?? null;
      status.domain.receiving = d?.capabilities?.receiving ?? summary.capabilities?.receiving ?? null;
      status.domain.region = region;

      const records: DnsRecord[] = (d?.records ?? []).map((r) => ({
        record: r.record,
        type: r.type,
        host: zoneHost(r.name, inboundDomain),
        value: r.value,
        priority: 'priority' in r && typeof r.priority === 'number' ? r.priority : undefined,
        status: r.status,
      }));
      // Resend only lists the receiving MX once receiving is switched on;
      // show it regardless so the admin can add all records in one go.
      if (!records.some((r) => r.record === 'Receiving')) {
        records.push({
          record: 'Receiving',
          type: 'MX',
          host: zoneHost(inboundDomain, inboundDomain),
          value: `inbound-smtp.${region}.amazonaws.com`,
          priority: 10,
          status: status.domain.receiving === 'enabled' ? 'verified' : 'missing',
        });
      }
      status.domain.records = records;
    }

    // ── Webhook ──
    const ours = pickWebhook(hooks);
    if (ours) {
      const events = (ours.events ?? []).map((e) => String(e));
      status.webhook = {
        found: true,
        endpoint: ours.endpoint,
        status: ours.status,
        events,
        canonical: ours.endpoint === CANONICAL_WEBHOOK_URL,
        hasReceivedEvent: events.includes('email.received'),
      };
    }
  } catch (err) {
    status.error = err instanceof Error ? err.message : 'Resend check failed';
  }
}

let cache: { at: number; value: InboxStatus } | null = null;
const CACHE_MS = 30_000;

export async function getInboxStatus(opts: { fresh?: boolean } = {}): Promise<InboxStatus> {
  if (!opts.fresh && cache && Date.now() - cache.at < CACHE_MS) return cache.value;

  const inboundAddress = getInboundAddress();
  const inboundDomain = getInboundDomain(inboundAddress);
  const zone = inboundDomain.endsWith(`.${PRIMARY_DOMAIN}`) ? PRIMARY_DOMAIN : inboundDomain;
  const mxHost = zoneHost(inboundDomain, inboundDomain);
  const status: InboxStatus = {
    checkedAt: new Date().toISOString(),
    inboundAddress,
    inboundDomain,
    from: getFrom(),
    env: {
      resendApiKey: isResendConfigured(),
      webhookSecret: !!process.env.RESEND_WEBHOOK_SECRET,
      xaiApiKey: !!process.env.XAI_API_KEY,
    },
    dnsHost: null,
    domain: { found: false, status: null, sending: null, receiving: null, region: null, records: [] },
    mx: {
      state: 'unknown',
      records: [],
      preferred: null,
      resendOutranked: false,
      expected: { host: mxHost, value: 'inbound-smtp.us-east-1.amazonaws.com', priority: 10 },
    },
    webhook: { found: false, endpoint: null, status: null, events: [], canonical: false, hasReceivedEvent: false },
    ready: false,
    problems: [],
  };

  // DNS needs no API key, so it runs (alongside Resend) either way.
  const [mx, dnsHost] = await Promise.all([
    checkMx(inboundDomain),
    lookupDnsProvider(zone),
    status.env.resendApiKey ? readResend(status) : undefined,
  ]);
  status.dnsHost = dnsHost;

  const receivingRecord = status.domain.records.find((r) => r.record === 'Receiving');
  if (receivingRecord) {
    status.mx.expected = { host: mxHost, value: receivingRecord.value, priority: receivingRecord.priority ?? 10 };
  }
  // Reclassify against the exact value Resend asked for, now that it is known.
  Object.assign(status.mx, mx.records.length ? classifyMx(mx.records, status.mx.expected.value) : mx);
  // Our stand-in row (receiving still off): the record may already be in DNS.
  if (receivingRecord?.status === 'missing' && status.mx.state === 'resend') receivingRecord.status = 'pending';

  // ── Problems, in fix order ──
  const p = status.problems;
  const d = inboundDomain;
  const atDnsHost = `At ${dnsHost ?? 'your DNS host'}`;
  const mxRecord = `host ${mxHost}, value ${status.mx.expected.value}, priority ${status.mx.expected.priority}`;

  if (!status.env.resendApiKey) {
    p.push('RESEND_API_KEY is not set, so nothing can be sent or received.');
  } else if (status.error) {
    p.push(`Could not read Resend configuration: ${status.error}`);
  } else if (!status.domain.found) {
    p.push(`${d} is not a domain in Resend. In Resend → Domains, add it, then enable Receiving.`);
  } else {
    if (status.domain.status !== 'verified') {
      const failing = status.domain.records.filter((r) => r.record !== 'Receiving' && r.status !== 'verified');
      p.push(`${d} is "${status.domain.status}" in Resend — ${failing.length || 'its'} DNS record(s) are missing or unverified.`);
    }
    if (status.domain.receiving !== 'enabled') {
      p.push(`Receiving is ${status.domain.receiving ?? 'off'} for ${d} in Resend. In Resend → Domains → ${d}, enable Receiving.`);
    }
  }

  switch (status.mx.state) {
    case 'none':
      p.push(`${d} has no MX record, so mail to it never arrives. ${atDnsHost}, add the MX record Resend shows (${mxRecord}).`);
      break;
    case 'other':
      p.push(
        `${d}'s MX sends mail to ${status.mx.preferred}${status.mx.resendOutranked ? ', which outranks the Resend MX' : ', not Resend'}. ` +
        `${atDnsHost}, replace it with the MX record Resend shows (${mxRecord}).`,
      );
      break;
    case 'unknown':
      p.push(`Could not look up the MX record for ${d} (${status.mx.error ?? 'DNS error'}). Re-check in a minute.`);
      break;
  }

  if (status.env.resendApiKey && !status.error) {
    if (!status.webhook.found) {
      p.push(`No Resend webhook sends mail to ${CANONICAL_WEBHOOK_URL}. In Resend → Webhooks, add it with email.received, email.delivered, email.bounced and email.failed.`);
    } else {
      if (!status.webhook.canonical) {
        p.push(`Resend webhook endpoint is ${status.webhook.endpoint}; it must be exactly ${CANONICAL_WEBHOOK_URL} (edit it — don't recreate — so the signing secret stays the same).`);
      }
      if (status.webhook.status !== 'enabled') p.push('The Resend webhook is disabled. Enable it in Resend → Webhooks.');
      if (!status.webhook.hasReceivedEvent) p.push('The Resend webhook does not send email.received, so no mail arrives. Add that event in Resend → Webhooks.');
    }
  }
  if (!status.env.webhookSecret) {
    p.push("RESEND_WEBHOOK_SECRET is not set, so every webhook call is rejected. Set it in Vercel (Production) to the webhook's signing secret, then redeploy.");
  }
  if (!status.env.xaiApiKey) p.push('XAI_API_KEY is not set — mail still arrives, but without AI summaries or drafts.');

  // An MX lookup that failed is reported, not held against readiness: a
  // flaky resolver must not hide an inbox that works.
  status.ready =
    status.domain.found && status.domain.status === 'verified' && status.domain.receiving === 'enabled' &&
    (status.mx.state === 'resend' || status.mx.state === 'unknown') &&
    status.webhook.found && status.webhook.canonical && status.webhook.status === 'enabled' && status.webhook.hasReceivedEvent &&
    status.env.webhookSecret;

  if (status.env.resendApiKey && !status.error) cache = { at: Date.now(), value: status };
  return status;
}
