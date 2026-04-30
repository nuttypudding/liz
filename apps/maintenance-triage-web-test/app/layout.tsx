import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Maintenance Triage — Web Test",
  description: "POC test harness for the maintenance-triage agent.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
          margin: 0,
          background: "#0b0b0d",
          color: "#e6e6e6",
        }}
      >
        {children}
      </body>
    </html>
  );
}
