import { siteConfig } from '@/lib/site-config'

export const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://bocabanker.com').replace(/\/$/, '')
export const SITE_NAME = 'Boca Banker'
export const SITE_TITLE = 'Boca Banker | Boca Raton Mortgages & Refinancing'
export const SITE_DESCRIPTION =
  'Boca Raton mortgage banker with 40+ years of South Florida lending. Home loans, refinancing, and cost segregation for investors. Ask anything, any hour.'

/**
 * Site-wide structured data: the business and the website. Contact details
 * come from siteConfig and are only included once they're filled in.
 */
export function siteJsonLd() {
  const business: Record<string, unknown> = {
    '@type': 'FinancialService',
    '@id': `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    logo: { '@type': 'ImageObject', url: `${SITE_URL}/icon-512.png`, width: 512, height: 512 },
    image: `${SITE_URL}/og-headshot.jpg`,
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Boca Raton',
      addressRegion: 'FL',
      addressCountry: 'US',
    },
    geo: { '@type': 'GeoCoordinates', latitude: 26.3683, longitude: -80.1289 },
    areaServed: [
      { '@type': 'City', name: 'Boca Raton' },
      { '@type': 'AdministrativeArea', name: 'Palm Beach County' },
      { '@type': 'AdministrativeArea', name: 'Broward County' },
      { '@type': 'State', name: 'Florida' },
    ],
    knowsAbout: [
      'Mortgages',
      'Home purchase loans',
      'Refinancing',
      'FHA loans',
      'VA loans',
      'Jumbo loans',
      'DSCR loans',
      'Cost segregation',
    ],
  }
  if (siteConfig.phone) business.telephone = siteConfig.phone
  if (siteConfig.email) business.email = siteConfig.email
  if (siteConfig.ownerName) {
    business.employee = {
      '@type': 'Person',
      name: siteConfig.ownerName,
      jobTitle: 'Mortgage Loan Officer',
      ...(siteConfig.nmlsId && {
        identifier: { '@type': 'PropertyValue', propertyID: 'NMLS', value: siteConfig.nmlsId },
      }),
    }
  }

  return {
    '@context': 'https://schema.org',
    '@graph': [
      business,
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        publisher: { '@id': `${SITE_URL}/#organization` },
        inLanguage: 'en-US',
      },
    ],
  }
}
