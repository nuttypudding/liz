import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Maintenance Triage — Web Test",
  description: "POC test harness for the maintenance-triage agent.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
