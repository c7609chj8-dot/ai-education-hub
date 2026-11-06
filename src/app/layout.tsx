import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { siteConfig } from "@/config/site";
import "./globals.css";

const siteTitle = siteConfig.nameQualifier
  ? `${siteConfig.name} (${siteConfig.nameQualifier})`
  : siteConfig.name;

export const metadata: Metadata = {
  title: { default: siteTitle, template: `%s | ${siteTitle}` },
  description: siteConfig.description,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body className="flex min-h-svh flex-col">
        <a href="#main-content" className="skip-link">본문 바로가기</a>
        <SiteHeader />
        <main id="main-content" tabIndex={-1} className="flex flex-1 flex-col">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
