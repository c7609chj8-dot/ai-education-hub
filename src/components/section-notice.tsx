import Link from "next/link";
import { Card } from "@/components/ui/card";
import type { PublicSection } from "@/config/navigation";

export function SectionNotice({ section }: { section: PublicSection }) {
  return (
    <div className="content-frame">
      <Card className="w-full">
        <h1 className="text-heading font-bold tracking-tight text-brand-navy">{section.label}</h1>
        <p className="mt-3 text-muted">{section.notice}</p>
        <Link href="/" className="mt-6 inline-flex min-h-11 items-center rounded-control font-semibold text-brand-blue underline underline-offset-4">
          홈으로 돌아가기
        </Link>
      </Card>
    </div>
  );
}
