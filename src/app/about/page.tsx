import Link from "next/link";
import { sections } from "@/config/navigation";
import { siteConfig } from "@/config/site";

export const metadata = { title: sections.about.label };

const principles = [
  { title: "이해하기 쉽게", description: "낯선 기술도 익숙한 질문과 사례에서 출발합니다." },
  { title: "함께하며 직접", description: "설명과 실습을 연결하고 각자의 속도로 시도할 수 있도록 돕습니다." },
  { title: "안전하고 책임 있게", description: "정보의 출처를 확인하고 개인정보와 저작권을 고려하며 활용합니다." },
];

export default function AboutPage() {
  return (
    <>
      <section className="bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-8 sm:py-20">
          <p className="text-sm font-bold tracking-wide text-teal-ink">기관소개</p>
          <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_1fr] lg:gap-16">
            <h1 className="max-w-xl text-4xl font-bold leading-tight tracking-tight text-brand-navy sm:text-5xl">
              배움의 가능성을<br className="hidden sm:block" /> 일상 가까이
            </h1>
            <div className="max-w-xl text-lg leading-relaxed text-muted">
              <p>{siteConfig.name}{siteConfig.nameQualifier && ` (${siteConfig.nameQualifier})`}는 누구나 자신의 삶과 일에 AI를 활용할 수 있도록 돕는 교육을 준비하고 있습니다.</p>
              <p className="mt-4">처음 시작하는 분부터 새로운 활용법을 찾는 분까지, 각자의 목표를 향해 함께 배웁니다.</p>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="principles-heading" className="bg-canvas">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-8 sm:py-20">
          <h2 id="principles-heading" className="text-3xl font-bold tracking-tight text-brand-navy">우리가 지향하는 교육</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {principles.map((item) => (
              <article key={item.title} className="rounded-card border border-line bg-surface p-6">
                <h3 className="text-lg font-bold text-brand-navy">{item.title}</h3>
                <p className="mt-3 leading-relaxed text-muted">{item.description}</p>
              </article>
            ))}
          </div>
          <div className="mt-12 grid gap-5 border-t border-line pt-8 sm:grid-cols-2">
            <div><h3 className="font-bold text-brand-navy">강사 소개</h3><p className="mt-2 text-muted">강사진은 확정 후 안내하겠습니다.</p></div>
            <div><h3 className="font-bold text-brand-navy">기관 연혁</h3><p className="mt-2 text-muted">기관 정보는 확정 후 안내하겠습니다.</p></div>
          </div>
          <Link href="/programs" className="ui-button ui-button--primary mt-9">교육과정 살펴보기 <span aria-hidden="true">→</span></Link>
        </div>
      </section>
    </>
  );
}
