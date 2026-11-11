import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { findCourse } from "@/lib/courses";
import { coursePhotos } from "@/data/course-photos";

export const dynamic = "force-dynamic";
type PageProps = { params: Promise<{ slug: string }> };

async function getCourse(params: PageProps["params"]) {
  const { slug } = await params;
  const result = await findCourse(slug);
  if (!result) notFound();
  return result;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { course } = await getCourse(params);
  return { title: course.title, description: course.summary };
}

export default async function ProgramDetailPage({ params }: PageProps) {
  const { course, example } = await getCourse(params);
  const draft = example ? course.curriculumDraft : undefined;
  const photo = coursePhotos.find((item) => item.slug === course.slug);
  return (
    <>
      <section className="page-intro bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-8 sm:py-16">
          <Link href="/programs" className="inline-flex min-h-11 items-center rounded-control font-semibold text-brand-blue underline underline-offset-4">
            <span aria-hidden="true" className="me-2">←</span> 교육과정 목록
          </Link>
          <p className="mt-6 text-sm font-semibold text-teal-ink">{course.category}</p>
          <h1 className="mt-3 max-w-4xl text-4xl font-bold leading-tight tracking-tight text-brand-navy sm:text-5xl">
            {course.title}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">{course.summary}</p>
          {example && <p className="mt-3 text-sm font-semibold text-teal-ink">{draft ? "검토용 교육과정 초안 · 12주 구성은 미확정이며 교육시간·모집 일정은 별도 안내합니다." : "예시 교육과정입니다."}</p>}
          <nav aria-label="과정 상세 바로가기" className="mt-6 flex flex-wrap gap-3">
            <a href="#course-overview" className="ui-button ui-button--secondary">교육목표</a>
            <a href="#course-curriculum" className="ui-button ui-button--secondary">주차별 교육내용</a>
            <a href="#course-facts-heading" className="ui-button ui-button--secondary">교육시간·일정</a>
          </nav>
        </div>
      </section>

      <section aria-label="과정 소개" className="bg-canvas">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-8 sm:py-16 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12">
          <div className="space-y-10">
            <div id="course-overview" className="scroll-mt-6">
              {photo && <figure className="mb-8">
                <Image src={`/images/hero/${photo.slug}.jpg`} alt={photo.alt} width={1200} height={800} sizes="(min-width: 1024px) 672px, 100vw" className="aspect-[3/2] w-full rounded-card object-cover" />
                <figcaption className="mt-2 text-sm text-muted">AI로 생성한 교육 장면 예시</figcaption>
              </figure>}
              <h2 className="text-2xl font-bold tracking-tight text-brand-navy">이런 내용을 배웁니다</h2>
              {course.objectives.length > 0 ? <ul className="mt-5 space-y-4">
                {course.objectives.map((objective) => (
                  <li key={objective} className="flex gap-3 leading-relaxed text-ink">
                    <span aria-hidden="true" className="mt-2.5 size-2 shrink-0 rounded-full bg-brand-teal" />
                    <span>{objective}</span>
                  </li>
                ))}
              </ul> : <p className="mt-4 text-muted">교육 목표를 준비하고 있습니다.</p>}
            </div>
            {draft && <div className="border-t border-line pt-8">
              <h2 className="text-2xl font-bold tracking-tight text-brand-navy">핵심 교육내용 (초안)</h2>
              <ul className="mt-4 list-disc space-y-2 ps-5 text-ink">{draft.coreTopics.map((topic) => <li key={topic}>{topic}</li>)}</ul>
            </div>}
            <div id="course-curriculum" className="scroll-mt-6 border-t border-line pt-8">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="text-2xl font-bold tracking-tight text-brand-navy">주차별 교육내용</h2>
                <p className="text-sm font-semibold text-muted">{course.weeks.length > 0 ? `${draft ? "검토용 초안" : "예정"} · ${course.weeks.length}주` : "안내 예정"}</p>
              </div>
              {course.weeks.length > 0 ? <ol aria-label="주차별 교육내용" className="mt-5 grid gap-4 sm:grid-cols-2">
                {course.weeks.map((week) => (
                  <li key={week.weekNumber} className="curriculum-week flex gap-3">
                    <span className="shrink-0 text-sm font-bold text-teal-ink">{week.weekNumber}주</span>
                    <div className="min-w-0 leading-relaxed text-ink"><p className="font-semibold">{week.title}</p>{draft && <p className="mt-2 text-sm text-muted">실습과제: {draft.weeks[week.weekNumber - 1]?.practice}</p>}</div>
                  </li>
                ))}
              </ol> : <p className="mt-4 text-muted">주차별 교육내용을 준비하고 있습니다.</p>}
            </div>
            {draft && <div className="border-t border-line pt-8">
              <h2 className="text-2xl font-bold tracking-tight text-brand-navy">최종 프로젝트와 결과물 (초안)</h2>
              <p className="mt-4 leading-relaxed text-ink">{draft.finalProject}</p>
              <ul className="mt-4 list-disc space-y-2 ps-5 text-ink">{draft.deliverables.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>}
            <div className="border-t border-line pt-8">
              <h2 className="text-2xl font-bold tracking-tight text-brand-navy">준비물과 안내</h2>
              {draft ? <>
                <p className="mt-4 leading-relaxed text-muted">도구·장비는 검토용 후보입니다. 기관 보유·무료 도구를 우선 검토하며 확정 후 안내합니다.</p>
                <h3 className="mt-5 font-bold text-brand-navy">소프트웨어</h3>
                <ul className="mt-2 list-disc space-y-2 ps-5 text-ink">{draft.software.map((item) => <li key={item}>{item}</li>)}</ul>
                <h3 className="mt-5 font-bold text-brand-navy">장비·자료</h3>
                <ul className="mt-2 list-disc space-y-2 ps-5 text-ink">{draft.equipment.map((item) => <li key={item}>{item}</li>)}</ul>
              </> : <p className="mt-4 leading-relaxed text-muted">준비물과 세부 운영 방식은 확정 후 안내합니다.</p>}
            </div>
          </div>

          <aside aria-labelledby="course-facts-heading" className="h-fit rounded-card border border-line bg-surface p-6 shadow-sm sm:p-8 lg:sticky lg:top-6">
            <h2 id="course-facts-heading" className="text-xl font-bold text-brand-navy">과정 안내</h2>
            <dl className="mt-5 space-y-5">
              <div><dt className="text-sm font-semibold text-muted">교육 대상</dt><dd className="mt-1 font-semibold text-brand-navy">{course.audience}</dd></div>
              <div><dt className="text-sm font-semibold text-muted">예정 교육시간</dt><dd className="mt-1 font-semibold text-brand-navy">{course.durationHours === null ? "미확정 · 안내 예정" : `총 ${course.durationHours}시간`}</dd></div>
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
