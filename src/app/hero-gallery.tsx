"use client";

import Image from "next/image";
import { useId, useRef, useState, type KeyboardEvent } from "react";

const photos = [
  {
    slug: "life-chatgpt",
    title: "생활 속 챗GPT 활용",
    alt: "시니어 학습자가 강사와 함께 노트북을 사용하는 모습",
  },
  {
    slug: "ai-work",
    title: "생성형 AI 업무혁신 실무",
    alt: "직장인들이 노트북과 막대그래프를 보며 업무 자료를 검토하는 모습",
  },
  {
    slug: "ai-ebook",
    title: "AI 전자책 제작·작가 도전",
    alt: "예비 작가가 인쇄한 전자책 원고를 연필로 검토하는 모습",
  },
  {
    slug: "ai-instructor",
    title: "AI 전문강사·교육콘텐츠 제작",
    alt: "강사가 화면에 띄운 교육 자료를 보며 수업을 시연하는 모습",
  },
  {
    slug: "ai-business",
    title: "AI 소상공인 창업·마케팅",
    alt: "소상공인이 스마트폰으로 포장된 상품을 촬영하는 모습",
  },
];

const arrowClass = "grid size-11 cursor-pointer place-items-center rounded-full border border-line bg-surface text-xl text-brand-navy hover:bg-canvas";

export function HeroGallery() {
  const viewportId = useId();
  const viewportRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  function showPhoto(index: number) {
    const viewport = viewportRef.current;
    const next = (index + photos.length) % photos.length;
    const slide = viewport?.children.item(next);
    if (!(slide instanceof HTMLElement) || !viewport) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const wraps = index < 0 || index >= photos.length;
    viewport.scrollTo({
      left: slide.offsetLeft,
      behavior: reducedMotion || wraps ? "instant" : "smooth",
    });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const targets = {
      ArrowLeft: active - 1,
      ArrowRight: active + 1,
      Home: 0,
      End: photos.length - 1,
    };
    if (!(event.key === "ArrowLeft" || event.key === "ArrowRight" || event.key === "Home" || event.key === "End")) return;

    event.preventDefault();
    showPhoto(targets[event.key]);
  }

  return (
    <figure className="min-w-0">
      <div
        id={viewportId}
        ref={viewportRef}
        role="group"
        aria-label="교육과정 사진. 좌우 방향키로 사진 이동"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onScroll={(event) => {
          const { scrollLeft, clientWidth } = event.currentTarget;
          if (clientWidth) {
            setActive(Math.max(0, Math.min(photos.length - 1, Math.round(scrollLeft / clientWidth))));
          }
        }}
        className="relative flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-card bg-canvas [scrollbar-width:none]"
      >
        {photos.map((photo, index) => (
          <div key={photo.slug} className="w-full shrink-0 snap-start" aria-hidden={index !== active}>
            <Image
              src={`/images/hero/${photo.slug}.jpg`}
              alt={photo.alt}
              width={1200}
              height={800}
              priority={index === 0}
              sizes="(min-width: 1152px) 516px, (min-width: 1024px) 45vw, (min-width: 640px) calc(100vw - 4rem), calc(100vw - 2rem)"
              className="aspect-[3/2] w-full select-none object-cover"
              draggable={false}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-center gap-2">
        <button type="button" className={arrowClass} aria-label="이전 사진" aria-controls={viewportId} onClick={() => showPhoto(active - 1)}>
          <span aria-hidden="true">←</span>
        </button>
        <div className="flex" role="group" aria-label="사진 선택">
          {photos.map((photo, index) => (
            <button
              key={photo.slug}
              type="button"
              aria-label={`${index + 1}번 사진 · ${photo.title}`}
              aria-current={index === active ? "true" : undefined}
              aria-controls={viewportId}
              className="group grid h-11 w-8 cursor-pointer place-items-center rounded-control"
              onClick={() => showPhoto(index)}
            >
              <span aria-hidden="true" className={`size-2.5 rounded-full border border-brand-navy group-hover:bg-brand-teal ${index === active ? "bg-brand-navy" : "bg-surface"}`} />
            </button>
          ))}
        </div>
        <button type="button" className={arrowClass} aria-label="다음 사진" aria-controls={viewportId} onClick={() => showPhoto(active + 1)}>
          <span aria-hidden="true">→</span>
        </button>
      </div>
      <figcaption className="text-center text-xs text-muted">
        <span aria-live="polite" aria-atomic="true">{active + 1} / {photos.length} · {photos[active].title}</span>
        <span className="mt-1 block">AI로 생성한 교육 장면 예시</span>
      </figcaption>
    </figure>
  );
}
