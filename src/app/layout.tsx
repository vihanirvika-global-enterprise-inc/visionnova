import type { Metadata } from "next";
import { Plus_Jakarta_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/cart/CartContext";
import { WishlistProviderServer } from "@/components/wishlist/WishlistProviderServer";
import { AuthNavbar } from "@/components/layout/AuthNavbar";
import { Footer } from "@/components/layout/Footer";
import { ComplianceBar } from "@/components/home/ComplianceBar";
import { PostHogProvider } from "@/components/analytics/PostHogProvider";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { CookieConsentProvider } from "@/components/consent/CookieConsentProvider";
import { CookieConsentBanner } from "@/components/consent/CookieConsentBanner";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
  weight: ["400", "500", "600", "700"],
});
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-ibm-plex-mono",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: { default: "VisionNova", template: "%s | VisionNova" },
  description:
    "Premium prescription eyewear from ₹799. Verified by licensed optometrists. Free delivery across India.",
  openGraph: {
    title: "VisionNova",
    description:
      "Premium prescription eyewear from ₹799. Verified by licensed optometrists. Free delivery across India.",
    type: "website",
    url: "https://visionnova.com",
    siteName: "VisionNova",
  },
  metadataBase: new URL("https://visionnova.com"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${plusJakartaSans.variable} ${ibmPlexMono.variable} antialiased`}
      >
        {/* WCAG 2.4.1 Bypass Blocks: first focusable element on every page, so
            keyboard users can jump the navigation instead of tabbing it. */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to main content
        </a>

        {/* Consent wraps both trackers: PostHog reads it before init, and the
            GA4 script tags are not rendered at all until it is granted. */}
        <CookieConsentProvider>
          <PostHogProvider>
            <CartProvider>
              <WishlistProviderServer>
                <AuthNavbar />
                {/* Hoisted out of the homepage: the four claims describe the
                    business, not one screen, and the mockup repeated them in
                    the header on every page. Owning them here is what keeps
                    them from drifting apart screen by screen. */}
                <ComplianceBar />
                {/* tabIndex -1 so following the skip link actually moves focus */}
                <div id="main-content" tabIndex={-1}>
                  {children}
                </div>
                <Footer />
              </WishlistProviderServer>
            </CartProvider>
          </PostHogProvider>

          <CookieConsentBanner />
          <GoogleAnalytics />
        </CookieConsentProvider>

      </body>
    </html>
  );
}
