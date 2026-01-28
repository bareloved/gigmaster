import type { Metadata } from "next";
import { bebasNeue, manrope, jetBrainsMono, notoSansHebrew, anton } from "@/lib/fonts";
import "./globals.css";
import { QueryProvider } from "@/lib/providers/query-provider";
import { ThemeProvider } from "@/lib/providers/theme-provider";
import { UserProvider } from "@/lib/providers/user-provider";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "GigMaster - Gig Brain",
  description: "Operating system for gigging musicians",
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
              <Toaster richColors position="top-right" />
            </QueryProvider>
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

