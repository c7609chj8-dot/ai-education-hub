"use client";

import Image from "next/image";
import { useId, useRef, useState, type KeyboardEvent } from "react";

import Link from "next/link";
import type { coursePhotos } from "@/data/course-photos";

const arrowClass = "grid size-11 cursor-pointer place-items-center rounded-full border border-line bg-surface text-xl text-brand-navy hover:bg-canvas";

export function HeroGallery({ photos }: { photos: typeof coursePhotos }) {
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
        <div aria-live="polite" aria-atomic="true">
          <span>{active + 1} / {photos.length}</span>
          <Link
            href={`/programs/${photos[active].slug}`}
            className="ms-2 inline-flex min-h-11 items-center rounded-control font-semibold text-brand-navy underline underline-offset-4"
          >
            {photos[active].title} <span aria-hidden="true" className="ms-1">→</span>
          </Link>
        </div>
        <span className="block">AI로 생성한 교육 장면 예시</span>
      </figcaption>
    </figure>
  );
}
