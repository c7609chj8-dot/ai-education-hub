import Link from "next/link";
import { sampleOutcomes, type CoursePreview } from "@/data/mock/courses";
import { unstable_rethrow } from "next/navigation";
import { listCourses } from "@/lib/courses";
import { listSchedule } from "@/lib/schedule-data";
import type { ScheduleOffering } from "@/lib/schedule-types";
import { formatDate } from "@/lib/dates";

export async function HomePreviews() {
  let courses: CoursePreview[] = [];
  let offerings: ScheduleOffering[] = [];
  let example = false;
  let scheduleExample = false;
  let unavailable = false;
  let scheduleUnavailable = false;
  const [courseResult, scheduleResult] = await Promise.allSettled([listCourses(), listSchedule()]);
  if (courseResult.status === "fulfilled") {
    courses = courseResult.value.courses;
    example = courseResult.value.example;
  } else {
    unstable_rethrow(courseResult.reason);
    unavailable = true;
  }
  if (scheduleResult.status === "fulfilled") {
    offerings = scheduleResult.value.offerings;
    scheduleExample = scheduleResult.value.example;
  } else {
    unstable_rethrow(scheduleResult.reason);
    scheduleUnavailable = true;
  }
  return (
    <>
      <section aria-labelledby="programs-heading" className="bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-8 sm:py-20">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-sm font-bold tracking-wide text-teal-ink">교육과정</p>
              <h2 id="programs-heading" className="mt-3 text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl">관심에서 시작하는 AI 배움</h2>
              <p className="mt-4 text-muted">생활부터 업무와 창업까지, 나에게 필요한 과정을 찾아보세요.</p>
              {example && <p className="mt-2 text-sm text-muted">교육과정은 예시로 제공됩니다.</p>}
            </div>
            <Link href="/programs" className="inline-flex min-h-11 items-center rounded-control font-semibold text-brand-blue underline underline-offset-4">교육과정 전체 보기 <span aria-hidden="true" className="ms-2">→</span></Link>
          </div>
          {unavailable ? <p role="alert" className="mt-9 text-muted">교육과정을 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.</p> : courses.length === 0 ? <p className="mt-9 text-muted">등록된 교육과정이 없습니다.</p> : <div className="mt-9 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <article key={course.id} className="flex flex-col rounded-card border border-line bg-canvas p-6">
                <p className="text-sm font-semibold text-teal-ink">{course.category}</p>
                <h3 className="mt-3 text-xl font-bold leading-snug text-brand-navy">{course.title}</h3>
                <p className="mt-3 flex-1 leading-relaxed text-muted">{course.summary}</p>
                <p className="mt-5 text-sm text-muted">대상 · {course.audience}</p>
                <Link href={`/programs/${course.slug}`} aria-label={`${course.title} 과정 안내 보기`} className="mt-4 inline-flex min-h-11 w-fit items-center rounded-control font-semibold text-brand-blue underline underline-offset-4">과정 안내 보기 <span aria-hidden="true" className="ms-2">→</span></Link>
              </article>
            ))}
          </div>}
        </div>
      </section>

      <section aria-labelledby="schedule-heading" className="bg-canvas">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
          <div>
            <p className="text-sm font-bold tracking-wide text-teal-ink">교육일정</p>
            <h2 id="schedule-heading" className="mt-3 text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl">배움을 준비하는 시간</h2>
            <p className="mt-4 leading-relaxed text-muted">{scheduleExample ? "개강 일정은 확정 후 안내합니다. 아래 내용은 화면 구성 예시입니다." : "개강 일정을 확인해 보세요."}</p>
            <Link href="/schedule" className="mt-4 inline-flex min-h-11 items-center rounded-control font-semibold text-brand-blue underline underline-offset-4">교육일정 보기 <span aria-hidden="true" className="ms-2">→</span></Link>
          </div>
          <div className="overflow-hidden rounded-card border border-line bg-surface">
            {scheduleUnavailable ? <p role="alert" className="p-6 text-muted">교육일정을 불러올 수 없습니다.</p> : offerings.length === 0 ? <p className="p-6 text-muted">등록된 교육일정이 없습니다.</p> : offerings.slice(0, 2).map((offering) => (
              <article key={offering.id} className="border-b border-line p-6 last:border-b-0">
                <p className="text-sm font-semibold text-teal-ink">{scheduleExample ? "일정 예시 · " : ""}{offering.status}</p>
                <h3 className="mt-2 text-lg font-bold text-brand-navy">{offering.course.title}</h3>
                <p className="mt-2 text-sm text-muted">{offering.startDate ? formatDate(offering.startDate) : "날짜 미정"}{scheduleExample ? " · 실제 접수 전" : ""}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="outcomes-heading" className="bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-8 sm:py-20">
          <p className="text-sm font-bold tracking-wide text-teal-ink">교육성과</p>
          <h2 id="outcomes-heading" className="mt-3 text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl">배운 것을 나만의 결과물로</h2>
          <p className="mt-4 text-muted">과정에서 만들 수 있는 결과물의 예시입니다.</p>
          <div className="mt-9 grid gap-4 md:grid-cols-3">
            {sampleOutcomes.map((course) => (
              <article key={course.id} className="rounded-card border border-line p-6">
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
