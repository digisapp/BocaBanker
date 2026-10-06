/**
 * Can the inbox receive mail? Same check the Email page runs, from the CLI.
 *
 *   npx tsx scripts/check-admin-inbox.ts
 *
 * Reads .env.local; talks to Resend read-only.
 */
import 'dotenv/config';
import { config } from 'dotenv';
import { getInboxStatus } from '../src/lib/email/inbox-status';

config({ path: '.env.local' });

async function main() {
  const s = await getInboxStatus({ fresh: true });
  console.log(`Inbox:    ${s.inboundAddress}  (domain ${s.inboundDomain})`);
  console.log(`From:     ${s.from}`);
  console.log(`Env:      RESEND_API_KEY=${s.env.resendApiKey ? 'set' : 'MISSING'}  RESEND_WEBHOOK_SECRET=${s.env.webhookSecret ? 'set' : 'MISSING'}  XAI_API_KEY=${s.env.xaiApiKey ? 'set' : 'missing'}`);
  console.log(`Domain:   ${s.domain.found ? `${s.domain.status}, sending ${s.domain.sending}, receiving ${s.domain.receiving} (${s.domain.region})` : 'not in Resend'}`);
  for (const r of s.domain.records) {
    console.log(`  ${r.status.padEnd(11)} ${r.record.padEnd(9)} ${r.type.padEnd(5)} ${r.host.padEnd(28)} ${r.value}${r.priority ? `  (prio ${r.priority})` : ''}`);
  }
  console.log(`Webhook:  ${s.webhook.found ? `${s.webhook.endpoint} [${s.webhook.status}] events: ${s.webhook.events.join(', ') || 'none'}${s.webhook.canonical ? '' : '  ← wrong host'}` : 'none'}`);
  console.log('');
  if (s.ready) {
    console.log('READY — mail to the inbox address will show up in /email.');
  } else {
    console.log('NOT READY. Fix, in order:');
    s.problems.forEach((p, i) => console.log(`  ${i + 1}. ${p}`));
  }
  if (s.error) console.log(`Error: ${s.error}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
