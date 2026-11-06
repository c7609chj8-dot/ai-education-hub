import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { siteConfig } from "@/config/site";
import { SiteNavigation } from "./site-navigation";

export function SiteHeader() {
  return (
    <header className="relative z-10 border-b border-line bg-surface">
      <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:px-8 lg:min-h-20">
        <Link
          href="/"
          aria-label={`${siteConfig.name} 홈`}
          className="flex min-h-11 min-w-0 items-center gap-1.5 rounded-control font-semibold text-brand-navy sm:gap-3"
        >
          <Image src={siteConfig.logoSrc} alt="" width={36} height={36} className="size-8 shrink-0 sm:size-9" unoptimized />
          <span>{siteConfig.name}</span>
          {siteConfig.nameQualifier && <Badge className="shrink-0 whitespace-nowrap">{siteConfig.nameQualifier}</Badge>}
        </Link>
        <SiteNavigation />
      </div>
    </header>
  );
}
