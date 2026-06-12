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
  title: "A14 Labs — AI-native product studio",
  description:
    "A14 Labs is an AI-native product studio. We build Fintellect Learning, Wend, and what comes next.",
  metadataBase: new URL("https://a14labs.co"),
  openGraph: {
    title: "A14 Labs",
    description:
      "AI-native product studio. We build tools we wish existed.",
    url: "https://a14labs.co",
    siteName: "A14 Labs",
    type: "website",
  },
};

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
      <body className="min-h-full bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
