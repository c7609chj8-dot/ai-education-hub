import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { courses } from "@/data/mock/courses";

// 예시 강좌에 없는 주소는 첫 요청부터 404로 처리합니다.
export const dynamicParams = false;

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return courses.map((course) => ({ slug: course.slug }));
}

async function getCourse(params: PageProps["params"]) {
  const { slug } = await params;
  const course = courses.find((item) => item.slug === slug);
  if (!course) notFound();
  return course;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const course = await getCourse(params);
  return { title: course.title, description: course.summary };
}

export default async function ProgramDetailPage({ params }: PageProps) {
  const course = await getCourse(params);
  return (
    <>
      <section className="bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-8 sm:py-16">
          <Link href="/programs" className="inline-flex min-h-11 items-center rounded-control font-semibold text-brand-blue underline underline-offset-4">
            <span aria-hidden="true" className="me-2">←</span> 교육과정 목록
          </Link>
          <p className="mt-6 text-sm font-semibold text-teal-ink">{course.category}</p>
          <h1 className="mt-3 max-w-4xl text-4xl font-bold leading-tight tracking-tight text-brand-navy sm:text-5xl">
            {course.title}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">{course.summary}</p>
        </div>
      </section>

      <section aria-label="과정 소개" className="bg-canvas">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-8 sm:py-16 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12">
          <div className="space-y-10">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-brand-navy">이런 내용을 배웁니다</h2>
              <ul className="mt-5 space-y-4">
                {course.objectives.map((objective) => (
                  <li key={objective} className="flex gap-3 leading-relaxed text-ink">
                    <span aria-hidden="true" className="mt-2.5 size-2 shrink-0 rounded-full bg-brand-teal" />
                    <span>{objective}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="border-t border-line pt-8">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="text-2xl font-bold tracking-tight text-brand-navy">주차별 교육내용</h2>
                <p className="text-sm font-semibold text-muted">예정 · {course.weeksCount}주</p>
              </div>
              <ol aria-label="주차별 교육내용" className="mt-5 grid gap-2 sm:grid-cols-2">
                {course.weeks.map((title, index) => (
                  <li key={`${index}-${title}`} className="flex gap-3 rounded-control border border-line bg-surface px-4 py-3">
                    <span className="shrink-0 text-sm font-bold text-teal-ink">{index + 1}주</span>
                    <span className="leading-relaxed text-ink">{title}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="border-t border-line pt-8">
              <h2 className="text-2xl font-bold tracking-tight text-brand-navy">준비물과 안내</h2>
              <p className="mt-4 leading-relaxed text-muted">준비물과 세부 운영 방식은 확정 후 안내합니다.</p>
            </div>
          </div>

          <aside aria-labelledby="course-facts-heading" className="h-fit rounded-card border border-line bg-surface p-6 sm:p-8">
            <h2 id="course-facts-heading" className="text-xl font-bold text-brand-navy">과정 안내</h2>
            <dl className="mt-5 space-y-5">
              <div><dt className="text-sm font-semibold text-muted">교육 대상</dt><dd className="mt-1 font-semibold text-brand-navy">{course.audience}</dd></div>
              <div><dt className="text-sm font-semibold text-muted">예정 교육시간</dt><dd className="mt-1 font-semibold text-brand-navy">{course.weeksCount}주 · 주 2시간 · 총 {course.durationHours}시간</dd></div>
              <div><dt className="text-sm font-semibold text-muted">예상 결과물</dt><dd className="mt-1 font-semibold text-brand-navy">{course.resultArtifact}</dd></div>
            </dl>
            <p className="mt-6 border-t border-line pt-5 text-sm leading-relaxed text-muted">개강 일정과 모집 정보는 확정 후 안내합니다.</p>
            <Link href={`/schedule?course=${encodeURIComponent(course.id)}`} className="ui-button ui-button--primary mt-4 w-full">교육일정 확인하기 <span aria-hidden="true">→</span></Link>
          </aside>
        </div>
      </section>
    </>
  );
}
