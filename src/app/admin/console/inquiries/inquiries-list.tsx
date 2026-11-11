"use client";
import { useRef,useState,type FormEvent } from "react";
import type { ApplicationCursor } from "@/lib/admin/applications-types";
import type { InquiryCategory,InquiryDetail,InquiryItem,InquiryPage,InquiryStatus } from "@/lib/admin/inquiries-types";
import { advanceInquiryAction,readInquiryAction,searchInquiriesAction } from "./actions";
const labels:Record<InquiryStatus,string>={received:"접수",in_progress:"처리 중",completed:"처리 완료"};
const categories:Record<InquiryCategory,string>={course:"교육과정",partnership:"교육협력",other:"기타"};
const format=(value:string)=>new Intl.DateTimeFormat("ko-KR",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Seoul"}).format(new Date(value));
export function InquiriesList({initialPage}:{initialPage:InquiryPage}){
  const [items,setItems]=useState<InquiryItem[]>(initialPage.items),[next,setNext]=useState<ApplicationCursor|null>(initialPage.next),[query,setQuery]=useState(""),[applied,setApplied]=useState(""),[detail,setDetail]=useState<InquiryDetail|null>(null),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);const running=useRef(false);
  async function search(term:string,cursor:ApplicationCursor|null,append:boolean){
    if(running.current)return;running.current=true;setBusy(true);setMessage("");setDetail(null);
    try{const form=new FormData();form.set("search",term);form.set("before_at",cursor?.at??"");form.set("before_id",cursor?.id??"");const result=await searchInquiriesAction(form);
      if(!result.ok){setMessage("목록을 불러오지 못했습니다. 다시 시도해 주세요.");return;}
      setItems((old)=>append?[...old,...result.value.items.filter((row)=>!old.some((v)=>v.id===row.id))]:result.value.items);setNext(result.value.next);setApplied(term);
    }catch{setMessage("목록을 불러오지 못했습니다. 다시 시도해 주세요.");}finally{running.current=false;setBusy(false);}
  }
  async function open(id:string){
    if(running.current)return;running.current=true;setBusy(true);setDetail(null);setMessage("");
    try{const form=new FormData();form.set("id",id);const result=await readInquiryAction(form);if(!result.ok){setMessage("상세 내용을 불러오지 못했습니다.");return;}setDetail(result.value);}
    catch{setMessage("상세 내용을 불러오지 못했습니다.");}finally{running.current=false;setBusy(false);}
  }
  async function advance(value:InquiryDetail){
    if(running.current||value.status==="completed")return;running.current=true;setBusy(true);setMessage("");
    try{const form=new FormData();form.set("id",value.id);form.set("expected",value.status);const result=await advanceInquiryAction(form);
      if(!result.ok){setMessage("변경 결과를 확인하지 못했습니다. 목록을 다시 조회해 주세요.");setDetail(null);return;}
      setItems((old)=>old.map((row)=>row.id===value.id?{...row,status:result.value.status,lastChangeAt:result.value.changedAt,lastActorId:result.value.actorId}:row));setDetail({...value,status:result.value.status});setMessage("문의 상태를 변경했습니다.");
    }catch{setMessage("변경 결과를 확인하지 못했습니다. 목록을 다시 조회해 주세요.");setDetail(null);}finally{running.current=false;setBusy(false);}
  }
  function onSearch(event:FormEvent<HTMLFormElement>){event.preventDefault();void search(query,null,false);}
  return <div className="mt-6"><p className="text-sm text-muted">이름으로 검색할 수 있습니다. 상세 조회와 상태 변경은 담당자 이력에 기록됩니다.</p>
    <form onSubmit={onSearch} autoComplete="off" className="mt-4 flex flex-wrap gap-3"><label htmlFor="inquiry-search" className="sr-only">이름 검색</label><input id="inquiry-search" type="search" value={query} onChange={(e)=>setQuery(e.target.value)} maxLength={100} disabled={busy} placeholder="이름 검색" className="min-h-11 min-w-0 flex-1 rounded-control border border-line px-3 py-2"/><button disabled={busy} className="min-h-11 rounded-control bg-brand-navy px-5 py-2 font-bold text-white disabled:opacity-50">검색</button></form>
    {message&&<p role="status" className="mt-4 text-sm font-semibold">{message}</p>}
    {items.length===0?<p className="mt-6 text-muted">문의 내역이 없습니다.</p>:<ul className="mt-6 space-y-3">{items.map((row)=><li key={row.id} className="rounded-control border border-line p-4"><p className="font-bold text-brand-navy">{categories[row.category]} · {row.maskedName} · {labels[row.status]}</p><p className="mt-2 text-sm text-muted">접수 {format(row.createdAt)}</p>{row.lastChangeAt&&row.lastActorId&&<p className="mt-2 break-all text-sm text-muted">변경 {format(row.lastChangeAt)} · 담당자 ID {row.lastActorId}</p>}<button type="button" disabled={busy} onClick={()=>void open(row.id)} className="mt-3 min-h-11 rounded-control border border-brand-navy px-4 py-2 font-semibold disabled:opacity-50">상세 보기</button></li>)}</ul>}
    {next&&<button type="button" disabled={busy} onClick={()=>void search(applied,next,true)} className="mt-5 min-h-11 rounded-control border border-brand-navy px-4 py-2 font-semibold disabled:opacity-50">더 보기</button>}
    {detail&&<section aria-label="문의 상세" className="mt-6 rounded-control border border-line bg-canvas p-4"><h2 className="text-xl font-bold">문의 상세</h2><p className="mt-3 break-all">이름: {detail.name}</p><p className="mt-2 break-all">이메일: {detail.email}</p><p className="mt-3 whitespace-pre-wrap break-words">{detail.message}</p><p className="mt-3">상태: {labels[detail.status]}</p><div className="mt-4 flex flex-wrap gap-3">{detail.status!=="completed"&&<button type="button" disabled={busy} onClick={()=>void advance(detail)} className="min-h-11 rounded-control bg-brand-navy px-4 py-2 font-semibold text-white disabled:opacity-50">{detail.status==="received"?"처리 시작":"처리 완료"}</button>}<button type="button" disabled={busy} onClick={()=>setDetail(null)} className="min-h-11 rounded-control border border-brand-navy px-4 py-2 font-semibold disabled:opacity-50">상세 닫기</button></div></section>}
  </div>;
}
