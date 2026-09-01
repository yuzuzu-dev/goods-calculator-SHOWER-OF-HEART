
import type { Metadata } from "next";
import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}

