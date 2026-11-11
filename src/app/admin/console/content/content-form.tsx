"use client";
import {useId,useRef,useState,type FormEvent} from "react";
import {saveContentAction} from "./actions";
import type {ManagedContent} from "@/lib/content/types";
const input="mt-1 w-full rounded-control border border-line bg-white p-2 text-ink";
export function ContentForm({content}:{content?:ManagedContent}){
 const id=useId(),running=useRef(false);
 const [state,setState]=useState<{error?:string;success?:string;unknown?:boolean}|null>(null),[pending,setPending]=useState(false);
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(running.current||state?.unknown)return;const form=event.currentTarget;running.current=true;setPending(true);setState(null);
  try{const result=await saveContentAction(null,new FormData(form));setState(result);if(result?.success&&!content)form.reset();}
  catch{setState({error:"저장 결과를 확인하지 못했습니다. 작성 내용을 보관한 뒤 목록을 새로고침해 확인해 주세요.",unknown:true});}
  finally{running.current=false;setPending(false);}
 }
 return <form method="post" onSubmit={submit} className="mt-4 grid gap-4">
  <input type="hidden" name="id" value={content?.id??""}/><input type="hidden" name="revision" value={content?.revision??""}/>
  {content?<><input type="hidden" name="kind" value={content.kind}/><p>구분: {content.kind==="news"?"공지":content.kind==="faq"?"FAQ":"교육협력"}</p></>:<label htmlFor={`${id}-kind`}>구분<select id={`${id}-kind`} name="kind" className={input}><option value="news">공지</option><option value="faq">FAQ</option><option value="partnership">교육협력</option></select></label>}
  <label htmlFor={`${id}-category`}>분야<input id={`${id}-category`} name="category" defaultValue={content?.category} maxLength={100} required className={input}/></label>
  <label htmlFor={`${id}-title`}>제목 또는 질문<input id={`${id}-title`} name="title" defaultValue={content?.title} maxLength={200} required className={input}/></label>
  <label htmlFor={`${id}-body`}>내용 또는 답변<textarea id={`${id}-body`} name="body" defaultValue={content?.body} maxLength={4000} rows={5} required className={input}/></label>
  <label htmlFor={`${id}-link`}>FAQ 관련 페이지 (선택)<select id={`${id}-link`} name="link_path" defaultValue={content?.linkPath??""} className={input}><option value="">연결 없음</option><option value="/programs">교육과정</option><option value="/schedule">교육일정</option><option value="/partnership">교육협력</option><option value="/contact">문의</option></select></label>
  <label htmlFor={`${id}-link-label`}>FAQ 링크 표시 문구<input id={`${id}-link-label`} name="link_label" defaultValue={content?.linkLabel??""} maxLength={50} className={input}/></label>
  <p className="text-sm text-muted">관련 페이지와 표시 문구는 FAQ에서만 함께 입력해 주세요.</p>
  <label htmlFor={`${id}-date`}>표시 날짜 (선택)<input id={`${id}-date`} name="display_date" type="date" defaultValue={content?.displayDate??""} className={input}/></label>
  <label htmlFor={`${id}-order`}>표시 순서<input id={`${id}-order`} name="sort_order" type="number" min={0} max={100000} defaultValue={content?.sortOrder??0} required className={input}/></label>
  <label className="flex items-center gap-2"><input type="checkbox" name="is_public" defaultChecked={content?.isPublic??false}/> 공개합니다</label>
  {state?.error&&<p role="alert" className="text-red-700">{state.error}</p>}{state?.success&&<p role="status" className="text-teal-ink">{state.success}</p>}
  <button disabled={pending||state?.unknown} className="min-h-11 rounded-control bg-brand-navy px-4 py-2 font-bold text-white disabled:opacity-50">{pending?"저장 중...":content?"변경 저장":"콘텐츠 등록"}</button>
 </form>;
}
