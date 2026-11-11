"use client";

import Link from "next/link";
import { useState } from "react";

type FaqItem = {
  id: string;
  category: string;
  question: string;
  answer: string;
  href?: string;
  linkLabel?: string;
};

export function FaqList({ items, example = true }: { items: FaqItem[]; example?: boolean }) {
  const [category, setCategory] = useState("전체");
  const categories = ["전체", ...new Set(items.map((item) => item.category))];
  const visible = category === "전체" ? items : items.filter((item) => item.category === category);

  return (
    <section aria-label={example ? "질문 예시 목록" : "질문 목록"} className="bg-canvas">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-8 sm:py-16">
        <fieldset>
          <legend className="font-bold text-brand-navy">분야별 보기</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {categories.map((item) => (
              <label key={item} className="course-filter">
                <input type="radio" name="faq-category" value={item} checked={category === item} onChange={() => setCategory(item)} className="sr-only" />
                <span>{item}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <p role="status" aria-atomic="true" className="mt-7 text-sm font-semibold text-muted">질문{example ? " 예시" : ""} {visible.length}개</p>
        <ul className="mt-4 space-y-3">
          {visible.map((item) => (
            <li key={item.id}>
              <details className="information-item">
                <summary>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-teal-ink">{item.category}</span>
                    <span className="mt-2 block text-lg font-bold text-brand-navy">{item.question}</span>
                  </span>
                  <span className="information-indicator" aria-hidden="true">+</span>
                </summary>
                <div className="information-body">
                  <p>{item.answer}</p>
                  {item.href && item.linkLabel && (
                    <Link href={item.href} className="mt-3 inline-flex min-h-11 items-center rounded-control font-semibold text-brand-blue underline underline-offset-4">
                      {item.linkLabel} <span aria-hidden="true" className="ms-2">→</span>
                    </Link>
                  )}
                </div>
              </details>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
