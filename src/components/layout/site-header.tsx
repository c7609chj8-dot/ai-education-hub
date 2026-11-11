import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import type { Brand } from "@/lib/brand/types";
import { SiteNavigation } from "./site-navigation";

export function SiteHeader({ brand }: { brand: Brand }) {
  return (
    <header className="relative z-10 border-b border-line bg-surface">
      <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:px-8 lg:min-h-20">
        <Link
          href="/"
          aria-label={`${brand.name} 홈`}
          className="flex min-h-11 min-w-0 items-center gap-2 rounded-control text-brand-navy sm:gap-3"
        >
          <span className="relative block size-20 shrink-0 rounded-control sm:size-24">
            <Image
              src={siteConfig.logoSrc}
              alt=""
              fill
              sizes="(min-width: 640px) 96px, 80px"
              className="rounded-control object-contain"
              unoptimized
            />
          </span>
          <span className="min-w-0 text-xl font-bold leading-tight sm:text-2xl">{brand.name}</span>
        </Link>
        <SiteNavigation />
      </div>
    </header>
  );
}
