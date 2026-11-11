import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { siteConfig } from "@/config/site";
import "./globals.css";

import { getPublicBrand } from "@/lib/brand/public";

export async function generateMetadata(): Promise<Metadata> {
  const {brand} = await getPublicBrand();
  const description = `${brand.slogan}. ${siteConfig.description}`;
  return {
    metadataBase: new URL(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://ai-education-hub-ten.vercel.app"),
    title: {default: brand.name, template: `%s | ${brand.name}`},
    description,
    openGraph: { title: brand.name, description, siteName: brand.name, locale: "ko_KR", type: "website", images: [{url: siteConfig.logoSrc, width: 1024, height: 1024, alt: `${brand.name} DEU_AI 로고`}] },
    twitter: {card: "summary", title: brand.name, description, images: [siteConfig.logoSrc]},
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const {brand,status} = await getPublicBrand();
  return (
    <html lang="ko">
      <body className="flex min-h-svh flex-col">
        <a href="#main-content" className="skip-link">본문 바로가기</a>
        <SiteHeader brand={brand} />
        <main id="main-content" tabIndex={-1} className="flex flex-1 flex-col">
          {children}
        </main>
        <SiteFooter brand={brand} status={status} />
      </body>
    </html>
  );
}
