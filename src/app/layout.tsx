import { Instrument_Sans, JetBrains_Mono, Sora } from "next/font/google";
import type { Metadata } from "next";

import { Providers } from "@/components/providers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

import "./globals.css";

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "NexusIQ — Enterprise Decision Intelligence",
    template: "%s | NexusIQ",
  },
  description:
    "Upload your data room. AI performs due diligence with evidence-backed insights — multi-agent intelligence, explainable consensus, local AI.",
  applicationName: "NexusIQ",
  icons: {
    icon: "/brand/nexus-mark.svg",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let themeClass = "dark";
  try {
    const session = await auth();
    if (session?.user?.id) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { theme: true },
      });
      if (user?.theme === "light") themeClass = "";
    }
  } catch {
    // Auth may be unavailable during static generation
  }

  return (
    <html
      lang="en"
      className={themeClass === "dark" ? "dark" : undefined}
      style={{ colorScheme: themeClass === "dark" ? "dark" : "light" }}
      suppressHydrationWarning
    >
      <body
        className={`${instrumentSans.variable} ${sora.variable} ${jetbrainsMono.variable} font-sans`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2.5 focus:text-primary-foreground focus:shadow-glow"
        >
          Skip to main content
        </a>
        <Providers theme={themeClass === "dark" ? "dark" : "light"}>{children}</Providers>
      </body>
    </html>
  );
}
