import "./globals.css";
import type { Metadata, Viewport } from "next";
import { ScrollReveal } from "@/components/ScrollReveal";

const appUrl = process.env.APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "HelpDeskFlow — organized customer support",
    template: "%s · HelpDeskFlow",
  },
  description:
    "HelpDeskFlow gives support teams one refined workspace to receive, answer and measure every request — with strict tenant isolation enforced on the server.",
  applicationName: "HelpDeskFlow",
  openGraph: {
    type: "website",
    siteName: "HelpDeskFlow",
    title: "HelpDeskFlow — organized customer support",
    description:
      "One refined workspace to receive, answer and measure every support request.",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "HelpDeskFlow — organized customer support",
    description:
      "One refined workspace to receive, answer and measure every support request.",
  },
  robots: { index: true, follow: true },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#1b1533",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches){document.documentElement.classList.add('reveal-ready')}}catch(e){}",
          }}
        />
        <ScrollReveal />
        {children}
      </body>
    </html>
  );
}
