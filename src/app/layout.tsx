import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Heliocentric Explorer",
  description: "An interactive, data-rich solar system observatory.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
