import {contentSource} from "@/lib/content/public";
import {ContentUnavailable,PublishedContent} from "@/components/content/published-content";
import { sections } from "@/config/navigation";
import { sampleFaqs } from "@/data/mock/information";
import { FaqList } from "./faq-list";

export const metadata = { title: sections.faq.label };
export const dynamic = "force-dynamic";

export default function FaqPage() {
  let source: "mock" | "supabase" | null = null;
  try { source = contentSource(); } catch { /* Invalid configuration fails closed. */ }
  if (!source) return <ContentUnavailable/>;
  if (source === "supabase") return <PublishedContent kind="faq"/>;
  return (
    <>
      <section className="page-intro bg-surface">
        <div className="mx-auto max-w-4xl px-4 py-14 sm:px-8 sm:py-16">
          <p className="text-sm font-bold tracking-wide text-teal-ink">교육정보</p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-brand-navy sm:text-5xl">자주 묻는 질문</h1>
          <p className="mt-5 text-lg leading-relaxed text-muted">교육과 신청에 관해 궁금한 내용을 살펴보세요.</p>
          <p className="mt-3 text-sm font-semibold text-teal-ink">시연용 질문과 답변 예시입니다.</p>
        </div>
      </section>
      <FaqList items={sampleFaqs} />
    </>
  );
}
