"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/dates";

type Choice = { id: string; title: string; startDate: string; status: string };
type Field = "offering" | "name" | "contact" | "consent";
type Errors = Partial<Record<Field, string>>;

export function ApplicationForm({ initialOfferingId, choices }: { initialOfferingId: string; choices: Choice[] }) {
  const [offeringId, setOfferingId] = useState(initialOfferingId);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [verified, setVerified] = useState(false);
  const prefix = useId();
  const offeringRef = useRef<HTMLSelectElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const contactRef = useRef<HTMLInputElement>(null);
  const consentRef = useRef<HTMLInputElement>(null);
  const completionRef = useRef<HTMLHeadingElement>(null);
  const retryRef = useRef(false);

  useEffect(() => {
    if (verified) completionRef.current?.focus();
    else if (retryRef.current) {
      offeringRef.current?.focus();
      retryRef.current = false;
    }
  }, [verified]);

  function clearError(field: Field) {
    setErrors((previous) => ({ ...previous, [field]: undefined }));
    setVerified(false);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: Errors = {};
    if (!choices.some((choice) => choice.id === offeringId)) nextErrors.offering = "예시 기수를 선택해 주세요.";
    if (!name.trim()) nextErrors.name = "가상의 이름을 입력해 주세요.";
    const digits = contact.replace(/\D/g, "");
    if (!/^\+?[0-9 ()-]+$/.test(contact.trim()) || digits.length < 9 || digits.length > 15) {
      nextErrors.contact = "전화번호 형식으로 숫자 9~15자리를 입력해 주세요.";
    }
    if (!consent) nextErrors.consent = "시연 안내 확인란을 선택해 주세요.";
    setErrors(nextErrors);
    const valid = Object.keys(nextErrors).length === 0;
    if (valid) {
      setName("");
      setContact("");
      setConsent(false);
    }
    setVerified(valid);

    if (nextErrors.offering) offeringRef.current?.focus();
    else if (nextErrors.name) nameRef.current?.focus();
    else if (nextErrors.contact) contactRef.current?.focus();
    else if (nextErrors.consent) consentRef.current?.focus();
  }

  const selectedChoice = choices.find((choice) => choice.id === offeringId);
  const selectedId = `${prefix}-offering-selected`;
  const inputClass = "mt-2 min-h-11 w-full rounded-control border border-line bg-surface px-4 py-2 text-ink";
  const errorId = (field: Field) => `${prefix}-${field}-error`;

  if (verified && selectedChoice) {
    return (
      <div className="rounded-card border border-line bg-surface p-6 sm:p-8">
        <p className="text-sm font-semibold text-teal-ink">수강신청 시연</p>
        <h2 ref={completionRef} tabIndex={-1} className="mt-3 text-2xl font-bold text-brand-navy">시연 완료 · 실제 접수 아님</h2>
        <p className="mt-4 leading-relaxed text-muted">입력한 내용은 전송하거나 저장하지 않았습니다. 실제 수강신청은 접수되지 않았습니다.</p>
        <p className="mt-5 rounded-control border border-line bg-canvas p-4 text-sm leading-relaxed text-ink">
          선택한 예시 · {selectedChoice.title} · {formatDate(selectedChoice.startDate)}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={() => { retryRef.current = true; setVerified(false); }}>다시 시연하기</Button>
          <Link href="/schedule" className="ui-button ui-button--secondary">교육일정 보기</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-card border border-line bg-surface p-6 sm:p-8">
      <h2 className="text-2xl font-bold text-brand-navy">신청 정보 입력</h2>
      <p className="mt-3 leading-relaxed text-muted">개인정보 대신 가상의 이름과 연락처를 입력해 주세요.</p>
      <p className="mt-2 text-sm text-muted">필수 항목을 입력한 뒤 확인 버튼을 눌러 주세요.</p>

      {/* name 속성이 없어 JavaScript가 꺼진 상태에서도 입력값이 URL에 포함되지 않습니다. */}
      <form noValidate onSubmit={handleSubmit} autoComplete="off" className="mt-8 space-y-6">
        <div>
          <label htmlFor={`${prefix}-offering`} className="block font-semibold text-brand-navy">예시 기수 <span aria-hidden="true">*</span></label>
          <select ref={offeringRef} id={`${prefix}-offering`} value={offeringId} onChange={(event) => { setOfferingId(event.target.value); clearError("offering"); }} aria-required="true" aria-invalid={!!errors.offering} aria-describedby={[selectedChoice ? selectedId : null, errors.offering ? errorId("offering") : null].filter(Boolean).join(" ") || undefined} className={inputClass}>
            <option value="">기수를 선택해 주세요</option>
            {choices.map((choice) => <option key={choice.id} value={choice.id}>{choice.title} · {formatDate(choice.startDate)} · {choice.status} 예시</option>)}
          </select>
          {selectedChoice && <p id={selectedId} className="mt-2 text-sm leading-relaxed text-muted">선택한 예시 · {selectedChoice.title} · {formatDate(selectedChoice.startDate)} · {selectedChoice.status}</p>}
          {errors.offering && <p id={errorId("offering")} className="mt-2 text-sm font-semibold text-red-700">{errors.offering}</p>}
        </div>
        <div>
          <label htmlFor={`${prefix}-name`} className="block font-semibold text-brand-navy">이름 <span aria-hidden="true">*</span></label>
          <input ref={nameRef} id={`${prefix}-name`} type="text" value={name} onChange={(event) => { setName(event.target.value); clearError("name"); }} autoComplete="off" aria-required="true" aria-invalid={!!errors.name} aria-describedby={errors.name ? errorId("name") : undefined} className={inputClass} />
          {errors.name && <p id={errorId("name")} className="mt-2 text-sm font-semibold text-red-700">{errors.name}</p>}
        </div>
        <div>
          <label htmlFor={`${prefix}-contact`} className="block font-semibold text-brand-navy">연락처 <span aria-hidden="true">*</span></label>
          <input ref={contactRef} id={`${prefix}-contact`} type="tel" inputMode="tel" value={contact} onChange={(event) => { setContact(event.target.value); clearError("contact"); }} autoComplete="off" placeholder="숫자와 하이픈으로 입력" aria-required="true" aria-invalid={!!errors.contact} aria-describedby={errors.contact ? errorId("contact") : undefined} className={inputClass} />
          {errors.contact && <p id={errorId("contact")} className="mt-2 text-sm font-semibold text-red-700">{errors.contact}</p>}
        </div>
        <div className="rounded-control border border-line bg-canvas p-4">
          <p className="font-semibold text-brand-navy">개인정보 안내</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">이 화면은 입력 과정을 살펴보는 시연입니다. 입력 내용은 전송·저장되지 않으며 실제 수강신청으로 처리되지 않습니다.</p>
          <div className="mt-4 flex items-start gap-3">
            <input ref={consentRef} id={`${prefix}-consent`} type="checkbox" checked={consent} onChange={(event) => { setConsent(event.target.checked); clearError("consent"); }} aria-required="true" aria-invalid={!!errors.consent} aria-describedby={errors.consent ? errorId("consent") : undefined} className="mt-1 size-5 shrink-0 accent-brand-blue" />
            <label htmlFor={`${prefix}-consent`} className="font-semibold text-brand-navy">시연 안내를 확인했습니다. <span aria-hidden="true">*</span></label>
          </div>
          {errors.consent && <p id={errorId("consent")} className="mt-2 text-sm font-semibold text-red-700">{errors.consent}</p>}
        </div>
        {Object.values(errors).some(Boolean) && <p role="alert" className="font-semibold text-red-700">입력 항목을 확인해 주세요.</p>}
        <Button type="submit">입력 내용 확인</Button>
      </form>
    </div>
  );
}
