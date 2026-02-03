import type { Metadata } from "next";
import { bebasNeue, manrope, jetBrainsMono, notoSansHebrew, anton } from "@/lib/fonts";
import "./globals.css";
import { QueryProvider } from "@/lib/providers/query-provider";
import { ThemeProvider } from "@/lib/providers/theme-provider";
import { UserProvider } from "@/lib/providers/user-provider";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://gigmaster.io"),
  title: "GigMaster - Gig Brain",
  description: "Operating system for gigging musicians",
  icons: {
    apple: [
      { url: "/logos/gigmaster_favicon_set/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/logos/gigmaster_favicon_set/site.webmanifest",
  openGraph: {
    title: "GigMaster - Gig Brain",
    description: "Operating system for gigging musicians",
    type: "website",
    images: [
      {
        url: "/logos/OpenGraph.png",
        width: 1200,
        height: 630,
        alt: "GigMaster - Operating system for gigging musicians",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "GigMaster - Gig Brain",
    description: "Operating system for gigging musicians",
    images: ["/logos/OpenGraph.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${manrope.className} ${bebasNeue.variable} ${jetBrainsMono.variable} ${anton.variable} ${notoSansHebrew.variable}`}
        suppressHydrationWarning
      >
        <ThemeProvider>
          <UserProvider>
            <QueryProvider>
              {children}
              <Toaster richColors position="bottom-center" />
            </QueryProvider>
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

