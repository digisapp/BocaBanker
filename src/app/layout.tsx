import type { Metadata, Viewport } from "next";
import { Inter, DM_Serif_Display } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const dmSerif = DM_Serif_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://bocabanker.com";
const SITE_NAME = "Boca Banker";
const SITE_DESCRIPTION =
  "AI-powered cost segregation analysis built on 40 years of Boca Raton banking intelligence. Maximize tax savings with automated property studies, client CRM, and smart outreach.";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f59e0b",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Boca Banker | Cost Segregation & Banking Intelligence",
    template: "%s | Boca Banker",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "cost segregation",
    "cost segregation study",
    "tax savings",
    "accelerated depreciation",
    "bonus depreciation",
    "MACRS depreciation",
    "commercial real estate",
    "real estate tax strategy",
    "property tax analysis",
    "Boca Raton",
    "South Florida",
    "banking intelligence",
    "AI financial advisor",
    "CRE tax savings",
    "property depreciation calculator",
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "Boca Banker | Cost Segregation & Banking Intelligence",
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "Boca Banker | Cost Segregation & Banking Intelligence",
    description: SITE_DESCRIPTION,
  },
  alternates: {
    canonical: SITE_URL,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  category: "finance",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/icon-512.png`,
      },
      description: SITE_DESCRIPTION,
      areaServed: {
        "@type": "Place",
        name: "Boca Raton, Florida, United States",
      },
    },
    {
      "@type": "ProfessionalService",
      "@id": `${SITE_URL}/#localbusiness`,
      name: SITE_NAME,
      description:
        "AI-powered cost segregation and banking intelligence platform serving commercial real estate investors in South Florida and nationwide.",
      url: SITE_URL,
      image: `${SITE_URL}/icon-512.png`,
      address: {
        "@type": "PostalAddress",
        addressLocality: "Boca Raton",
        addressRegion: "FL",
        addressCountry: "US",
      },
      geo: {
        "@type": "GeoCoordinates",
        latitude: 26.3683,
        longitude: -80.1289,
      },
      areaServed: [
        { "@type": "State", name: "Florida" },
        { "@type": "Country", name: "United States" },
      ],
      priceRange: "Free - Premium",
      openingHoursSpecification: {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ],
        opens: "00:00",
        closes: "23:59",
      },
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      publisher: { "@id": `${SITE_URL}/#organization` },
      description: SITE_DESCRIPTION,
    },
    {
      "@type": "WebPage",
      "@id": `${SITE_URL}/#webpage`,
      url: SITE_URL,
      name: "Boca Banker | Cost Segregation & Banking Intelligence",
      isPartOf: { "@id": `${SITE_URL}/#website` },
      about: { "@id": `${SITE_URL}/#organization` },
      description: SITE_DESCRIPTION,
    },
    {
      "@type": "SoftwareApplication",
      name: SITE_NAME,
      applicationCategory: "FinanceApplication",
      operatingSystem: "Web",
      description:
        "AI-powered cost segregation analysis platform with automated property studies, tax savings calculations, client CRM, and smart outreach tools.",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        description: "Free AI chat — sign up for full platform access",
      },
      featureList: [
        "AI-powered cost segregation analysis",
        "MACRS depreciation calculator",
        "Bonus depreciation estimator",
        "Tax savings projections",
        "Client relationship management",
        "Automated email outreach",
        "Property portfolio management",
        "Exportable study reports",
      ],
    },
    {
      "@type": "FAQPage",
      "@id": `${SITE_URL}/#faq`,
      mainEntity: [
        {
          "@type": "Question",
          name: "What is cost segregation?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Cost segregation is a tax strategy that accelerates depreciation deductions on commercial real estate by reclassifying building components into shorter depreciation categories (5, 7, or 15 years instead of 27.5 or 39 years). This can generate significant tax savings in the first years of ownership.",
          },
        },
        {
          "@type": "Question",
          name: "How much can I save with a cost segregation study?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Typical savings range from 15% to 40% of a property's depreciable basis, accelerated into the first few years. For a $1M commercial property, this could mean $150,000-$400,000 in accelerated depreciation deductions. Boca Banker provides instant AI-powered estimates based on your specific property.",
          },
        },
        {
          "@type": "Question",
          name: "How does Boca Banker work?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Simply start a conversation with Boca Banker's AI chat. Describe your property and he'll analyze its cost segregation potential, estimate tax savings through MACRS and bonus depreciation, and provide expert guidance on banking and real estate strategy — all powered by 40 years of Boca Raton banking intelligence.",
          },
        },
        {
          "@type": "Question",
          name: "Is the AI chat free?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes! You can chat with Boca Banker for free — no signup required. Ask about cost segregation, mortgages, tax strategy, or property analysis. Sign up for a free account to access the full platform including automated studies, client CRM, and email outreach tools.",
          },
        },
      ],
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="dns-prefetch"
          href="https://fwepigxakjzlzqsfsmrf.supabase.co"
        />
        <link
          rel="preconnect"
          href="https://fwepigxakjzlzqsfsmrf.supabase.co"
          crossOrigin="anonymous"
        />
      </head>
      <body
        className={`${inter.variable} ${dmSerif.variable} antialiased`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
