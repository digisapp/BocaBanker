import type { Metadata, Viewport } from "next";
import { Inter, DM_Serif_Display } from "next/font/google";
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
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${dmSerif.variable} antialiased`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
