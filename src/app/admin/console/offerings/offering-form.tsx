"use client";

import { useActionState, useId } from "react";
import { submitOffering } from "../management-actions";
import type { ManagedCourse, ManagedOffering } from "@/lib/admin/management-types";

const fieldClass = "mt-1 w-full rounded border border-line bg-white p-2 text-brand-navy";
export function OfferingForm({ courses, offering }: { courses: ManagedCourse[]; offering?: ManagedOffering }) {
  const [state, action, pending] = useActionState(submitOffering, null);
  const id = useId();
  return <form action={action} className="mt-4 grid gap-4">
    <input type="hidden" name="id" value={offering?.id ?? ""} />
    <label htmlFor={`${id}-course`}>강좌<select className={fieldClass} id={`${id}-course`} name="course_id" defaultValue={offering?.courseId ?? ""} required><option value="">강좌 선택</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.title} ({course.publicationState === "published" ? "공개" : "비공개"})</option>)}</select></label>
    <label htmlFor={`${id}-start`}>시작일 (선택)<input className={fieldClass} id={`${id}-start`} name="start_date" type="date" defaultValue={offering?.startDate ?? ""} /></label>
    <label htmlFor={`${id}-end`}>종료일 (선택)<input className={fieldClass} id={`${id}-end`} name="end_date" type="date" defaultValue={offering?.endDate ?? ""} /></label>
    <label htmlFor={`${id}-location`}>장소 (선택)<input className={fieldClass} id={`${id}-location`} name="location" defaultValue={offering?.location ?? ""} maxLength={500} /></label>
    <label htmlFor={`${id}-capacity`}>정원<input className={fieldClass} id={`${id}-capacity`} name="capacity" type="number" min={0} max={2147483647} defaultValue={offering?.capacity ?? 0} required /></label>
    <label htmlFor={`${id}-status`}>진행 상태<select className={fieldClass} id={`${id}-status`} name="status" defaultValue={offering?.status ?? "draft"}><option value="draft">작성 중</option><option value="scheduled">예정</option><option value="open">모집 중</option><option value="closed">모집 마감</option><option value="finished">종료</option><option value="cancelled">취소</option></select></label>
    <label className="flex items-center gap-2"><input name="is_public" type="checkbox" defaultChecked={offering?.isPublic ?? false} /> 일정을 공개합니다</label>
    <p className="text-sm text-muted">공개 강좌의 작성 중이 아닌 기수만 공개할 수 있습니다. 실제 신청 기능은 아직 연결되지 않았습니다.</p>
    {state?.error && <p role="alert" className="text-red-700">{state.error}</p>}
    {state?.success && <p role="status" className="text-teal-ink">{state.success}</p>}
    <button disabled={pending || courses.length === 0} className="min-h-11 rounded bg-brand-navy px-4 py-2 font-bold text-white disabled:opacity-50">{pending ? "저장 중..." : offering ? "기수 수정" : "기수 등록"}</button>
  </form>;
}
