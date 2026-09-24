/**
 * Public business details shown on the marketing pages. Any field left empty
 * is simply not rendered, so nothing placeholder-looking ever ships.
 */
export const siteConfig = {
  /** The person behind Boca Banker, e.g. "John Smith". */
  ownerName: '',
  /** Individual NMLS ID. Mortgage advertising generally must display it. */
  nmlsId: '',
  /** Public contact phone, any format, e.g. "(561) 555-0123". */
  phone: '',
  /** Public contact email. */
  email: '',
}

export function telHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, '')}`
}
