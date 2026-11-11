"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { submitCourse, type ActionState } from "../management-actions";
import type { ManagedCourse } from "@/lib/admin/management-types";

const fieldClass = "mt-1 w-full rounded border border-line bg-white p-2 text-brand-navy";
export function CourseForm({ course }: { course?: ManagedCourse }) {
  const [state, setState] = useState<ActionState>(null), [pending, setPending] = useState(false);
  const running = useRef(false), id = useId();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (running.current || state?.unknown) return;
    const form = event.currentTarget; running.current = true; setPending(true); setState(null);
    try { const result = await submitCourse(null, new FormData(form)); setState(result); if (result?.success && !course) form.reset(); }
    catch { setState({error: "저장 결과를 확인하지 못했습니다. 입력을 보관하고 목록에서 확인해 주세요.", unknown: true}); }
    finally { running.current = false; setPending(false); }
  }
  return <form method="post" onSubmit={submit} className="mt-4 grid gap-4">
    <input type="hidden" name="id" value={course?.id ?? ""} />
    <label htmlFor={`${id}-slug`}>주소 식별자 (영문 소문자, 숫자, 하이픈)<input className={fieldClass} id={`${id}-slug`} name="slug" defaultValue={course?.slug} required maxLength={100} pattern="[a-z0-9]+(-[a-z0-9]+)*" /></label>
    <label htmlFor={`${id}-title`}>강좌명<input className={fieldClass} id={`${id}-title`} name="title" defaultValue={course?.title} required maxLength={200} /></label>
    <label htmlFor={`${id}-category`}>분야<input className={fieldClass} id={`${id}-category`} name="category" defaultValue={course?.category} required maxLength={100} /></label>
    <label htmlFor={`${id}-summary`}>강좌 소개<textarea className={fieldClass} id={`${id}-summary`} name="summary" defaultValue={course?.summary} required maxLength={4000} /></label>
    <label htmlFor={`${id}-audience`}>교육 대상<input className={fieldClass} id={`${id}-audience`} name="audience" defaultValue={course?.audience} required maxLength={500} /></label>
    <label htmlFor={`${id}-result`}>결과물<input className={fieldClass} id={`${id}-result`} name="result_artifact" defaultValue={course?.resultArtifact} required maxLength={500} /></label>
    <label htmlFor={`${id}-hours`}>교육 시간 (선택)<input className={fieldClass} id={`${id}-hours`} name="duration_hours" type="number" min={1} max={2147483647} defaultValue={course?.durationHours ?? ""} /></label>
    <label htmlFor={`${id}-objectives`}>학습 목표 (한 줄에 하나씩)<textarea className={fieldClass} id={`${id}-objectives`} name="objectives" defaultValue={course?.objectives.join("\n")} maxLength={10000} /></label>
    <label htmlFor={`${id}-state`}>공개 상태<select className={fieldClass} id={`${id}-state`} name="publication_state" defaultValue={course?.publicationState ?? "draft"}><option value="draft">작성 중</option><option value="published">공개</option><option value="archived">보관</option></select></label>
    {state?.error && <p role="alert" className="text-red-700">{state.error}</p>}
    {state?.success && <p role="status" className="text-teal-ink">{state.success}</p>}
    <button disabled={pending || state?.unknown} className="min-h-11 rounded bg-brand-navy px-4 py-2 font-bold text-white disabled:opacity-50">{pending ? "저장 중..." : course ? "강좌 수정" : "강좌 등록"}</button>
  </form>;
}
