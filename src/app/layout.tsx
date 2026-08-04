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
  title: "Koolector",
  description: "Billing and Collections Mastered",
};

// Inherited by every nested route unless overridden — keeps every function
// in the same metro as Supabase's Tokyo (ap-northeast-1) pooler. The
// top-level vercel.json `regions` setting covers Serverless Functions, but
// Next.js's own region pinning for App Router functions is this export, not
// vercel.json alone — set both since only relying on vercel.json didn't
// change the deployed region.
export const preferredRegion = "hnd1";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
