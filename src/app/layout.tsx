import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Novesia Admin",
  description: "Admin Portal — Novesia Novel Platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="antialiased bg-gray-950 text-gray-100">{children}</body>
    </html>
  );
}
