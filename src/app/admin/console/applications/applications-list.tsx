"use client";
import { useRef, useState, type FormEvent } from "react";
import type { ApplicationCursor, ApplicationListItem, ApplicationPage } from "@/lib/admin/applications-types";
import { reviewApplicationAction, searchApplicationsAction } from "./actions";

const formatTime = (value: string) => new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul" }).format(new Date(value));
export function ApplicationsList({ initialPage }: { initialPage: ApplicationPage }) {
  const [items, setItems] = useState<ApplicationListItem[]>(initialPage.items);
  const [next, setNext] = useState<ApplicationCursor | null>(initialPage.next);
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const running = useRef(false);

  async function search(term: string, cursor: ApplicationCursor | null, append: boolean) {
    if (running.current) return;
    running.current = true; setBusy(true); setMessage("");
    try {
      const form = new FormData(); form.set("search", term); form.set("before_at", cursor?.at ?? ""); form.set("before_id", cursor?.id ?? "");
      const result = await searchApplicationsAction(form);
      if (!result.ok) { setMessage("목록을 불러오지 못했습니다. 다시 시도해 주세요."); return; }
      setItems((existing) => append ? [...existing, ...result.value.items.filter((item) => !existing.some((old) => old.id === item.id))] : result.value.items);
      setNext(result.value.next); setAppliedQuery(term);
    } catch { setMessage("목록을 불러오지 못했습니다. 다시 시도해 주세요."); }
    finally { running.current = false; setBusy(false); }
  }
  async function review(id: string) {
    if (running.current) return;
    running.current = true; setBusy(true); setMessage("");
    try {
      const form = new FormData(); form.set("id", id);
      const result = await reviewApplicationAction(form);
      if (!result.ok) { setMessage("상태를 확인하지 못했습니다. 목록을 다시 조회해 주세요."); return; }
      setItems((existing) => existing.map((item) => item.id === id ? { ...item, status: "reviewed", lastChangeAt: result.value.changedAt, lastActorId: result.value.actorId } : item));
      setMessage("신청을 확인 처리했습니다.");
    } catch { setMessage("상태를 확인하지 못했습니다. 목록을 다시 조회해 주세요."); }
    finally { running.current = false; setBusy(false); }
  }
  function onSearch(event: FormEvent<HTMLFormElement>) { event.preventDefault(); void search(query, null, false); }

  return <div className="mt-6">
    <p className="text-sm text-muted">이름 또는 연락처 끝 네 자리로 검색할 수 있습니다. 개인정보는 일부만 표시합니다.</p>
    <form onSubmit={onSearch} className="mt-4 flex flex-wrap gap-3" autoComplete="off">
      <label htmlFor="application-search" className="sr-only">이름 또는 연락처 끝 네 자리</label>
      <input id="application-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} maxLength={100} disabled={busy} placeholder="이름 또는 연락처 끝 네 자리" className="min-h-11 min-w-0 flex-1 rounded-control border border-line px-3 py-2" />
      <button disabled={busy} className="min-h-11 rounded-control bg-brand-navy px-5 py-2 font-bold text-white disabled:opacity-50">검색</button>
    </form>
    {message && <p role="status" className="mt-4 text-sm font-semibold">{message}</p>}
    {items.length === 0 ? <p className="mt-6 text-muted">신청 내역이 없습니다.</p> : <ul className="mt-6 space-y-3">
      {items.map((item) => <li key={item.id} className="rounded-control border border-line p-4">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold text-brand-navy">{item.courseTitle}</p><p className="mt-1 text-sm text-muted">{item.maskedName} · 연락처 끝 {item.contactLast4}</p></div><span className="font-semibold">{item.status === "received" ? "접수" : "확인"}</span></div>
        <p className="mt-2 text-sm text-muted">접수 {formatTime(item.createdAt)} · 교육 시작 {item.startDate ?? "미정"}</p>
        {item.lastChangeAt && item.lastActorId && <p className="mt-2 break-all text-sm text-muted">확인 {formatTime(item.lastChangeAt)} · 담당자 ID {item.lastActorId}</p>}
        {item.status === "received" && <button type="button" disabled={busy} onClick={() => void review(item.id)} className="mt-3 min-h-11 rounded-control border border-brand-navy px-4 py-2 font-semibold disabled:opacity-50">확인 처리</button>}
      </li>)}
    </ul>}
    {next && <button type="button" disabled={busy} onClick={() => void search(appliedQuery, next, true)} className="mt-5 min-h-11 rounded-control border border-brand-navy px-4 py-2 font-semibold disabled:opacity-50">더 보기</button>}
  </div>;
}
