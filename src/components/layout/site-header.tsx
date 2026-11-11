import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { SiteNavigation } from "./site-navigation";

export function SiteHeader() {
  return (
    <header className="relative z-10 border-b border-line bg-surface">
      <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-2 px-4 py-2 sm:px-8 lg:min-h-20">
        <Link
          href="/"
          aria-label={`${siteConfig.name} 홈`}
          className="flex min-h-11 min-w-0 items-center gap-3 rounded-control text-brand-navy"
        >
          <span className="flex shrink-0 items-center gap-2">
            <span className="relative block h-10 w-12 shrink-0 sm:h-14 sm:w-[67px]">
              <Image
                src={siteConfig.teamLogoSrc}
                alt=""
                fill
                sizes="(min-width: 640px) 67px, 48px"
                className="object-contain"
                unoptimized
              />
            </span>
            <span className="relative block size-10 shrink-0 sm:size-14">
              <Image
                src={siteConfig.logoSrc}
                alt=""
                fill
                sizes="(min-width: 640px) 56px, 40px"
                className="object-contain"
                unoptimized
              />
            </span>
          </span>
          <span className="min-w-0 text-xl font-bold leading-tight sm:text-2xl">{siteConfig.name}</span>
        </Link>
        <SiteNavigation />
      </div>
    </header>
  );
}
