"use client";

import Image from "next/image";
import { useRef } from "react";
import { siteConfig } from "@/config/site";
import { DemoShell } from "../demo-shell";
import { initialBrand, useDemo } from "../demo-state";

const inputClass = "mt-2 min-h-11 w-full rounded-control border border-line bg-surface px-4 py-2 text-ink";

export function DemoBrandSettings() {
  const { brand, updateBrand } = useDemo();
  const nameRef = useRef<HTMLInputElement>(null);
  return <DemoShell active="settings">
    <p className="text-sm font-bold text-teal-ink">DEMO BRAND SETTINGS</p>
    <h1 className="mt-2 text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl">브랜드 설정 시연</h1>
    <p className="mt-3 max-w-2xl leading-relaxed text-muted">기관 소개에 사용할 문구를 바꿔보세요. 미리보기에만 적용되며 공개 홈페이지에는 반영되지 않습니다.</p>
    <div className="mt-8 grid gap-6 xl:grid-cols-2">
      <section aria-labelledby="settings-fields" className="rounded-card border border-line bg-surface p-5 sm:p-6">
        <h2 id="settings-fields" className="text-xl font-bold text-brand-navy">문구 입력</h2>
        <p id="settings-help" className="mt-3 text-sm leading-relaxed text-muted">시연 화면을 나가거나 새로고침하면 초기값으로 돌아갑니다. 실제 개인정보 대신 가상의 문구를 입력해 주세요.</p>
        <div className="mt-6 space-y-5">
          <div><label htmlFor="brand-name" className="block font-semibold text-brand-navy">기관명</label><input ref={nameRef} id="brand-name" value={brand.name} onChange={e => updateBrand({ ...brand, name: e.target.value })} maxLength={60} aria-describedby="settings-help" className={inputClass} /></div>
          <div><label htmlFor="brand-slogan" className="block font-semibold text-brand-navy">슬로건</label><textarea id="brand-slogan" value={brand.slogan} onChange={e => updateBrand({ ...brand, slogan: e.target.value })} rows={3} maxLength={120} aria-describedby="settings-help" className={inputClass} /></div>
          <div><label htmlFor="brand-contact" className="block font-semibold text-brand-navy">연락처 안내 문구</label><input id="brand-contact" value={brand.contactNotice} onChange={e => updateBrand({ ...brand, contactNotice: e.target.value })} maxLength={100} aria-describedby="contact-help" className={inputClass} /><p id="contact-help" className="mt-2 text-sm leading-relaxed text-muted">실제 연락처는 미정입니다. 안내용 가상 문구만 입력해 주세요.</p></div>
        </div>
        <button type="button" className="ui-button ui-button--secondary mt-6" onClick={() => { updateBrand({ ...initialBrand }); nameRef.current?.focus(); }}>초기 문구로 되돌리기</button>
      </section>
      <section aria-labelledby="preview-heading" className="rounded-card border border-line bg-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold text-teal-ink">시연용 미리보기</p><h2 id="preview-heading" className="mt-1 text-xl font-bold text-brand-navy">이렇게 보일 수 있어요</h2></div><span className="rounded-full bg-teal-soft px-3 py-1 text-sm font-semibold text-teal-ink">저장되지 않음</span></div>
        <div className="mt-5 overflow-hidden rounded-control border border-line bg-canvas">
          {siteConfig.heroImageSrc && <figure><Image src={siteConfig.heroImageSrc} alt="여러 세대의 성인 학습자들이 강사와 노트북을 살펴보는 AI 생성 예시 이미지" width={1536} height={1024} sizes="(min-width: 1280px) 400px, (min-width: 768px) 600px, 100vw" className="aspect-[3/2] w-full object-cover" /><figcaption className="px-5 pt-3 text-xs text-muted">AI로 생성한 교육 장면 예시</figcaption></figure>}
          <div className="p-5 sm:p-6"><p className="text-sm font-semibold text-teal-ink">기관명 예시</p><p className="mt-2 text-xl font-bold text-brand-navy">{brand.name.trim() || "기관명을 입력해 주세요"}</p><p className="mt-4 text-sm font-semibold text-teal-ink">슬로건 예시</p><p className="mt-2 text-lg font-semibold leading-relaxed text-ink">{brand.slogan.trim() || "슬로건을 입력해 주세요"}</p><p className="mt-5 border-t border-line pt-4 text-sm leading-relaxed text-muted">{brand.contactNotice.trim() || "연락처 안내 문구를 입력해 주세요"}</p></div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-muted">대표 이미지는 현재 설정된 시연용 이미지를 표시합니다.</p>
      </section>
    </div>
  </DemoShell>;
}
