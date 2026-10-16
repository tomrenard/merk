import type { Metadata, Viewport } from "next";
import { Inter, Noto_Naskh_Arabic } from "next/font/google";
import { getCourse, getLocale } from "@/lib/locale";
import "./globals.css";
import { LocaleProvider } from "./Locale";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
/** Darija in Arabic script; only loaded where Arabic text shows up. */
const naskh = Noto_Naskh_Arabic({ subsets: ["arabic"], variable: "--font-naskh", preload: false });

export const metadata: Metadata = {
  title: "merk",
  description: "Deutsch lernen, ein Kärtchen nach dem anderen.",
  appleWebApp: { capable: true, title: "merk", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#131f24" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [locale, course] = await Promise.all([getLocale(), getCourse()]);
  return (
    <html lang={locale} className={`${inter.variable} ${naskh.variable}`}>
      <body className="font-sans antialiased">
        <LocaleProvider locale={locale} course={course}>
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}
