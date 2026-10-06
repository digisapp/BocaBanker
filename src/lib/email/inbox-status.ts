/**
 * Is the inbox actually able to receive mail?
 *
 * "No emails" on an inbox page can mean two very different things: nobody
 * wrote, or nothing can arrive. This asks Resend (read-only) and the
 * environment, and spells out exactly which DNS records / settings are
 * missing, so the Email page can show it.
 */
import { getResend, isResendConfigured } from './resend';
import { getFrom, getInboundAddress, getInboundDomain, PRIMARY_DOMAIN } from './inbound-address';

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
  domain: {
    found: boolean;
    status: string | null;
    sending: string | null;
    receiving: string | null;
    region: string | null;
    records: DnsRecord[];
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

let cache: { at: number; value: InboxStatus } | null = null;
const CACHE_MS = 30_000;

export async function getInboxStatus(opts: { fresh?: boolean } = {}): Promise<InboxStatus> {
  if (!opts.fresh && cache && Date.now() - cache.at < CACHE_MS) return cache.value;

  const inboundAddress = getInboundAddress();
  const inboundDomain = getInboundDomain(inboundAddress);
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
    domain: { found: false, status: null, sending: null, receiving: null, region: null, records: [] },
    webhook: { found: false, endpoint: null, status: null, events: [], canonical: false, hasReceivedEvent: false },
    ready: false,
    problems: [],
  };

  if (!status.env.resendApiKey) {
    status.problems.push('RESEND_API_KEY is not set, so nothing can be sent or received.');
    return status;
  }

  try {
    const resend = getResend();
    const [domainsRes, webhooksRes] = await Promise.all([resend.domains.list(), resend.webhooks.list()]);
    if (domainsRes.error) throw new Error(`Resend domains: ${domainsRes.error.message}`);
    if (webhooksRes.error) throw new Error(`Resend webhooks: ${webhooksRes.error.message}`);

    // ── Domain ──
    const summary = domainsRes.data?.data.find((d) => d.name.toLowerCase() === inboundDomain);
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
    const hooks = webhooksRes.data?.data ?? [];
    const ours = hooks.find((w) => /bocabanker\.com\/api\/email\/webhook$/i.test(w.endpoint))
      ?? hooks.find((w) => w.endpoint.includes('bocabanker'));
    if (ours) {
      status.webhook.found = true;
      status.webhook.endpoint = ours.endpoint;
      status.webhook.status = ours.status;
      const events = (ours.events ?? []).map((e) => String(e));
      status.webhook.events = events;
      status.webhook.canonical = ours.endpoint === CANONICAL_WEBHOOK_URL;
      status.webhook.hasReceivedEvent = events.includes('email.received');
    }
  } catch (err) {
    status.error = err instanceof Error ? err.message : 'Resend check failed';
    status.problems.push(`Could not read Resend configuration: ${status.error}`);
    return status;
  }

  // ── Problems, in fix order ──
  const p = status.problems;
  if (!status.domain.found) {
    p.push(`Add ${inboundDomain} as a domain in Resend (with receiving enabled) and add its DNS records.`);
  } else {
    if (status.domain.status !== 'verified') {
      const failing = status.domain.records.filter((r) => r.record !== 'Receiving' && r.status !== 'verified');
      p.push(`${inboundDomain} is "${status.domain.status}" in Resend — ${failing.length || 'its'} DNS record(s) are missing or unverified.`);
    }
    if (status.domain.receiving !== 'enabled') {
      p.push(`Receiving is "${status.domain.receiving ?? 'off'}" on ${inboundDomain}: add the MX record below, then enable receiving for the domain in Resend.`);
    }
  }
  if (!status.webhook.found) {
    p.push(`No Resend webhook points at ${CANONICAL_WEBHOOK_URL}. Create one for email.received, email.delivered, email.bounced, email.failed.`);
  } else {
    if (!status.webhook.canonical) {
      p.push(`Resend webhook endpoint is ${status.webhook.endpoint}; it must be exactly ${CANONICAL_WEBHOOK_URL} (edit it — don't recreate — so the signing secret stays the same).`);
    }
    if (status.webhook.status !== 'enabled') p.push('The Resend webhook is disabled.');
    if (!status.webhook.hasReceivedEvent) p.push('The Resend webhook does not subscribe to email.received.');
  }
  if (!status.env.webhookSecret) p.push('RESEND_WEBHOOK_SECRET is not set — every webhook call is rejected.');
  if (!status.env.xaiApiKey) p.push('XAI_API_KEY is not set — mail still arrives, but without AI summaries or drafts.');

  status.ready =
    status.domain.found && status.domain.status === 'verified' && status.domain.receiving === 'enabled' &&
    status.webhook.found && status.webhook.canonical && status.webhook.status === 'enabled' && status.webhook.hasReceivedEvent &&
    status.env.webhookSecret;

  cache = { at: Date.now(), value: status };
  return status;
}
