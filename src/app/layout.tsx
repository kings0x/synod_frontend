import type { Metadata } from "next";
import { Oswald, Space_Mono } from "next/font/google";
import "./globals.css";

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  weight: ["700"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Synod | Treasury Governance for AI Agents",
  description:
    "Synod is the treasury layer for autonomous AI agents — multisig-enforced, policy-governed, built on Stellar.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${oswald.variable} ${spaceMono.variable}`}>
      <body className="min-h-screen bg-[var(--bg-base)] text-[var(--ink)] antialiased">
        {children}
      </body>
    </html>
  );
}
