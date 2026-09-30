import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import "./globals.css";
import { SiteChrome } from "@/components/site-shell";

export const metadata: Metadata = {
  title: "Veridity | Dancing Elephant Labs",
  description:
    "Veridity is a product offering from Dancing Elephant Labs. It is a multi-tenant verifiable credentials platform with a public OIDC4VCI / OIDC4VP protocol server, a governance-controlled trust layer, and public wallet and portal surfaces.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html
      lang="en"
      style={
        {
          "--font-sans": '"Space Grotesk", "Avenir Next", "Segoe UI", sans-serif',
          "--font-mono": '"IBM Plex Mono", "SFMono-Regular", "Consolas", monospace',
        } as CSSProperties
      }
      className="scroll-smooth"
    >
      <body className="font-sans">
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
