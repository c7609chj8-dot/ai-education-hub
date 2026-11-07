import Link from "next/link";
import { courses } from "@/data/mock/courses";
import { DemoShell } from "../demo-shell";

export const metadata = { title: "관리자 시연 강좌 목록", robots: { index: false, follow: false } };

export default function DemoProgramsPage() {
  return (
    <DemoShell active="programs">
      <p className="text-sm font-bold text-teal-ink">DEMO PROGRAMS</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl">강좌 목록</h1>
      <p className="mt-3 leading-relaxed text-muted">공개 교육과정과 같은 예시 데이터를 읽기 전용으로 보여줍니다.</p>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold text-brand-navy">전체 강좌 <span className="text-brand-blue">{courses.length}</span><span className="text-base">개</span></h2><span className="rounded-full bg-teal-soft px-3 py-1 text-sm font-semibold text-teal-ink">시연용 · 읽기 전용</span></div>
      <ul className="mt-4 space-y-3">{courses.map(course => <li key={course.id} className="rounded-card border border-line bg-surface p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold text-teal-ink">{course.category} · 예시</p><h3 className="mt-2 text-xl font-bold text-brand-navy">{course.title}</h3></div><span className="rounded-full bg-canvas px-3 py-1 text-sm font-semibold text-muted">{course.weeksCount}주 · {course.durationHours}시간</span></div><p className="mt-3 leading-relaxed text-muted">{course.summary}</p><p className="mt-4 text-sm text-muted">교육 대상 · {course.audience}</p><Link href={`/programs/${course.slug}`} className="mt-3 inline-flex min-h-11 items-center rounded-control font-semibold text-brand-blue underline underline-offset-4" aria-label={`${course.title} 공개 과정 안내 보기`}>공개 과정 안내 보기 <span aria-hidden="true" className="ms-2">→</span></Link></li>)}</ul>
      <p className="mt-6 text-sm leading-relaxed text-muted">강좌 검색과 편집은 이후 관리자 시연 단계에서 준비합니다.</p>
    </DemoShell>
  );
}
