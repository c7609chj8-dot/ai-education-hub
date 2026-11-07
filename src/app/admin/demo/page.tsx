import Link from "next/link";
import { courses, sampleOfferings } from "@/data/mock/courses";
import { demoApplications } from "@/data/mock/admin";
import { formatDate } from "@/lib/dates";
import { DemoShell } from "./demo-shell";

export const metadata = { title: "관리자 시연 대시보드", robots: { index: false, follow: false } };

export default function AdminDemoPage() {
  const metrics = [
    { label: "강좌 예시", value: courses.length, unit: "개", note: "준비된 교육과정" },
    { label: "일정 예시", value: sampleOfferings.length, unit: "개", note: "가상의 교육 기수" },
    { label: "신청 예시", value: demoApplications.length, unit: "건", note: "가상의 신청 항목" },
  ];
  return (
    <DemoShell active="dashboard">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm font-bold text-teal-ink">DEMO OVERVIEW</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl">관리자 대시보드</h1><p className="mt-3 leading-relaxed text-muted">교육 운영 화면의 구성을 예시 데이터로 살펴보세요.</p></div>
        <span className="rounded-full border border-teal-ink/20 bg-teal-soft px-3 py-1 text-sm font-semibold text-teal-ink">시연용 데이터</span>
      </div>
      <section aria-label="예시 현황" className="mt-8 grid gap-4 sm:grid-cols-3">
        {metrics.map((item) => <div key={item.label} className="rounded-card border border-line bg-surface p-5 sm:p-6"><p className="text-sm font-semibold text-muted">{item.label}</p><p className="mt-4 text-3xl font-bold tracking-tight text-brand-navy">{item.value}<span className="ms-1 text-base font-semibold">{item.unit}</span></p><p className="mt-2 text-sm text-muted">{item.note}</p></div>)}
      </section>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section aria-labelledby="demo-program-heading" className="rounded-card border border-line bg-surface p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-semibold text-teal-ink">교육과정 예시</p><h2 id="demo-program-heading" className="mt-1 text-xl font-bold text-brand-navy">강좌 목록</h2></div><Link href="/admin/demo/programs" className="inline-flex min-h-11 items-center rounded-control text-sm font-semibold text-brand-blue underline underline-offset-4">전체 보기 <span aria-hidden="true" className="ms-2">→</span></Link></div>
          <ul className="mt-4 divide-y divide-line">{courses.slice(0, 3).map(course => <li key={course.id} className="flex items-start justify-between gap-4 py-4"><div><p className="font-semibold text-brand-navy">{course.title}</p><p className="mt-1 text-sm text-muted">{course.category} · {course.weeksCount}주</p></div><span className="shrink-0 rounded-full bg-canvas px-2.5 py-1 text-xs font-semibold text-muted">예시</span></li>)}</ul>
        </section>
        <section aria-labelledby="demo-schedule-heading" className="rounded-card border border-line bg-surface p-5 sm:p-6">
          <div><p className="text-xs font-semibold text-teal-ink">교육 기수 예시</p><h2 id="demo-schedule-heading" className="mt-1 text-xl font-bold text-brand-navy">예시 일정</h2></div>
          <ul className="mt-4 divide-y divide-line">{sampleOfferings.slice(0, 3).map(offering => <li key={offering.id} className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2 py-4"><div><p className="font-semibold text-brand-navy">{offering.course.title}</p><p className="mt-1 text-sm text-muted">{formatDate(offering.startDate)} · {offering.location}</p></div><span className="rounded-full bg-teal-soft px-2.5 py-1 text-xs font-semibold text-teal-ink">{offering.status} 예시</span></li>)}</ul>
        </section>
      </div>
      <section aria-labelledby="demo-application-heading" className="mt-6 rounded-card border border-line bg-surface p-5 sm:p-6">
        <p className="text-xs font-semibold text-teal-ink">신청 항목 예시</p><h2 id="demo-application-heading" className="mt-1 text-xl font-bold text-brand-navy">가상 신청 현황</h2><p className="mt-2 text-sm text-muted">실제 신청 내역이나 개인정보가 아닌 화면 구성용 가상 항목입니다.</p>
        <ul className="mt-4 divide-y divide-line">{demoApplications.map(item => { const course = courses.find(course => course.id === item.courseId); return <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><p className="font-semibold text-brand-navy">{item.label}</p><p className="mt-1 text-sm text-muted">{course?.title ?? "과정 예시"}</p></div><span className="rounded-full bg-canvas px-3 py-1 text-sm font-semibold text-muted">{item.state} · 예시</span></li>; })}</ul>
      </section>
    </DemoShell>
  );
}
