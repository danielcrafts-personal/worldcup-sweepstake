import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "World Cup 2026 — Family Sweepstake",
  description: "Family sweepstake for the 2026 FIFA World Cup — assignments, prizes, live bracket and results.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
