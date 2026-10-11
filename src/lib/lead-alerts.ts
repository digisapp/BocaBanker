import { resolveMx } from 'dns/promises'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { leads, platformSettings, users } from '@/db/schema'
import { getResend, isResendConfigured } from '@/lib/email/resend'
import { getFrom } from '@/lib/email/inbound-address'
import { escapeHtml, brandedTemplate } from '@/lib/email/render'
import { formatPhone, realValue } from '@/lib/leads'
import { SITE_URL } from '@/lib/seo'
import { logger } from '@/lib/logger'

/** Lead sources that come in from the public (not entered by the owner). */
const SOURCE_LABELS: Record<string, string> = {
  'guest-chat': 'website chat',
  'phone-call': 'phone call',
  'web-voice': 'website voice chat',
}

/**
 * Whether mail to this domain can be delivered at all. A domain with no MX
 * record (bocabanker.com until its inbound mail is set up) would bounce every
 * alert, and repeated bounces get an address suppressed. DNS trouble other
 * than "no such record" is not proof of anything, so it counts as deliverable.
 */
async function acceptsMail(email: string): Promise<boolean> {
  const domain = email.slice(email.lastIndexOf('@') + 1)
  try {
    const records = await Promise.race([
      resolveMx(domain),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
    ])
    return records === null || records.length > 0
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    return code !== 'ENODATA' && code !== 'ENOTFOUND'
  }
}

// Stored in platform_settings (one owner, so one setting), not user_settings.
const SETTINGS_KEY = 'lead_alerts'

export interface LeadAlertSettings {
  /** On unless the owner turns it off. */
  enabled: boolean
  /** Where alerts go; null means the owner's account email. */
  email: string | null
}

export async function getLeadAlertSettings(): Promise<LeadAlertSettings> {
  const [row] = await db
    .select({ value: platformSettings.value })
    .from(platformSettings)
    .where(eq(platformSettings.key, SETTINGS_KEY))
    .limit(1)
  const value = (row?.value ?? {}) as Partial<LeadAlertSettings>
  return {
    enabled: value.enabled !== false,
    email: typeof value.email === 'string' && value.email ? value.email : null,
  }
}

/** Merge a partial change into the stored settings. */
export async function saveLeadAlertSettings(change: Partial<LeadAlertSettings>): Promise<void> {
  const value = { ...(await getLeadAlertSettings()), ...change }
  await db
    .insert(platformSettings)
    .values({ key: SETTINGS_KEY, value })
    .onConflictDoUpdate({
      target: platformSettings.key,
      set: { value, updatedAt: new Date() },
    })
}

/** Where alerts for this owner go, or null when they're turned off. */
async function alertRecipient(ownerId: string): Promise<string | null> {
  const settings = await getLeadAlertSettings()
  if (!settings.enabled) return null
  if (settings.email) return settings.email
  const [owner] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, ownerId))
    .limit(1)
  return owner?.email ?? null
}

/**
 * Email the owner about a lead that came in from the website or phone.
 * Never throws: a failed alert must not fail the lead capture that called it.
 */
export async function sendNewLeadAlert(leadId: string): Promise<void> {
  try {
    if (!isResendConfigured()) return

    const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1)
    if (!lead?.userId) return

    const to = await alertRecipient(lead.userId)
    if (!to) return
    if (!(await acceptsMail(to))) {
      logger.warn('lead-alert', `Skipped new lead alert: ${to} has no mail server (MX record)`)
      return
    }

    const name = realValue(lead.buyerName) ?? 'Someone'
    const source = SOURCE_LABELS[lead.source ?? ''] ?? lead.source ?? 'website'
    const phone = realValue(lead.buyerPhone)
    const place = [realValue(lead.propertyAddress), lead.propertyCity, lead.propertyState]
      .filter(Boolean)
      .join(', ')
    const rows: Array<[string, string | null]> = [
      ['Name', name],
      ['Phone', phone && formatPhone(phone)],
      ['Email', realValue(lead.buyerEmail)],
      ['Property', place || null],
      ['Notes', lead.notes],
    ]
    const url = `${SITE_URL}/leads/${lead.id}`

    const details = rows.filter(([, v]) => v)
    const html = brandedTemplate(
      `<p>A new lead came in from the ${escapeHtml(source)}.</p>
<table cellpadding="6" style="border-collapse:collapse">${details
        .map(
          ([k, v]) =>
            `<tr><td style="color:#6b7280;vertical-align:top">${k}</td><td>${escapeHtml(v!).replace(/\n/g, '<br>')}</td></tr>`
        )
        .join('')}</table>
<p><a href="${escapeHtml(url)}">Open the lead</a></p>`
    )
    const text = [
      `A new lead came in from the ${source}.`,
      '',
      ...details.map(([k, v]) => `${k}: ${v}`),
      '',
      `Open the lead: ${url}`,
    ].join('\n')

    const { error } = await getResend().emails.send({
      from: getFrom(),
      to,
      subject: `New lead: ${name} (${source})`,
      html,
      text,
    })
    if (error) throw new Error(`${error.name}: ${error.message}`)
  } catch (err) {
    logger.error('lead-alert', `Failed to send new lead alert for ${leadId}`, err)
  }
}
