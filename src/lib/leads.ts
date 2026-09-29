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
