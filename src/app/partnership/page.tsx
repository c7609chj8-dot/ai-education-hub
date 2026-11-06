import Link from "next/link";
import { sections } from "@/config/navigation";

export const metadata = { title: sections.partnership.label };

const audiences = [
  { title: "대학·교육기관", description: "학습자의 수준과 교육 목표에 맞춘 AI 활용 교육을 함께 기획합니다." },
  { title: "기업·단체", description: "업무 현장의 과제와 구성원에게 필요한 AI 활용 교육을 살펴봅니다." },
  { title: "공공기관·지역사회", description: "지역과 참여자의 특성을 고려한 디지털 역량 교육을 함께 고민합니다." },
];
const steps = ["교육 대상과 목표 살펴보기", "교육 내용과 운영 방식 협의", "일정과 세부 내용 조율"];

export default function PartnershipPage() {
  return (
    <>
      <section className="bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-8 sm:py-16">
          <p className="text-sm font-bold tracking-wide text-teal-ink">교육협력</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight tracking-tight text-brand-navy sm:text-5xl">함께 만드는 AI 배움의 기회</h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">기관의 교육 목표와 참여자의 필요에 맞는 배움을 함께 준비합니다.</p>
          <p className="mt-3 text-sm font-semibold text-teal-ink">협력 내용과 운영 방식은 확정 전 안내입니다.</p>
          <Link href="/contact" className="ui-button ui-button--primary mt-7">문의 시연 살펴보기 <span aria-hidden="true">→</span></Link>
        </div>
      </section>
      <section aria-labelledby="partners-heading" className="bg-canvas">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-8 sm:py-20">
          <h2 id="partners-heading" className="text-3xl font-bold tracking-tight text-brand-navy">이런 기관과 함께합니다</h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-muted">다양한 현장의 교육 목적을 살펴보고 적합한 방향을 찾습니다.</p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {audiences.map((item, index) => <article key={item.title} className="rounded-card border border-line bg-surface p-6 sm:p-7"><p aria-hidden="true" className="text-sm font-bold text-teal-ink">0{index + 1}</p><h3 className="mt-5 text-xl font-bold text-brand-navy">{item.title}</h3><p className="mt-3 leading-relaxed text-muted">{item.description}</p></article>)}
          </div>
        </div>
      </section>
      <section aria-labelledby="steps-heading" className="bg-surface">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-8 sm:py-20 md:grid-cols-2 md:gap-16">
          <div><h2 id="steps-heading" className="text-3xl font-bold tracking-tight text-brand-navy">협력은 이렇게 논의합니다</h2><p className="mt-4 leading-relaxed text-muted">아래는 협의 과정의 예시입니다. 실제 문의 방법과 연락처는 확정 후 안내합니다.</p><Link href="/programs" className="mt-6 inline-flex min-h-11 items-center font-semibold text-brand-blue underline underline-offset-4">교육과정 둘러보기 <span aria-hidden="true" className="ms-2">→</span></Link></div>
          <ol className="space-y-3">{steps.map((step, index) => <li key={step} className="flex items-center gap-4 rounded-card border border-line bg-canvas p-5"><span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-teal-soft font-bold text-teal-ink">{index + 1}</span><span className="font-semibold text-brand-navy">{step}</span></li>)}</ol>
        </div>
      </section>
    </>
  );
}
