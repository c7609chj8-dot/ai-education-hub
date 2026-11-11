"use client";
import {useRef,useState,type FormEvent} from "react";
import type {ActivityCategory,ActivityPage} from "@/lib/admin/activity-types";
import {readActivityAction} from "./actions";
const categories:Record<ActivityCategory,string>={application:"신청 상태",inquiry:"문의 상세·상태",content:"콘텐츠",asset:"자료·성과",brand:"브랜드"};
const actions={status_changed:"상태 변경",viewed:"상세 조회",saved:"저장"};
const statuses:Record<string,string>={received:"접수",reviewed:"확인",in_progress:"처리 중",completed:"처리 완료"};
const format=(v:string)=>new Intl.DateTimeFormat("ko-KR",{dateStyle:"medium",timeStyle:"medium",timeZone:"Asia/Seoul"}).format(new Date(v));
export function ActivityList(){
 const [selected,setSelected]=useState<ActivityCategory>("application"),[applied,setApplied]=useState<ActivityCategory>("application"),[page,setPage]=useState<ActivityPage|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState("");const running=useRef(false);
 async function load(kind:ActivityCategory,next:ActivityPage["next"]){if(running.current)return;running.current=true;setBusy(true);setError("");try{const f=new FormData();f.set("category",kind);f.set("before_at",next?.at??"");f.set("before_id",next?.id??"");const r=await readActivityAction(f);if(!r.ok){setError("이력을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");return;}setPage(r.value);setApplied(kind);}catch{setError("이력을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");}finally{running.current=false;setBusy(false);}}
 function onSubmit(event:FormEvent<HTMLFormElement>){event.preventDefault();void load(selected,null);}
 return <div className="mt-6"><form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3"><label>이력 구분<select className="mt-1 block min-h-11 rounded-control border border-line px-3" value={selected} onChange={(e)=>setSelected(e.target.value as ActivityCategory)} disabled={busy}>{Object.entries(categories).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><button disabled={busy} className="min-h-11 rounded-control bg-brand-navy px-5 font-bold text-white disabled:opacity-50">조회</button></form>
 <p className="mt-4 text-sm text-muted">{categories[applied]} · 조회할 때마다 담당자와 구분이 기록됩니다.</p>{error&&<p role="alert" className="mt-4 text-red-700">{error}</p>}
 {page===null?<p className="mt-5 text-muted">이력 구분을 선택하고 조회해 주세요.</p>:page.items.length===0?<p className="mt-5 text-muted">표시할 이력이 없습니다.</p>:<ul className="mt-5 space-y-3">{page.items.map((row)=><li key={row.id} className="rounded-control border border-line p-4"><p className="font-semibold text-brand-navy">{actions[row.action]}{row.revision!==null&&` · 버전 ${row.revision}`}{row.fromStatus&&row.toStatus&&` · ${statuses[row.fromStatus]} → ${statuses[row.toStatus]}`}</p><p className="mt-2 text-sm">{format(row.createdAt)}</p><p className="mt-2 break-all text-sm text-muted">담당자 ID: {row.actorId}</p>{row.targetId&&<p className="mt-1 break-all text-sm text-muted">대상 ID: {row.targetId}</p>}</li>)}</ul>}
 {page?.next&&<button type="button" disabled={busy} onClick={()=>void load(applied,page.next)} className="mt-5 min-h-11 rounded-control border border-brand-navy px-4 font-semibold disabled:opacity-50">다음 이력 보기</button>}
 </div>;
}
