"use client";

import { CourseCard } from "@/components/course-card";
import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { CoursePreview } from "@/data/mock/courses";

function normalize(value: string) {
  return value.normalize("NFKC").trim().toLocaleLowerCase("ko-KR");
}

export function CourseCatalog({ courses }: { courses: CoursePreview[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("전체");
  const searchId = useId();
  const searchRef = useRef<HTMLInputElement>(null);
  const categories = ["전체", ...new Set(courses.map((course) => course.category))];
  const keyword = normalize(query);
  const filtered = courses.filter((course) => {
    const matchesCategory = category === "전체" || course.category === category;
    const searchable = [course.title, course.slug, course.category, course.audience, course.summary, course.resultArtifact]
      .map(normalize)
      .join(" ");
    return matchesCategory && searchable.includes(keyword);
  });

  function resetFilters() {
    setQuery("");
    setCategory("전체");
    searchRef.current?.focus();
  }

  return (
    <section aria-labelledby="catalog-heading" className="bg-canvas">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-8 sm:py-16">
        <h2 id="catalog-heading" className="sr-only">강좌 찾기</h2>
        <div className="rounded-card border border-line bg-surface p-5 sm:p-6">
          <label htmlFor={searchId} className="block font-bold text-brand-navy">강좌 검색</label>
          <p id={`${searchId}-help`} className="mt-1 text-sm text-muted">과정명, 분야, 대상 또는 결과물로 검색할 수 있습니다.</p>
          <input
            ref={searchRef}
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-describedby={`${searchId}-help`}
            placeholder="예: 전자책, 시니어, 업무"
            className="mt-3 min-h-11 w-full rounded-control border border-line bg-surface px-4 py-2 text-ink placeholder:text-muted sm:max-w-xl"
          />
          <fieldset className="mt-6">
            <legend className="font-bold text-brand-navy">분야별 보기</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {categories.map((item) => (
                <label key={item} className="course-filter">
                  <input
                    type="radio"
                    name="course-category"
                    value={item}
                    checked={category === item}
                    onChange={() => setCategory(item)}
                    className="sr-only"
                  />
                  <span>{item}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <p role="status" aria-atomic="true" className="font-semibold text-brand-navy">
            검색 결과 <span className="text-brand-blue">{filtered.length}</span>개
          </p>
          <Button variant="secondary" onClick={resetFilters}>검색 조건 초기화</Button>
        </div>

        {filtered.length > 0 ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-card border border-line bg-surface px-6 py-10 text-center">
            <p className="font-bold text-brand-navy">조건에 맞는 강좌가 없습니다.</p>
            <p className="mt-2 text-muted">검색어를 바꾸거나 다른 분야를 선택해 보세요.</p>
          </div>
        )}
      </div>
    </section>
  );
}
