import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Abshalom AntiGravity Experience",
  description: "Bar Mitzvah scrollytelling experience for Abshalom"
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="he" dir="rtl">
      <body className="bg-[#050505] text-zinc-100 antialiased">{children}</body>
    </html>
  );
}

