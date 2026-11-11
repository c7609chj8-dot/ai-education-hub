import Image from "next/image";
import Link from "next/link";
import { sections } from "@/config/navigation";
import { sampleOutcomes } from "@/data/mock/courses";
import { sampleOutcomeVisuals, sampleTestimonials } from "@/data/mock/outcomes";

export const metadata = { title: sections.outcomes.label };

export default function OutcomesPage() {
  return (
    <>
      <section className="page-intro bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-8 sm:py-16">
          <p className="text-sm font-bold tracking-wide text-teal-ink">교육성과</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight tracking-tight text-brand-navy sm:text-5xl">
            배운 것을 나만의 결과물로
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
            검토용 교육과정에서 목표로 하는 결과물의 모습을 살펴보세요.
          </p>
          <p className="mt-3 text-sm font-semibold leading-relaxed text-teal-ink">
            이 페이지의 결과물과 후기는 실제 수료생 성과가 아닌 검토용 화면 예시입니다.
          </p>
        </div>
      </section>

      <section aria-labelledby="gallery-heading" className="bg-canvas">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-8 sm:py-20">
          <h2 id="gallery-heading" className="text-3xl font-bold tracking-tight text-brand-navy">결과물 갤러리</h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-muted">각 학과의 검토용 교육과정에서 목표로 하는 결과물 예시입니다.</p>
          <div className="mt-9 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {sampleOutcomes.map((course) => {
              const visual = sampleOutcomeVisuals[course.id];
              return (
                <article key={course.id} className="flex flex-col overflow-hidden rounded-card border border-line bg-surface">
                  {visual?.image ? (
                    <figure>
                      <Image src={visual.image.src} alt={visual.image.alt} width={1536} height={1024} sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw" className="aspect-[3/2] w-full object-cover" />
                      <figcaption className="px-6 pt-3 text-xs text-muted">AI로 생성한 예시 이미지</figcaption>
                    </figure>
                  ) : (
                    <figure>
                      <div role="img" aria-label={`${course.resultArtifact}을 표현한 시각 예시`} className="flex aspect-[3/2] items-center justify-center bg-teal-soft p-6">
                        <div aria-hidden="true" className="flex aspect-[3/4] h-full max-h-48 flex-col justify-between rounded-sm bg-brand-navy p-4 text-white shadow-sm">
                          <span className="text-xs font-semibold">결과물 예시</span>
                          <span className="text-lg font-bold leading-snug">{course.resultArtifact}</span>
                          <span className="h-1 w-8 bg-brand-teal" />
                        </div>
                      </div>
                      <figcaption className="px-6 pt-3 text-xs text-muted">결과물 시각 예시</figcaption>
                    </figure>
                  )}
                  <div className="flex flex-1 flex-col p-6">
                    <p className="text-sm font-semibold text-teal-ink">결과물 예시 · {course.category}</p>
                    <h3 className="mt-3 text-xl font-bold text-brand-navy">{course.resultArtifact}</h3>
                    <p className="mt-3 flex-1 leading-relaxed text-muted">{visual?.description ?? "과정에서 만들 수 있는 결과물의 예시입니다."}</p>
                    <p className="mt-5 text-sm text-muted">{course.title}</p>
                    <Link href={`/programs/${course.slug}`} aria-label={`${course.title} 과정 안내 보기`} className="mt-3 inline-flex min-h-11 w-fit items-center rounded-control font-semibold text-brand-blue underline underline-offset-4">
                      과정 안내 보기 <span aria-hidden="true" className="ms-2">→</span>
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section aria-labelledby="testimonials-heading" className="bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-8 sm:py-20">
          <h2 id="testimonials-heading" className="text-3xl font-bold tracking-tight text-brand-navy">학습자가 기대하는 배움</h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-muted">아래 문구는 화면 구성을 위한 가상의 후기 예시입니다.</p>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {sampleTestimonials.map((item) => (
              <figure key={item.id} className="rounded-card border border-line bg-canvas p-6 sm:p-8">
                <figcaption className="text-sm font-semibold text-teal-ink">가상의 후기 예시</figcaption>
                <blockquote className="mt-4 text-lg font-semibold leading-relaxed text-brand-navy">“{item.text}”</blockquote>
              </figure>
            ))}
          </div>
          <Link href="/programs" className="ui-button ui-button--primary mt-8">
            교육과정 살펴보기 <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>
    </>
  );
}
