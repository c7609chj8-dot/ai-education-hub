import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { courses } from "@/data/mock/courses";

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
    <div className="content-frame">
      <article className="w-full rounded-card border border-line bg-surface p-6 sm:p-10">
        <p className="text-sm font-semibold text-teal-ink">{course.category}</p>
        <h1 className="mt-3 text-heading font-bold tracking-tight text-brand-navy">{course.title}</h1>
        <p className="mt-4 leading-relaxed text-muted">{course.summary}</p>
        <p className="mt-4 text-sm text-muted">대상 · {course.audience}</p>
        <p className="mt-2 text-sm text-muted">예정 구성 · 12주 / 총 24시간</p>
        <p className="mt-6 border-s-4 border-brand-teal ps-4 text-muted">상세 교육내용은 준비 중입니다.</p>
        <Link href="/programs" className="mt-6 inline-flex min-h-11 items-center rounded-control font-semibold text-brand-blue underline underline-offset-4">
          교육과정 목록으로 돌아가기
        </Link>
      </article>
    </div>
  );
}
