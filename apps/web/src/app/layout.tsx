import type { Metadata } from "next";
import { Inter, Geist } from "next/font/google";
import { APP_META_DESCRIPTION, APP_PAGE_TITLE } from "@flowdesk/shared";
import "./globals.css";
import { DesktopOnlyGate } from "@/components/layout/DesktopOnlyGate";
import { Providers } from "@/components/providers";
import { ToasterHost } from "@/components/toaster-host";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: APP_PAGE_TITLE,
  description: APP_META_DESCRIPTION,
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={cn("font-sans", geist.variable)}
    >
      <body className={inter.className} suppressHydrationWarning>
        <script src="/theme-init.js" defer />
        <Providers>
          <DesktopOnlyGate>
            {children}
            <ToasterHost />
          </DesktopOnlyGate>
        </Providers>
      </body>
    </html>
  );
}
