
import type { Metadata } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "SHOWER OF HEART",
  description: "GOODS CALCULATOR",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" style={{ colorScheme: "light" }}>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}

