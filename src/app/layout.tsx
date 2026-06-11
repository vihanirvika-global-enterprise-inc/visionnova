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
        <PostHogProvider>
          <CartProvider>
            <AuthNavbar />
            {children}
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
