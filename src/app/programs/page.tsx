import { listCourses } from "@/lib/courses";
import { sections } from "@/config/navigation";
import { CourseCatalog } from "./course-catalog";

export const metadata = { title: sections.programs.label };

export const dynamic = "force-dynamic";

export default async function ProgramsPage() {
  const { courses, example } = await listCourses();
  return (
    <>
      <section className="bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-8 sm:py-16">
          <p className="text-sm font-bold tracking-wide text-teal-ink">교육과정</p>
          <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight text-brand-navy sm:text-5xl">
            나에게 맞는 AI 배움을 찾아보세요
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
            생활에서 업무와 창업까지, 관심 있는 분야를 선택하거나 검색해 보세요.
          </p>
          {example && <p className="mt-2 text-sm text-muted">교육과정은 예시로 제공됩니다.</p>}
        </div>
      </section>
      <CourseCatalog courses={courses} />
    </>
  );
}
