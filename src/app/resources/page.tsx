import {assetSource} from "@/lib/assets/public";
import {AssetsUnavailable,PublishedAssets} from "@/components/assets/published-assets";
import Link from "next/link";
import { sections } from "@/config/navigation";

export const metadata = { title: sections.resources.label };
export const dynamic = "force-dynamic";

const resourceTopics = [
  { title: "AI 시작하기", description: "AI 도구를 처음 사용하는 분을 위한 기초 학습 자료를 준비합니다.", tag: "기초" },
  { title: "실습과 활용", description: "과정별 실습을 돕는 안내 자료를 준비합니다.", tag: "실습" },
  { title: "안전한 AI 활용", description: "AI를 책임 있게 활용하는 데 도움이 되는 자료를 준비합니다.", tag: "활용 안내" },
];

export default function ResourcesPage() {
  let source: "mock" | "supabase" | null = null;try { source=assetSource(); } catch { /* Invalid configuration fails closed. */ }
  if(!source)return <AssetsUnavailable/>;if(source==="supabase")return <PublishedAssets kind="resource"/>;
  return (
    <>
      <section className="bg-surface"><div className="mx-auto max-w-6xl px-4 py-14 sm:px-8 sm:py-16"><p className="text-sm font-bold tracking-wide text-teal-ink">교육정보</p><h1 className="mt-4 text-4xl font-bold tracking-tight text-brand-navy sm:text-5xl">교육자료실</h1><p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">배움에 도움이 되는 자료를 한곳에서 살펴볼 수 있도록 준비하고 있습니다.</p><p className="mt-3 text-sm font-semibold text-teal-ink">아래는 자료 분류 예시이며 현재 제공되는 파일은 없습니다.</p></div></section>
      <section aria-labelledby="resources-heading" className="bg-canvas"><div className="mx-auto max-w-6xl px-4 py-16 sm:px-8 sm:py-20"><h2 id="resources-heading" className="text-3xl font-bold tracking-tight text-brand-navy">준비 중인 자료</h2><p className="mt-3 leading-relaxed text-muted">자료가 확정되면 이곳에서 안내합니다.</p><div className="mt-8 grid gap-4 md:grid-cols-3">{resourceTopics.map((item) => <article key={item.title} className="flex flex-col rounded-card border border-line bg-surface p-6 sm:p-7"><span className="w-fit rounded-full bg-teal-soft px-3 py-1 text-sm font-semibold text-teal-ink">{item.tag} · 예시</span><h3 className="mt-5 text-xl font-bold text-brand-navy">{item.title}</h3><p className="mt-3 flex-1 leading-relaxed text-muted">{item.description}</p><p className="mt-6 border-t border-line pt-4 text-sm font-semibold text-muted">자료 준비 중</p></article>)}</div><div className="mt-10 rounded-card bg-brand-navy p-6 text-white sm:p-8"><h2 className="text-2xl font-bold">교육과정이 궁금하신가요?</h2><p className="mt-3 leading-relaxed">과정별 학습 내용과 예상 결과물을 살펴보세요.</p><Link href="/programs" className="ui-button mt-5 border-white bg-white text-brand-navy">교육과정 보기 <span aria-hidden="true">→</span></Link></div></div></section>
    </>
  );
}
