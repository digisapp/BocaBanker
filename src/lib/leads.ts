// The phone agent and chat tools file leads before they know the property, so
// they write placeholders like "Not provided" (property_address is NOT NULL)
// or a buyer name of "Unknown yet". Treat those as missing when titling a lead.
const PLACEHOLDER = /^(not provided|unknown( yet)?|n\/?a|none|-+)$/i

export function realValue(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed && !PLACEHOLDER.test(trimmed) ? trimmed : null
}

/** "+15615737510" or "5615737510" -> "(561) 573-7510"; anything else as-is. */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  const us = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits
  if (us.length !== 10) return phone
  return `(${us.slice(0, 3)}) ${us.slice(3, 6)}-${us.slice(6)}`
}

/**
 * Why a lead's status can't change from `current` to `next`, or null if it can.
 *
 * "converted" means a client was created from the lead, so only the Convert
 * action may set it (setting it by hand created no client). And once a lead
 * has a client, moving it back out of "converted" would let Convert run again
 * and create a duplicate client + property. Re-saving the current status
 * (the edit form always sends it) is always allowed.
 */
export function leadStatusChangeError(
  current: { status: string | null; convertedClientId: string | null },
  next: string,
): string | null {
  if (next === current.status) return null
  if (next === 'converted') {
    // A lead that already has a client (older data edited out of
    // "converted") may go back; Convert itself refuses such leads.
    return current.convertedClientId ? null : 'Use "Convert to Client" to mark a lead as converted'
  }
  if (current.convertedClientId) {
    return 'This lead has already been converted to a client; its status can no longer change'
  }
  return null
}

/**
 * Why a lead can't be created with `status`, or null if it can. A lead
 * created as "converted" has no client, and Convert refuses it from then on.
 */
export function newLeadStatusError(status: string | null | undefined): string | null {
  return status === 'converted'
    ? 'A new lead can\'t start as "converted". Save it with another status, then use "Convert to Client" to create its client.'
    : null
}

/** Row error for a CSV lead import row whose status is "converted". */
export const IMPORT_CONVERTED_STATUS_ERROR =
  'Status "converted" can\'t be imported: leads are converted with the "Convert to Client" button, which creates the client. Import this row as a client instead, or give it another status.'

interface LeadTitleFields {
  propertyAddress: string | null
  buyerName: string | null
  buyerCompany?: string | null
  buyerPhone?: string | null
  buyerEmail?: string | null
}

/** Best human-readable title for a lead: its property, else who it is. */
export function leadTitle(lead: LeadTitleFields): string {
  const phone = realValue(lead.buyerPhone)
  return (
    realValue(lead.propertyAddress) ??
    realValue(lead.buyerName) ??
    realValue(lead.buyerCompany) ??
    (phone && formatPhone(phone)) ??
    realValue(lead.buyerEmail) ??
    'Untitled Lead'
  )
}
