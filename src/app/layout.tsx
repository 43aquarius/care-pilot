import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CarePilot — Your AI Health Copilot",
  description:
    "CarePilot is an accessibility-first AI health companion: smart symptom triage, medication management, plain-language lab report explanations, and doctor-visit prep — all in one calm, private dashboard.",
  keywords: [
    "CarePilot",
    "AI health",
    "symptom checker",
    "medication tracker",
    "lab report explainer",
    "doctor visit preparation",
    "accessibility",
    "HealthHack 48",
  ],
  authors: [{ name: "CarePilot Team" }],
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "CarePilot — Your AI Health Copilot",
    description:
      "Smart symptom triage, medication management, lab report translation and visit prep — in one accessible AI dashboard.",
    siteName: "CarePilot",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f766e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:shadow-lg"
        >
          Skip to main content
        </a>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
