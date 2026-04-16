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
  title: "Synod | Policy-Controlled Treasury Infrastructure",
  description:
    "Synod is the control layer for treasury execution - policy-governed, multisig-enforced, built for agents, bots, workflows, and teams.",
  icons: {
    icon: "/icon.svg",
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
      data-scroll-behavior="smooth"
      className={`${oswald.variable} ${spaceMono.variable}`}
    >
      <body className="min-h-screen bg-(--bg-base) text-(--ink) antialiased">
        {children}
      </body>
    </html>
  );
}
