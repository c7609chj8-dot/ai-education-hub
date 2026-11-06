import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { siteConfig } from "@/config/site";
import { EducationIntro } from "./education-intro";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-svh max-w-3xl items-center px-4 py-10 sm:px-8">
      <Card className="w-full">
        <div className="flex flex-wrap items-center gap-3">
          <Image src={siteConfig.logoSrc} alt="" width={36} height={36} unoptimized />
          <span className="font-semibold text-brand-navy">{siteConfig.name}</span>
          {siteConfig.nameQualifier && <Badge>{siteConfig.nameQualifier}</Badge>}
        </div>
        <h1 className="mt-8 text-heading font-bold tracking-tight text-brand-navy">
          AI 교육기관 홈페이지
        </h1>
        <p className="mt-3 text-muted">교육과정 안내를 준비하고 있습니다.</p>
        <EducationIntro slogan={siteConfig.slogan} description={siteConfig.description} />
      </Card>
    </main>
  );
}
