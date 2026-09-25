import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OPHELIA Duty System | Attendance & Roleplay Institution Portal",
  description: "Advanced institutional attendance, live duty tracking, and duty statistics for Ophelia Roleplay",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${geistSans.variable} ${geistMono.variable} dark h-full`}>
      <body className="min-h-screen bg-[#080808] text-white selection:bg-[#E50914] selection:text-white flex flex-col font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
