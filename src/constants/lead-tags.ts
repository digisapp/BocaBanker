/** Friendly names for the tags lead imports and lead scoring add. */
const LEAD_TAG_LABELS: Record<string, string> = {
  'bonus-100': '100% bonus eligible',
  'building-unconfirmed': 'Building unconfirmed',
  'needs-contact': 'Needs contact info',
  'multi-property-owner': 'Multi-property owner',
  'multi-parcel': 'Multi-parcel sale',
  'cost-seg-list': 'Cost seg list',
  'fl-dor': 'FL county records',
}

export function leadTagLabel(tag: string): string {
  const sold = /^sold-(\d{4})$/.exec(tag)
  if (sold) return `Sold in ${sold[1]}`
  return LEAD_TAG_LABELS[tag] ?? tag
}
