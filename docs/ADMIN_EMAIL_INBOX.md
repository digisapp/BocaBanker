# Email inbox (`/email`)

The one email channel for Boca Banker. Mail to the Boca Banker address lands
in the dashboard; the owner reads and answers it there; everything goes
through Resend.

## How it works

```
sender ──► team@bocabanker.com (or ADMIN_EMAIL_ADDRESS)
             │  (MX → Resend receiving)
             ▼
   Resend fires `email.received` ──► POST https://bocabanker.com/api/email/webhook
             │  svix signature, then GET /emails/receiving/{id} for body + headers
             ▼
       emails (direction=inbound) ──► /email
             │  after(): Grok classifies + drafts (XAI_API_KEY); auto-sends only
             │  if platform_settings.ai_auto_reply_enabled = true
             ▼
   admin replies ──► Resend send, From "Boca Banker <team@bocabanker.com>",
                     Reply-To team+<threadId>@bocabanker.com
                     (the plus tag threads the answer when it comes back)
```

Code: `src/lib/email/admin-inbox.ts` (service), `inbound-address.ts` (pure
addressing helpers, unit tested), `render.ts` (branded HTML, quoting),
`inbox-status.ts` (readiness check), `src/app/api/email/webhook/route.ts`
(webhook), `src/app/api/email/inbox/*` (admin API),
`src/hooks/useAdminInbox.ts` + `src/components/email/inbox/*` (UI),
`src/lib/ai/ai-email.ts` (classifier, drafts, auto-reply). Table: `emails`.

## Environment (Vercel → Production)

| Var | Purpose |
| --- | --- |
| `RESEND_API_KEY` | Sending + fetching received mail + the status check. Full-access key (not send-only). |
| `RESEND_WEBHOOK_SECRET` | Svix signing secret of the Resend webhook. Every call is rejected without it. |
| `RESEND_FROM_EMAIL` | From on everything we send. `team@bocabanker.com` or `Boca Banker <team@bocabanker.com>`. Must be on a verified sending domain. |
| `ADMIN_EMAIL_ADDRESS` | Optional. The receiving mailbox. Defaults to the From address. Its **domain** is what must receive in Resend. |
| `XAI_API_KEY` | Optional. AI summary + suggested reply. Mail still arrives without it. |

## Database

`emails` gained `is_spam` and `is_starred` (migration
`drizzle/0011_add_inbox_flags.sql`). The table is owned by `app_user`, so
apply it with:

```sh
psql "$DATABASE_URL" -f drizzle/0011_add_inbox_flags.sql
```

It is idempotent and backfills `is_spam` from the old `metadata.spamFiltered`
flag. Until it runs, every inbox request 500s (missing column).

## Is it working? (check this first, not the UI)

`/email` shows a yellow **"This inbox can't receive mail yet"** card until
everything below is true. The same data is at `GET /api/email/inbox/status`
and from `npx tsx scripts/check-admin-inbox.ts`. "Inbox is empty" with a
green bar at the top means there is genuinely no mail.

Ready means all of:

1. Resend domain for `ADMIN_EMAIL_ADDRESS`'s domain is **verified** with
   **receiving enabled**.
2. Resend webhook endpoint is exactly `https://bocabanker.com/api/email/webhook`
   (`www.bocabanker.com` redirects to the apex and Svix treats 3xx as
   failure), enabled, subscribed to `email.received` (+ `email.delivered`,
   `email.bounced`, `email.failed` for status).
3. `RESEND_WEBHOOK_SECRET` set in prod.

Resend webhooks are **account-wide**: every receiving domain on the account
fires at this endpoint too. The webhook keeps only mail with a recipient on
bocabanker.com / *.bocabanker.com and acknowledges the rest with
`ignored: "not our domain"`.

## Receiving: two ways. Pick one.

**A. Apex (default, `ADMIN_EMAIL_ADDRESS` unset):** every @bocabanker.com
address lands in the inbox. The `@` MX record must point at
`inbound-smtp.us-east-1.amazonaws.com` priority 10 and receiving must be
enabled on the `bocabanker.com` domain in Resend. Any Google Workspace
mailbox on bocabanker.com stops receiving directly (forward from Resend if
needed).

**B. Subdomain (keeps the apex MX where it is):** set
`ADMIN_EMAIL_ADDRESS=inbox@inbound.bocabanker.com`, add `inbound.bocabanker.com`
in Resend with receiving on, and add the records the setup card lists:

| Type | Host | Value | Priority |
| --- | --- | --- | --- |
| MX | `inbound` | `inbound-smtp.us-east-1.amazonaws.com` | 10 |
| TXT | `resend._domainkey.inbound` | (DKIM value from the card / Resend) | |
| MX | `send.inbound` | `feedback-smtp.us-east-1.amazonses.com` | 10 |
| TXT | `send.inbound` | `v=spf1 include:amazonses.com ~all` | |

With B, mail to `team@bocabanker.com` still goes to the apex MX, so forward
it to `inbox@inbound.bocabanker.com` there. Replies to mail we send already
go to the inbound address (per-thread Reply-To). The code supports both
without changes.

## Testing the loop

1. `/email` → **Send me a test** (or `POST /api/email/inbox/test`). It
   emails the signed-in admin through the normal reply path (team@ From,
   per-thread Reply-To) and shows in **Sent** with a "Test" badge.
2. Reply to it from that mailbox. Within a minute the reply must appear in
   **Inbox**, inside the same thread. If it doesn't, receiving is the broken
   half — see the setup card.
3. Reply from the inbox; check the sender's client groups it in the thread.

Webhook deliveries and their responses are visible in Resend → Webhooks →
the bocabanker.com endpoint. A 401 there means `RESEND_WEBHOOK_SECRET`
doesn't match the webhook's signing secret (editing the endpoint URL keeps
the secret; creating a new webhook rotates it). A 502 means the body fetch
from Resend failed; Svix retries it.

## AI auto-reply

Off by default (`platform_settings.ai_auto_reply_enabled`, and the owner
asked for it off on 2026-09-23). With it off the AI still summarises and
drafts; nothing is sent without the admin. Turning it on (toggle on the page,
with confirmation) auto-sends only for cost_seg_inquiry / property_question /
study_request / mortgage_inquiry / loan_status / rate_question / scheduling /
general_inquiry at ≥ 85 % confidence, never twice in 24 h to one address or
one thread, never to automated senders (no-reply, mailer-daemon, list mail,
Auto-Submitted, our own domain), and never when the draft links anywhere but
bocabanker.com. The reply body is our rendering of the draft text, never the
model's HTML; the original is quoted as escaped text.

## Related

- Transactional mail (`sendEmail` in `src/lib/email/resend.ts`) defaults
  Reply-To to the inbox address, so "just reply to this email" lands here.
- `/api/email/send` (template sends from client pages) and `/api/email/bulk`
  (campaigns) still exist and show up in **Sent**; `/email/history` lists the
  `email_logs` delivery log.
