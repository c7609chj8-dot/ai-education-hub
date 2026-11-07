"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import type { SubmissionResult } from "@/lib/applications/submission-types";

type PendingRequest = { requestId: string; offeringId: string; name: string; contact: string; noticeVersion: string };
type Props = {
  offeringId: string;
  offeringTitle: string;
  notice: { version: string; text: string };
  submitAction: (form: FormData) => Promise<SubmissionResult>;
};

// Prepared component only: there is no live route, notice, or Supabase adapter yet.
export function ApplicationForm({ offeringId, offeringTitle, notice, submitAction }: Props) {
  const prefix = useId();
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<"editing" | "submitting" | SubmissionResult["status"]>("editing");
  const pending = useRef<PendingRequest | null>(null);
  const running = useRef(false);
  const locked = status === "submitting" || status === "unknown";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (running.current || status === "accepted") return;
    if (!pending.current) {
      if (!name.trim() || !contact.trim() || !consent) { setStatus("invalid"); return; }
      if (!globalThis.crypto?.randomUUID) { setStatus("unavailable"); return; }
      pending.current = { requestId: globalThis.crypto.randomUUID(), offeringId, name, contact, noticeVersion: notice.version };
    }
    const request = pending.current;
    const previouslyUnknown = status === "unknown";
    const form = new FormData();
    form.set("request_id", request.requestId);
    form.set("offering_id", request.offeringId);
    form.set("name", request.name);
    form.set("contact", request.contact);
    form.set("notice_version", request.noticeVersion);
    form.set("consent", "on");
    running.current = true;
    setStatus("submitting");
    try {
      const result = await submitAction(form);
      if (result?.status === "accepted") {
        pending.current = null;
        setName(""); setContact(""); setConsent(false); setStatus("accepted");
      } else if (!previouslyUnknown && (result?.status === "invalid" || result?.status === "unavailable")) {
        pending.current = null;
        setStatus(result.status);
      } else setStatus("unknown");
    } catch { setStatus("unknown"); }
    finally { running.current = false; }
  }

  if (status === "accepted") return <div role="status" className="rounded-card border border-line bg-surface p-6">
    <h2 className="text-2xl font-bold text-brand-navy">신청이 접수되었습니다</h2>
    <p className="mt-3 text-muted">접수는 교육 참여 확정을 뜻하지 않습니다. 안내 사항을 확인해 주세요.</p>
  </div>;

  const inputClass = "mt-2 min-h-11 w-full rounded-control border border-line bg-surface px-4 py-2 text-ink";
  return <form noValidate onSubmit={submit} autoComplete="off" className="space-y-6 rounded-card border border-line bg-surface p-6">
    <h2 className="text-2xl font-bold text-brand-navy">수강신청</h2>
    <p className="text-muted">신청 기수: {offeringTitle}</p>
    <label htmlFor={`${prefix}-name`} className="block font-semibold">이름<input id={`${prefix}-name`} value={name} onChange={(e) => setName(e.target.value)} disabled={locked} required maxLength={100} autoComplete="name" className={inputClass} /></label>
    <label htmlFor={`${prefix}-contact`} className="block font-semibold">연락처<input id={`${prefix}-contact`} type="tel" inputMode="tel" value={contact} onChange={(e) => setContact(e.target.value)} disabled={locked} required maxLength={32} autoComplete="tel" className={inputClass} /></label>
    <div className="rounded-control border border-line bg-canvas p-4"><p className="font-semibold">개인정보 안내</p><p className="mt-2 whitespace-pre-wrap text-sm text-muted">{notice.text}</p>
      <label className="mt-4 flex items-start gap-3"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} disabled={locked} required className="mt-1 size-5 shrink-0" /> 안내 내용을 확인하고 동의합니다.</label>
    </div>
    {status === "invalid" && <p role="alert" className="font-semibold text-red-700">입력 내용과 개인정보 안내 확인을 다시 확인해 주세요.</p>}
    {status === "unavailable" && <p role="alert" className="font-semibold text-red-700">지금 신청을 접수할 수 없습니다. 모집 상태를 확인하거나 담당자에게 문의해 주세요.</p>}
    {status === "unknown" && <p role="alert" className="font-semibold text-red-700">접수 결과를 확인하지 못했습니다. 아래 버튼으로 같은 요청을 다시 확인해 주세요. 페이지를 닫거나 새로고침했다면 중복 신청 전 담당자에게 문의해 주세요.</p>}
    <button type="submit" disabled={status === "submitting"} className="min-h-11 rounded-control bg-brand-navy px-5 py-2 font-bold text-white disabled:opacity-50">{status === "submitting" ? "처리 중..." : status === "unknown" ? "같은 요청 다시 확인" : "신청하기"}</button>
    <noscript><p className="text-sm text-muted">신청을 진행하려면 JavaScript가 필요합니다.</p></noscript>
  </form>;
}
