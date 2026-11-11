"use client";
import { useId, useRef, useState, type FormEvent } from "react";
import type { SubmissionResult } from "@/lib/applications/submission-types";

type Pending = { id: string; category: string; name: string; email: string; message: string; version: string };
export function InquiryForm({ notice, submitAction }: { notice: { version: string; text: string }; submitAction: (form: FormData) => Promise<SubmissionResult> }) {
  const id=useId(); const [category,setCategory]=useState(""); const [name,setName]=useState(""); const [email,setEmail]=useState("");
  const [message,setMessage]=useState(""); const [consent,setConsent]=useState(false);
  const [status,setStatus]=useState<"editing" | "submitting" | SubmissionResult["status"]>("editing");
  const pending=useRef<Pending | null>(null), running=useRef(false); const locked=status==="submitting"||status==="unknown";
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if(running.current||status==="accepted")return;
    if(!pending.current){
      if(!category||!name.trim()||!email.trim()||!message.trim()||!consent){setStatus("invalid");return;}
      if(!globalThis.crypto?.randomUUID){setStatus("unavailable");return;}
      pending.current={id:globalThis.crypto.randomUUID(),category,name,email,message,version:notice.version};
    }
    const request=pending.current,previouslyUnknown=status==="unknown",form=new FormData();
    form.set("request_id",request.id);form.set("category",request.category);form.set("name",request.name);form.set("email",request.email);form.set("message",request.message);form.set("notice_version",request.version);form.set("consent","on");
    running.current=true;setStatus("submitting");
    try {
      const result=await submitAction(form);
      if(result?.status==="accepted"){pending.current=null;setName("");setEmail("");setMessage("");setConsent(false);setStatus("accepted");}
      else if(!previouslyUnknown&&(result?.status==="invalid"||result?.status==="unavailable")){pending.current=null;setStatus(result.status);}
      else setStatus("unknown");
    } catch { setStatus("unknown"); } finally {running.current=false;}
  }
  if(status==="accepted")return <div role="status" className="rounded-card border border-line bg-surface p-6"><h2 className="text-2xl font-bold text-brand-navy">문의가 접수되었습니다</h2><p className="mt-3 text-muted">확인 후 안내 절차에 따라 처리합니다.</p></div>;
  const input="mt-2 min-h-11 w-full rounded-control border border-line bg-surface px-4 py-2 text-ink";
  return <form noValidate onSubmit={submit} autoComplete="off" className="space-y-6 rounded-card border border-line bg-surface p-6">
    <h2 className="text-2xl font-bold text-brand-navy">문의하기</h2>
    <label htmlFor={`${id}-category`} className="block font-semibold">문의 유형<select id={`${id}-category`} value={category} onChange={(e)=>setCategory(e.target.value)} disabled={locked} className={input}><option value="">선택해 주세요</option><option value="course">교육과정</option><option value="partnership">교육협력</option><option value="other">기타</option></select></label>
    <label htmlFor={`${id}-name`} className="block font-semibold">이름<input id={`${id}-name`} value={name} onChange={(e)=>setName(e.target.value)} disabled={locked} maxLength={100} className={input} /></label>
    <label htmlFor={`${id}-email`} className="block font-semibold">이메일<input id={`${id}-email`} type="email" value={email} onChange={(e)=>setEmail(e.target.value)} disabled={locked} maxLength={254} className={input} /></label>
    <label htmlFor={`${id}-message`} className="block font-semibold">문의 내용<textarea id={`${id}-message`} value={message} onChange={(e)=>setMessage(e.target.value)} disabled={locked} maxLength={2000} rows={5} className={input} /></label>
    <div className="rounded-control border border-line bg-canvas p-4"><p className="font-semibold">개인정보 안내</p><p className="mt-2 whitespace-pre-wrap text-sm text-muted">{notice.text}</p><label className="mt-4 flex items-start gap-3"><input type="checkbox" checked={consent} onChange={(e)=>setConsent(e.target.checked)} disabled={locked} className="mt-1 size-5 shrink-0" /> 안내 내용을 확인하고 동의합니다.</label></div>
    {status==="invalid"&&<p role="alert" className="font-semibold text-red-700">입력 내용과 개인정보 안내 확인을 다시 확인해 주세요.</p>}
    {status==="unavailable"&&<p role="alert" className="font-semibold text-red-700">지금 문의를 접수할 수 없습니다. 잠시 후 다시 시도해 주세요.</p>}
    {status==="unknown"&&<p role="alert" className="font-semibold text-red-700">접수 결과를 확인하지 못했습니다. 같은 요청을 다시 확인해 주세요. 페이지를 닫거나 새로고침했다면 중복 문의 전 담당자에게 확인해 주세요.</p>}
    <button disabled={status==="submitting"} className="min-h-11 rounded-control bg-brand-navy px-5 py-2 font-bold text-white disabled:opacity-50">{status==="submitting"?"처리 중...":status==="unknown"?"같은 요청 다시 확인":"문의 접수"}</button>
    <noscript><p className="text-sm text-muted">문의 접수에는 JavaScript가 필요합니다.</p></noscript>
  </form>;
}
