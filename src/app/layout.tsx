import "./globals.css";
import type { Metadata } from "next";
import AppShell from "@/components/AppShell";
import { Plus_Jakarta_Sans } from "next/font/google";
const f = Plus_Jakarta_Sans({ subsets: ["latin", "latin-ext"], variable: "--font-sans" });
const site = process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? "https://" + process.env.VERCEL_PROJECT_PRODUCTION_URL : "http://localhost:3000");
export const metadata: Metadata = { metadataBase: new URL(site), title: "Son Kural Bükücü", description: "BREAK THE RULES. CREATE YOUR WORLD.", openGraph: { siteName: "Son Kural Bükücü", images: ["/logo.jpg"] } };
export const viewport = { themeColor: "#7C3AED" };
const init = `try{var t=localStorage.getItem('skb-theme');if(t!=='light')document.documentElement.classList.add('dark')}catch(e){}`;
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="tr" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: init }} /></head>
    <body className={`${f.variable} font-sans antialiased`}><AppShell>{children}</AppShell></body></html>);
}
