import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "KARIAKOO: Dar es Salaam's marketplace, delivered",
    template: "%s · KARIAKOO",
  },
  description:
    "Shop Kariakoo's trusted sellers online. Search shops and products, pay KARIAKOO, and get rider delivery across Dar es Salaam.",
};

export const viewport: Viewport = { themeColor: "#14110f" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>
        <p className="bg-amber-50 px-4 py-1.5 text-center text-xs font-medium text-amber-900">
          Demo mode: all shops, products, people, orders and payments are sample data. No real money moves.
        </p>
        {children}
      </body>
    </html>
  );
}
