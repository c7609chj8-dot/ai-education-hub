import { Card } from "@/components/ui/card";
import { siteConfig } from "@/config/site";
import { EducationIntro } from "./education-intro";

export default function Home() {
  return (
    <div className="content-frame">
      <Card className="w-full">
        <h1 className="text-heading font-bold tracking-tight text-brand-navy">
          AI 교육기관 홈페이지
        </h1>
        <p className="mt-3 text-muted">교육과정 안내를 준비하고 있습니다.</p>
        <EducationIntro slogan={siteConfig.slogan} description={siteConfig.description} />
      </Card>
    </div>
  );
}
