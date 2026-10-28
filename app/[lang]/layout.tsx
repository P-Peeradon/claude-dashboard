import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans_SC, Noto_Sans_Tamil } from "next/font/google";
import { lang } from "next/root-params";
import { Toaster } from "@/components/ui/sonner";
import { locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import "../globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
// CJK and Tamil faces are split by unicode-range, so the browser only downloads the
// pieces a page actually uses. They sit behind Geist in the font stack (see globals.css).
const notoSC = Noto_Sans_SC({ variable: "--font-noto-sc", preload: false });
const notoTamil = Noto_Sans_Tamil({ variable: "--font-noto-tamil", subsets: ["tamil"] });

export function generateStaticParams() {
  return locales.map((l) => ({ lang: l }));
}

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: dict.meta.title, description: dict.meta.description };
}

export default async function RootLayout({ children }: LayoutProps<"/[lang]">) {
  return (
    <html
      lang={await lang()}
      className={`${geistSans.variable} ${geistMono.variable} ${notoSC.variable} ${notoTamil.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
