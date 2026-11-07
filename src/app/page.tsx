import Image from "next/image";
import Link from "next/link";
import { getPublicBrand } from "@/lib/brand/public";
import { siteConfig } from "@/config/site";
import { EducationIntro } from "./education-intro";
import { HomePreviews } from "@/components/home-previews";

const learningValues = [
  { title: "쉽게 시작하는 배움", description: "처음 만나는 분도 일상에서 쓰는 말과 예시로 차근차근 배웁니다." },
  { title: "직접 해보는 실습", description: "관심 있는 주제를 바탕으로 질문하고 만들며 나만의 활용법을 익힙니다." },
  { title: "삶과 일에 이어지는 결과", description: "배운 내용을 생활과 업무에 적용할 수 있는 결과물로 정리합니다." },
];

export default async function Home() {
  const {brand} = await getPublicBrand();
  return (
    <>
      <section className="bg-surface">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 pb-14 pt-12 sm:px-8 sm:pb-20 sm:pt-16 lg:grid-cols-2 lg:gap-14 lg:py-20">
          <div>
            <p className="text-sm font-bold tracking-wide text-teal-ink">모두를 위한 AI 교육</p>
            <h1 className="mt-5 max-w-xl text-4xl font-bold leading-tight tracking-tight text-brand-navy sm:text-5xl">
              {brand.slogan}
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted">{siteConfig.description}</p>
            <p className="mt-3 max-w-lg leading-relaxed text-muted">
              생활 속 작은 궁금증부터 일의 새로운 방법까지, 함께 배우고 직접 만들어 봅니다.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/programs" className="ui-button ui-button--primary">교육과정 살펴보기 <span aria-hidden="true">→</span></Link>
              <Link href="/about" className="ui-button ui-button--secondary">기관소개</Link>
            </div>
          </div>
          {siteConfig.heroImageSrc && (
            <figure>
              <Image
                src={siteConfig.heroImageSrc}
                alt="여러 세대의 성인 학습자들이 강사와 노트북을 살펴보는 AI 생성 예시 이미지"
                width={1536}
                height={1024}
                priority
                sizes="(min-width: 1024px) 48vw, 100vw"
                className="aspect-[3/2] w-full rounded-card object-cover"
              />
              <figcaption className="mt-2 text-xs text-muted">AI로 생성한 교육 장면 예시</figcaption>
            </figure>
          )}
        </div>
      </section>

      <section aria-labelledby="learning-heading" className="bg-canvas">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-8 sm:py-20">
          <div className="max-w-2xl">
            <p className="text-sm font-bold tracking-wide text-teal-ink">교육 방향</p>
            <h2 id="learning-heading" className="mt-3 text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl">배움이 일상에서 쓰이도록</h2>
            <p className="mt-4 leading-relaxed text-muted">서로 다른 경험과 속도를 존중하며, 배운 것을 직접 활용할 수 있도록 함께합니다.</p>
          </div>
          <div className="mt-9 grid gap-4 md:grid-cols-3">
            {learningValues.map((value) => (
              <article key={value.title} className="rounded-card border border-line bg-surface p-6">
                <span aria-hidden="true" className="block h-1 w-10 rounded-full bg-brand-teal" />
                <h3 className="mt-5 text-lg font-bold text-brand-navy">{value.title}</h3>
                <p className="mt-3 leading-relaxed text-muted">{value.description}</p>
              </article>
            ))}
          </div>
          <EducationIntro />
        </div>
      </section>
      <HomePreviews />
    </>
  );
}
