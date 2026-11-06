"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";

type Field = "category" | "name" | "email" | "message" | "notice";
type Errors = Partial<Record<Field, string>>;

export function InquiryForm() {
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const retryRef = useRef(false);
  const [errors, setErrors] = useState<Errors>({});
  const [complete, setComplete] = useState(false);
  useEffect(() => {
    if (complete) headingRef.current?.focus();
    else if (retryRef.current) { formRef.current?.querySelector<HTMLSelectElement>("select")?.focus(); retryRef.current = false; }
  }, [complete]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const category = form.querySelector<HTMLSelectElement>("#" + CSS.escape(`${id}-category`))!;
    const name = form.querySelector<HTMLInputElement>("#" + CSS.escape(`${id}-name`))!;
    const email = form.querySelector<HTMLInputElement>("#" + CSS.escape(`${id}-email`))!;
    const message = form.querySelector<HTMLTextAreaElement>("#" + CSS.escape(`${id}-message`))!;
    const notice = form.querySelector<HTMLInputElement>("#" + CSS.escape(`${id}-notice`))!;
    const next: Errors = {};
    if (!category.value) next.category = "문의 유형을 선택해 주세요.";
    if (!name.value.trim()) next.name = "가상의 이름을 입력해 주세요.";
    if (!email.value.trim() || !email.validity.valid) next.email = "이메일 형식의 가상 주소를 입력해 주세요.";
    if (!message.value.trim()) next.message = "가상의 문의 내용을 입력해 주세요.";
    if (!notice.checked) next.notice = "시연 안내를 확인해 주세요.";
    setErrors(next);
    const first = (Object.keys(next) as Field[])[0];
    if (first) form.querySelector<HTMLElement>("#" + CSS.escape(`${id}-${first}`))?.focus();
    else { form.reset(); setComplete(true); }
  }
  const inputClass = "mt-2 min-h-11 w-full rounded-control border border-line bg-surface px-4 py-2 text-ink";
  const error = (field: Field) => errors[field] ? <p id={`${id}-${field}-error`} className="mt-2 text-sm font-semibold text-red-700">{errors[field]}</p> : null;
  const aria = (field: Field) => ({ "aria-invalid": !!errors[field], "aria-describedby": errors[field] ? `${id}-${field}-error` : undefined });
  if (complete) return <div className="rounded-card border border-line bg-surface p-6 sm:p-8"><p className="text-sm font-semibold text-teal-ink">문의 시연</p><h2 ref={headingRef} tabIndex={-1} className="mt-3 text-2xl font-bold text-brand-navy">입력 확인 완료 · 실제 문의 아님</h2><p className="mt-4 leading-relaxed text-muted">입력한 내용은 전송하거나 저장하지 않았습니다. 실제 문의는 접수되지 않았습니다.</p><button type="button" className="ui-button ui-button--primary mt-6" onClick={() => { retryRef.current = true; setErrors({}); setComplete(false); }}>다시 시연하기</button></div>;
  return (
    <div className="rounded-card border border-line bg-surface p-6 sm:p-8">
      <h2 className="text-2xl font-bold text-brand-navy">문의 입력 시연</h2>
      <p className="mt-3 text-sm leading-relaxed text-muted">모든 항목은 필수입니다. 실제 개인정보를 입력하지 마세요.</p>
      <noscript><p className="mt-3 font-semibold text-red-700">입력 확인 시연에는 자바스크립트가 필요합니다.</p></noscript>
      <form ref={formRef} noValidate onSubmit={submit} autoComplete="off" className="mt-7 space-y-6">
        <div><label htmlFor={`${id}-category`} className="block font-semibold text-brand-navy">문의 유형 <span aria-hidden="true">*</span></label><select id={`${id}-category`} defaultValue="" required {...aria("category")} className={inputClass}><option value="">선택해 주세요</option><option value="course">교육과정</option><option value="partnership">교육협력</option><option value="other">기타</option></select>{error("category")}</div>
        <div><label htmlFor={`${id}-name`} className="block font-semibold text-brand-navy">이름 <span aria-hidden="true">*</span></label><input id={`${id}-name`} type="text" required maxLength={100} {...aria("name")} className={inputClass} />{error("name")}</div>
        <div><label htmlFor={`${id}-email`} className="block font-semibold text-brand-navy">이메일 <span aria-hidden="true">*</span></label><input id={`${id}-email`} type="email" required maxLength={254} placeholder="가상의 이메일 주소" {...aria("email")} className={inputClass} />{error("email")}</div>
        <div><label htmlFor={`${id}-message`} className="block font-semibold text-brand-navy">문의 내용 <span aria-hidden="true">*</span></label><textarea id={`${id}-message`} required maxLength={2000} rows={5} {...aria("message")} className={inputClass} />{error("message")}</div>
        <div className="rounded-control border border-line bg-canvas p-4"><p className="text-sm leading-relaxed text-muted">입력 내용은 전송·저장되지 않으며 실제 문의로 접수되지 않습니다.</p><div className="mt-4 flex items-start gap-3"><input id={`${id}-notice`} type="checkbox" required {...aria("notice")} className="mt-1 size-5 shrink-0 accent-brand-blue" /><label htmlFor={`${id}-notice`} className="font-semibold text-brand-navy">시연 안내를 확인했습니다. <span aria-hidden="true">*</span></label></div>{error("notice")}</div>
        {Object.keys(errors).length > 0 && <p role="alert" className="font-semibold text-red-700">입력 항목을 확인해 주세요.</p>}
        <button type="submit" className="ui-button ui-button--primary">입력 내용 확인</button>
      </form>
    </div>
  );
}
