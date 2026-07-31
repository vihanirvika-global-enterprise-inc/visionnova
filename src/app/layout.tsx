import type { Metadata } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import "./globals.css";
import { CartProvider } from "@/components/cart/CartContext";
import { AuthNavbar } from "@/components/layout/AuthNavbar";
import { PostHogProvider } from "@/components/analytics/PostHogProvider";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* WCAG 2.4.1 Bypass Blocks: first focusable element on every page, so
            keyboard users can jump the navigation instead of tabbing it. */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to main content
        </a>

        <PostHogProvider>
          <CartProvider>
            <AuthNavbar />
            {/* tabIndex -1 so following the skip link actually moves focus */}
            <div id="main-content" tabIndex={-1}>
              {children}
            </div>
          </CartProvider>
        </PostHogProvider>

        {process.env.NEXT_PUBLIC_GA4_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA4_ID}`}
              strategy="afterInteractive"
            />
            <Script
              id="ga4-init"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer=window.dataLayer||[];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js',new Date());
                  gtag('config','${process.env.NEXT_PUBLIC_GA4_ID}');
                `,
              }}
            />
          </>
        )}
      </body>
    </html>
  );
}
