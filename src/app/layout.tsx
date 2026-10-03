import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { NavigationProgress } from "@/components/navigation-progress";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#080808",
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://ophelia-absensi.vercel.app"),
  title: "OPHELIA Duty System | Attendance & Roleplay Institution Portal",
  description: "Advanced institutional attendance, live duty tracking, and duty statistics for Ophelia Roleplay",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-32.png", type: "image/png", sizes: "32x32" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    title: "OPHELIA Duty System | Attendance & Roleplay Institution Portal",
    description: "Advanced institutional attendance, live duty tracking, and duty statistics for Ophelia Roleplay",
    images: [
      {
        url: "/logos/ophelia-logo.png",
        width: 1024,
        height: 372,
        alt: "Ophelia Roleplay",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${geistSans.variable} ${geistMono.variable} dark h-full`}>
      <body className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#080808] text-white selection:bg-[#E50914] selection:text-white flex flex-col font-sans antialiased">
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
