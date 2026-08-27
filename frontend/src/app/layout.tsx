import type { Metadata } from "next";
import Image from "next/image";
import "./globals.css";

export const metadata: Metadata = {
  title: "GVP Admissions ERP - Gayatri Vidya Parishad",
  description: "Enterprise Admissions Management System for Gayatri Vidya Parishad",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-slate-100 text-slate-900 relative min-h-screen">
        {/* GLOBAL GVP LOGO WATERMARK BACKGROUND */}
        <div className="fixed inset-0 pointer-events-none z-0 flex items-center justify-center overflow-hidden opacity-[0.035] select-none">
          <Image
            src="/gvp-logo.png"
            alt="GVP Background Watermark"
            width={600}
            height={600}
            className="object-contain grayscale brightness-50"
            priority
          />
        </div>
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
