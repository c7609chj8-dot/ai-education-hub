import { courses } from "@/data/mock/courses";
import { sections } from "@/config/navigation";
import { CourseCatalog } from "./course-catalog";

export const metadata = { title: sections.programs.label };

export default function ProgramsPage() {
  return (
    <>
      <section className="page-intro bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-8 sm:py-16">
          <p className="text-sm font-bold tracking-wide text-teal-ink">교육과정</p>
          <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight text-brand-navy sm:text-5xl">
            6개 학과의 AI 융합 교육과정
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
            관심 분야의 12주차 교육과정 초안을 선택하거나 검색해 보세요.
          </p>
          <p className="mt-2 text-sm font-semibold text-teal-ink">학과 소개와 주차별 교육내용은 검토용 초안입니다. 실제 교육시간·모집 일정·강사진은 확정 후 안내합니다.</p>
        </div>
      </section>
      <CourseCatalog courses={courses} />
    </>
  );
}
