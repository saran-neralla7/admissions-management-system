import type { Metadata } from "next";
import Image from "next/image";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "GVP Admissions Portal",
    template: "%s | GVP Admissions Portal",
  },
  description: "Gayatri Vidya Parishad Admissions Management ERP System",
  icons: {
    icon: "/gvp-logo.png",
    shortcut: "/gvp-logo.png",
    apple: "/gvp-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/gvp-logo.png" type="image/png" />
        <link rel="shortcut icon" href="/gvp-logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/gvp-logo.png" />
      </head>
      <body className="antialiased bg-slate-100 text-slate-900 relative min-h-screen">
        {/* GLOBAL GVP LOGO WATERMARK BACKGROUND - ELEGANT VISIBLE WATERMARK */}
        <div className="fixed inset-0 pointer-events-none z-0 flex items-center justify-center overflow-hidden select-none">
          <Image
            src="/gvp-logo.png"
            alt="GVP Watermark Logo"
            width={550}
            height={550}
            className="object-contain opacity-[0.12] grayscale-20 brightness-95"
            priority
          />
        </div>
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
