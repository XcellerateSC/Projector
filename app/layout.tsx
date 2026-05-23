import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "XC Projector",
  description: "Project planning, staffing, time tracking, and reporting."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
