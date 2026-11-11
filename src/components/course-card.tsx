import Image from "next/image";
import Link from "next/link";
import { coursePhotos } from "@/data/course-photos";
import type { CoursePreview } from "@/data/mock/courses";

export function CourseCard({ course }: { course: CoursePreview }) {
  const photo = coursePhotos.find((item) => item.slug === course.slug);

  return (
    <article className="course-card flex flex-col rounded-card border border-line bg-surface">
      {photo && (
        <Image
          src={`/images/hero/${photo.slug}.jpg`}
          alt={photo.alt}
          width={1200}
          height={800}
          sizes="(min-width: 1152px) 352px, (min-width: 1024px) 31vw, (min-width: 768px) 46vw, 100vw"
          className="aspect-[3/2] w-full rounded-t-card object-cover"
        />
      )}
      <div className="flex flex-1 flex-col px-5 pb-4 pt-5 sm:px-6">
        <p className="text-sm font-semibold text-teal-ink">{course.category}</p>
        <h3 className="mt-2 text-xl font-bold leading-snug text-brand-navy">{course.title}</h3>
        <p className="mt-2 text-sm font-semibold text-muted">검토용 교육과정 초안</p>
        <dl className="mb-3 mt-4 space-y-3 text-[17px] leading-relaxed sm:text-base">
          <div>
            <dt className="text-sm font-semibold text-muted">추천 대상</dt>
            <dd className="text-ink">{course.audience}</dd>
          </div>
          <div className="rounded-control bg-teal-soft px-3 py-2">
            <dt className="text-sm font-semibold text-teal-ink">예상 결과물</dt>
            <dd className="font-semibold text-brand-navy">{course.resultArtifact}</dd>
          </div>
        </dl>
        <Link
          href={`/programs/${course.slug}`}
          aria-label={`${course.title} 안내 보기`}
          className="mt-auto inline-flex min-h-11 w-fit items-center rounded-control font-semibold text-brand-blue underline underline-offset-4"
        >
          과정 안내 보기 <span aria-hidden="true" className="ms-2">→</span>
        </Link>
      </div>
    </article>
  );
}
