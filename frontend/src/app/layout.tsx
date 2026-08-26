import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GVPIHLR University Admissions Management System",
  description: "Enterprise Admissions Management System for Gayatri Vidya Parishad Institution of Higher Learning",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-slate-100 text-slate-900">
        {children}
      </body>
    </html>
  );
}
