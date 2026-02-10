import type { Metadata, Viewport } from "next";
import { ThemeProvider, ErrorBoundary, SessionGuard, BackgroundTrackingProvider, NotificationProvider, VoiceCallProvider, InAppNotificationProvider } from "@/components";

export const metadata: Metadata = {
  title: {
    default: "PO-VERSE | #1 Field Force Management & Marketing Agent Tracking Software",
    template: "%s | PO-VERSE",
  },
  description: "PO-VERSE is the leading field force management platform. Track marketing agents in real-time, manage attendance, set targets, and boost productivity across all cities. Trusted by 500+ companies managing 50,000+ field agents.",
  keywords: [
    "field force management",
    "marketing agent tracking",
    "sales team management",
    "field staff tracking",
    "GPS tracking for employees",
    "attendance management system",
    "target tracking software",
    "field sales automation",
    "agent management app",
    "live location tracking",
    "sales force management",
    "field employee monitoring",
    "route tracking software",
    "mobile workforce management",
    "team productivity software",
  ],
  authors: [{ name: "PO-VERSE Team" }],
  creator: "PO-VERSE",
  publisher: "PO-VERSE",
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
    url: "https://po-verse.com",
    siteName: "PO-VERSE",
    title: "PO-VERSE | #1 Field Force Management & Marketing Agent Tracking Software",
    description: "Track marketing agents in real-time, manage attendance, set targets, and boost productivity. Trusted by 500+ companies.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "PO-VERSE - Field Force Management Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PO-VERSE | #1 Field Force Management Software",
    description: "Track marketing agents in real-time, manage attendance, set targets, and boost productivity across all cities.",
    images: ["/og-image.png"],
    creator: "@poverse",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PO-VERSE",
  },
  formatDetection: {
    telephone: false,
  },
  alternates: {
    canonical: "https://po-verse.com",
  },
  category: "Business Software",
};

export const viewport: Viewport = {
  themeColor: "#a855f7",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

// JSON-LD Structured Data
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "PO-VERSE",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web, Android, iOS",
  description: "Field force management platform for tracking marketing agents, managing attendance, and setting targets.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    description: "Free trial available",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    ratingCount: "2500",
    bestRating: "5",
    worstRating: "1",
  },
  author: {
    "@type": "Organization",
    name: "PO-VERSE",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="canonical" href="https://po-verse.com" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* Google Maps API */}
        {googleMapsApiKey && (
          <script
            src={`https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places,geometry`}
            async
            defer
          />
        )}
      </head>
      <body>
        <ThemeProvider>
          <ErrorBoundary name="root">
            <SessionGuard>
              <InAppNotificationProvider>
                <ErrorBoundary name="voice-call">
                  <VoiceCallProvider>
                    <ErrorBoundary name="background-tracking">
                      <BackgroundTrackingProvider />
                    </ErrorBoundary>
                    <NotificationProvider />
                    {children}
                  </VoiceCallProvider>
                </ErrorBoundary>
              </InAppNotificationProvider>
            </SessionGuard>
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  );
}
