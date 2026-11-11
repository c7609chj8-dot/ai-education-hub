import Link from "next/link";
import { CourseCard } from "@/components/course-card";
import { courses, sampleOfferings, sampleOutcomes } from "@/data/mock/courses";
import { formatDate } from "@/lib/dates";

export function HomePreviews() {
  return (
    <>
      <section aria-labelledby="programs-heading" className="border-y border-line bg-canvas">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-8 sm:py-20">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-sm font-bold tracking-wide text-teal-ink">교육과정</p>
              <h2 id="programs-heading" className="mt-3 text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl">관심에서 시작하는 AI 배움</h2>
              <p className="mt-4 text-muted">6개 학과의 검토용 교육과정 초안을 살펴보세요.</p>
            </div>
            <Link href="/programs" className="inline-flex min-h-11 items-center rounded-control font-semibold text-brand-blue underline underline-offset-4">교육과정 전체 보기 <span aria-hidden="true" className="ms-2">→</span></Link>
          </div>
          <div className="mt-9 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="schedule-heading" className="bg-surface">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
          <div>
            <p className="text-sm font-bold tracking-wide text-teal-ink">교육일정</p>
            <h2 id="schedule-heading" className="mt-3 text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl">교육일정 예시</h2>
            <p className="mt-4 leading-relaxed text-muted">교육 날짜와 장소는 시연용 예시이며, 실제 일정은 확정 후 안내합니다.</p>
            <Link href="/schedule" className="mt-4 inline-flex min-h-11 items-center rounded-control font-semibold text-brand-blue underline underline-offset-4">전체 일정 달력 보기 <span aria-hidden="true" className="ms-2">→</span></Link>
          </div>
          <div className="grid gap-3">
            {sampleOfferings.slice(0, 2).map((offering) => (
              <article key={offering.id} className="rounded-card border border-line bg-canvas p-5 sm:p-6">
                <p className="text-sm font-semibold text-teal-ink">일정 예시 · {offering.status}</p>
                <h3 className="mt-2 text-lg font-bold text-brand-navy">{offering.course.title}</h3>
                <p className="mt-2 text-[17px] text-ink"><time dateTime={offering.startDate}>{formatDate(offering.startDate)}</time> · {offering.location}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="outcomes-heading" className="border-t border-line bg-canvas">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-8 sm:py-20">
          <p className="text-sm font-bold tracking-wide text-teal-ink">교육성과</p>
          <h2 id="outcomes-heading" className="mt-3 text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl">배운 것을 나만의 결과물로</h2>
            <p className="mt-4 text-muted">검토용 교육과정에서 목표로 하는 결과물의 예시입니다.</p>
          <div className="mt-9 grid gap-4 md:grid-cols-3">
            {sampleOutcomes.map((course) => (
              <article key={course.id} className="rounded-card border border-line bg-surface p-6">
                <p className="text-sm font-semibold text-teal-ink">결과물 예시</p>
                <h3 className="mt-3 text-xl font-bold text-brand-navy">{course.resultArtifact}</h3>
                <p className="mt-3 text-sm text-muted">{course.title}</p>
              </article>
            ))}
          </div>
          <Link href="/outcomes" className="mt-5 inline-flex min-h-11 items-center rounded-control font-semibold text-brand-blue underline underline-offset-4">교육성과 보기 <span aria-hidden="true" className="ms-2">→</span></Link>
        </div>
      </section>

      <section aria-labelledby="connect-heading" className="bg-brand-navy text-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <h2 id="connect-heading" className="text-2xl font-bold sm:text-3xl">함께하는 AI 교육을 준비합니다</h2>
            <p className="mt-3 max-w-2xl leading-relaxed text-white">새로운 소식과 기관을 위한 교육협력 안내를 확인해 보세요.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/news" className="inline-flex min-h-11 items-center rounded-control border border-white bg-white px-4 py-2 font-semibold text-brand-navy focus-visible:outline-white">공지사항</Link>
            <Link href="/partnership" className="inline-flex min-h-11 items-center rounded-control border border-white px-4 py-2 font-semibold text-white focus-visible:outline-white">교육협력</Link>
          </div>
        </div>
      </section>
    </>
  );
}
