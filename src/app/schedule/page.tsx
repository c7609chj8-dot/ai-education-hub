import { Suspense } from "react";
import { listCourses } from "@/lib/courses";
import { listSchedule } from "@/lib/schedule-data";
import { sections } from "@/config/navigation";
import { Schedule } from "./schedule";

export const metadata = { title: sections.schedule.label };

export default async function SchedulePage() {
  const [{ offerings, example }, { courses }] = await Promise.all([listSchedule(), listCourses()]);
  return (
    <>
      <section className="bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-8 sm:py-16">
          <p className="text-sm font-bold tracking-wide text-teal-ink">교육일정</p>
          <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight text-brand-navy sm:text-5xl">
            배움의 일정을 살펴보세요
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
            과정별 일정을 달력과 목록으로 확인할 수 있습니다.
          </p>
          {example && <p className="mt-3 max-w-2xl text-sm font-semibold leading-relaxed text-teal-ink">
            시연용 예시 일정입니다. 실제 모집·접수 정보는 확정 후 안내합니다.
          </p>}
        </div>
      </section>
      <Suspense fallback={<div className="content-frame"><p className="text-muted">교육일정을 불러오는 중입니다.</p></div>}>
        <Schedule offerings={offerings} example={example} courseOptions={courses.map(({ id, title }) => ({ id, title }))} />
      </Suspense>
    </>
  );
}
