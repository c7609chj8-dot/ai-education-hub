import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import type { Brand } from "@/lib/brand/types";
import { SiteNavigation } from "./site-navigation";

export function SiteHeader({brand}:{brand:Brand}) {
  return (
    <header className="relative z-10 border-b border-line bg-surface">
      <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:px-8 lg:min-h-20">
        <Link
          href="/"
          aria-label={`${brand.name} 홈`}
          className="flex min-h-11 min-w-0 items-center gap-1.5 rounded-control font-semibold text-brand-navy sm:gap-3"
        >
          <Image src={siteConfig.logoSrc} alt="" width={36} height={36} className="size-8 shrink-0 sm:size-9" unoptimized />
          <span className="min-w-0 break-words">{brand.name}</span>

        </Link>
        <SiteNavigation />
      </div>
    </header>
  );
}
