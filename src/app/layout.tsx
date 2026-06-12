import type { Metadata } from "next";
import { Bricolage_Grotesque, Instrument_Serif, DM_Mono } from "next/font/google";
import "./globals.css";
import { LenisProvider } from "@/components/LenisProvider";
import { ScrollProgress } from "@/components/ScrollProgress";
import { CoffeeShader } from "@/components/CoffeeShader";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
});

const instrument = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

const dmMono = DM_Mono({
  variable: "--font-mono-display",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "A14 Labs — AI-native product studio",
  description:
    "A14 Labs is an AI-native product studio. We build Fintellect Learning, Wend, and what comes next.",
  metadataBase: new URL("https://a14labs.co"),
  openGraph: {
    title: "A14 Labs",
    description: "AI-native product studio. We build tools we wished existed.",
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
      className={`${bricolage.variable} ${instrument.variable} ${dmMono.variable} h-full antialiased`}
    >
      <body className="relative min-h-full bg-background text-foreground">
        <LenisProvider>
          <ScrollProgress />
          <CoffeeShader className="pointer-events-none fixed inset-0 z-0 opacity-90" />
          <div className="relative z-10">{children}</div>
        </LenisProvider>
      </body>
    </html>
  );
}
