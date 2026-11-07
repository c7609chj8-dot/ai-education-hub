"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { formatDate } from "@/lib/dates";
import { DemoShell } from "./demo-shell";
import { useDemo } from "./demo-state";

type Kind = "programs" | "offerings" | "applications";
type Row = { id: string; title: string; detail: string; group: string; info: string; slug?: string };
const config = {
  programs: { title: "강좌 목록", eyebrow: "DEMO PROGRAMS", filter: "분야", placeholder: "과정명 또는 분야 검색" },
  offerings: { title: "일정 목록", eyebrow: "DEMO SCHEDULE", filter: "모집 상태", placeholder: "과정명 또는 장소 검색" },
  applications: { title: "가상 신청 목록", eyebrow: "DEMO APPLICATIONS", filter: "확인 상태", placeholder: "가상 신청 번호 또는 과정명 검색" },
} as const;
const offeringStates = ["모집중", "마감임박", "마감", "예정"];
const applicationStates = ["확인 대기", "확인 완료"];
const fieldClass = "mt-2 min-h-11 w-full rounded-control border border-line bg-surface px-4 py-2 text-ink";

function EditDialog({ kind, row, onClose, onSave }: { kind: Kind; row: Row; onClose: () => void; onSave: (values: { title: string; detail: string; group: string }) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [title, setTitle] = useState(row.title);
  const [detail, setDetail] = useState(row.detail);
  const [group, setGroup] = useState(row.group);
  const [error, setError] = useState("");
  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) { element.showModal(); element.querySelector<HTMLElement>("input, textarea, select")?.focus(); }

  }, []);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (kind === "programs" && (!title.trim() || !detail.trim())) { setError("강좌명과 소개를 모두 입력해 주세요."); return; }
    onSave({ title: title.trim(), detail: detail.trim(), group });
    dialog.current?.close();
  }
  return <dialog ref={dialog} onClose={onClose} aria-labelledby="demo-edit-title" aria-describedby="demo-edit-help" className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-card border border-line bg-surface p-0 text-ink shadow-xl backdrop:bg-black/50">
    <form noValidate onSubmit={submit} className="p-6 sm:p-8">
      <p className="text-sm font-semibold text-teal-ink">편집 시연</p><h2 id="demo-edit-title" className="mt-2 text-2xl font-bold text-brand-navy">{kind === "programs" ? "강좌 편집" : kind === "offerings" ? "일정 편집" : "신청 상태 편집"}</h2>
      <p id="demo-edit-help" className="mt-3 text-sm leading-relaxed text-muted">변경 사항은 시연 화면에만 적용되며 시연 화면을 나가거나 새로고침하면 사라집니다. 실제 개인정보를 입력하지 마세요.</p>
      {kind === "programs" ? <div className="mt-6 space-y-5"><div><label htmlFor="demo-title" className="block font-semibold text-brand-navy">강좌명</label><input id="demo-title" value={title} onChange={e => { setTitle(e.target.value); setError(""); }} maxLength={100} required aria-invalid={!!error && !title.trim()} aria-describedby={error && !title.trim() ? "demo-edit-error" : undefined} className={fieldClass} /></div><div><label htmlFor="demo-summary" className="block font-semibold text-brand-navy">강좌 소개</label><textarea id="demo-summary" value={detail} onChange={e => { setDetail(e.target.value); setError(""); }} maxLength={300} rows={4} required aria-invalid={!!error && !detail.trim()} aria-describedby={error && !detail.trim() ? "demo-edit-error" : undefined} className={fieldClass} /></div></div> : kind === "offerings" ? <div className="mt-6 space-y-5"><p className="font-semibold text-brand-navy">{row.title}</p><div><label htmlFor="demo-status" className="block font-semibold text-brand-navy">모집 상태</label><select id="demo-status" value={group} onChange={e => setGroup(e.target.value)} className={fieldClass}>{offeringStates.map(value => <option key={value}>{value}</option>)}</select></div><div><label htmlFor="demo-location" className="block font-semibold text-brand-navy">장소 예시</label><select id="demo-location" value={detail} onChange={e => setDetail(e.target.value)} className={fieldClass}><option>온라인</option><option>강의실</option></select></div></div> : <div className="mt-6"><p className="font-semibold text-brand-navy">{row.title}</p><label htmlFor="demo-status" className="mt-4 block font-semibold text-brand-navy">확인 상태</label><select id="demo-status" value={group} onChange={e => setGroup(e.target.value)} className={fieldClass}>{applicationStates.map(value => <option key={value}>{value}</option>)}</select></div>}
      {error && <p id="demo-edit-error" role="alert" className="mt-4 font-semibold text-red-700">{error}</p>}
      <div className="mt-6 flex flex-wrap gap-3"><button type="submit" className="ui-button ui-button--primary">시연에 적용</button><button type="button" className="ui-button ui-button--secondary" onClick={() => dialog.current?.close()}>취소</button></div>
    </form>
  </dialog>;
}

export function DemoList({ kind }: { kind: Kind }) {
  const { programs, offerings, applications, updateProgram, updateOffering, updateApplication } = useDemo();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("전체");
  const [editing, setEditing] = useState<Row | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const titleOf = (id: string) => programs.find(item => item.id === id)?.title ?? "과정 예시";
  const rows: Row[] = kind === "programs" ? programs.map(item => ({ id: item.id, title: item.title, detail: item.summary, group: item.category, info: `${item.weeksCount}주 · ${item.durationHours}시간 · ${item.audience}`, slug: item.slug })) : kind === "offerings" ? offerings.map(item => ({ id: item.id, title: titleOf(item.courseId), detail: item.location, group: item.status, info: formatDate(item.startDate) })) : applications.map(item => ({ id: item.id, title: item.label, detail: titleOf(item.courseId), group: item.state, info: "개인정보 없는 가상 항목" }));
  const groups = kind === "programs" ? [...new Set(programs.map(item => item.category))] : kind === "offerings" ? offeringStates : applicationStates;
  const needle = query.normalize("NFKC").trim().toLocaleLowerCase("ko-KR");
  const visible = rows.filter(row => (filter === "전체" || row.group === filter) && [row.title, row.detail, row.group, row.info].some(value => value.normalize("NFKC").toLocaleLowerCase("ko-KR").includes(needle)));
  function save(values: { title: string; detail: string; group: string }) {
    if (!editing) return;
    if (kind === "programs") { const item = programs.find(item => item.id === editing.id); if (item) updateProgram({ ...item, title: values.title, summary: values.detail }); }
    if (kind === "offerings") { const item = offerings.find(item => item.id === editing.id); if (item) updateOffering({ ...item, location: values.detail, status: values.group }); }
    if (kind === "applications") { const item = applications.find(item => item.id === editing.id); if (item) updateApplication({ ...item, state: values.group }); }
  }
  function close() { setEditing(null); requestAnimationFrame(() => { if (opener.current?.isConnected) opener.current.focus(); else searchRef.current?.focus(); }); }
  return <DemoShell active={kind}>
    <p className="text-sm font-bold text-teal-ink">{config[kind].eyebrow}</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl">{config[kind].title}</h1><p className="mt-3 leading-relaxed text-muted">{kind === "applications" ? "실제 개인정보가 없는 가상 항목입니다." : "공개 화면과 분리된 예시 데이터를 편집해 볼 수 있습니다."} 변경 내용은 시연 화면을 나가거나 새로고침하면 초기화됩니다.</p>
    <div className="mt-8 grid gap-4 rounded-card border border-line bg-surface p-5 sm:grid-cols-[minmax(0,1fr)_12rem] sm:p-6"><div><label htmlFor="demo-search" className="block font-semibold text-brand-navy">목록 검색</label><input ref={searchRef} id="demo-search" type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder={config[kind].placeholder} className={fieldClass} /></div><div><label htmlFor="demo-filter" className="block font-semibold text-brand-navy">{config[kind].filter}</label><select id="demo-filter" value={filter} onChange={e => setFilter(e.target.value)} className={fieldClass}><option>전체</option>{groups.map(group => <option key={group}>{group}</option>)}</select></div></div>
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3"><p role="status" aria-atomic="true" className="font-semibold text-brand-navy">검색 결과 {visible.length}개 · 예시</p><button type="button" className="ui-button ui-button--secondary" onClick={() => { setQuery(""); setFilter("전체"); searchRef.current?.focus(); }}>검색 조건 초기화</button></div>
    {visible.length ? <ul className="mt-4 space-y-3">{visible.map(row => <li key={row.id} className="rounded-card border border-line bg-surface p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold text-teal-ink">{row.group} · 예시</p><h2 className="mt-2 text-xl font-bold text-brand-navy">{row.title}</h2></div><button type="button" aria-label={`${row.title} 편집`} className="ui-button ui-button--secondary" onClick={event => { opener.current = event.currentTarget; setEditing(row); }}>편집</button></div><p className="mt-3 leading-relaxed text-muted">{row.detail}</p><p className="mt-3 text-sm text-muted">{row.info}</p>{row.slug && <Link href={`/programs/${row.slug}`} className="mt-3 inline-flex min-h-11 items-center font-semibold text-brand-blue underline underline-offset-4" aria-label={`${row.title} 공개 원본 과정 보기`}>공개 원본 과정 보기 →</Link>}</li>)}</ul> : <div className="mt-4 rounded-card border border-line bg-surface p-8 text-center text-muted">조건에 맞는 예시 항목이 없습니다.</div>}
    {editing && <EditDialog key={editing.id} kind={kind} row={editing} onClose={close} onSave={save} />}
  </DemoShell>;
}
