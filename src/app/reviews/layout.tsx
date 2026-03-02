import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Client Reviews | Boca Banker',
  description:
    'Read what clients say about working with Carmen at Certified Home Loans. 5-star rated Senior Loan Officer in South Florida with 61+ reviews.',
  openGraph: {
    title: 'Client Reviews | Boca Banker',
    description:
      '5.00 star rating from 61+ reviews. See why clients love working with Carmen Mayell at Boca Banker.',
  },
}

export default function ReviewsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
