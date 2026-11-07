"use client";
import {useRef,useState,type FormEvent} from "react";
import {useRouter} from "next/navigation";
export function UploadForm(){
 const router=useRouter(),running=useRef(false);const [pending,setPending]=useState(false),[status,setStatus]=useState<"idle"|"saved"|"invalid"|"denied"|"unknown">("idle");
 async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();if(running.current||status==="unknown")return;const form=event.currentTarget;running.current=true;setPending(true);setStatus("idle");
  try{const response=await fetch("/api/admin/assets",{method:"POST",body:new FormData(form),credentials:"same-origin",cache:"no-store"});const data=await response.json();
   if(data.status==="saved"){setStatus("saved");form.reset();router.refresh();}else if(data.status==="invalid"||data.status==="denied")setStatus(data.status);else setStatus("unknown");
  }catch{setStatus("unknown");}finally{running.current=false;setPending(false);}}
 const input="mt-1 w-full rounded-control border border-line bg-white p-2";
 return <form method="post" onSubmit={submit} className="mt-4 grid gap-4"><label>구분<select name="kind" className={input}><option value="resource">교육자료</option><option value="outcome">성과 이미지</option></select></label><label>제목<input name="title" required maxLength={200} className={input}/></label><label>설명<textarea name="description" required maxLength={1000} className={input}/></label><label>파일<input type="file" name="file" required accept="application/pdf,image/png,image/jpeg,image/webp" className={input}/></label><p className="text-sm text-muted">최대 2MiB. PDF·PNG·JPEG·WebP만 허용하며 성과 이미지는 이미지 파일만 사용할 수 있습니다. 업로드 후 기본 비공개입니다.</p>
 {status==="saved"&&<p role="status" className="text-teal-ink">파일을 비공개로 등록했습니다.</p>}{status==="invalid"&&<p role="alert" className="text-red-700">파일 형식·크기와 입력을 확인해 주세요.</p>}{status==="denied"&&<p role="alert" className="text-red-700">파일 관리 기능을 사용할 수 없습니다.</p>}{status==="unknown"&&<p role="alert" className="text-red-700">업로드 결과를 확인하지 못했습니다. 중복 등록하지 말고 관리자에게 확인해 주세요.</p>}
 <button disabled={pending||status==="unknown"} className="min-h-11 rounded-control bg-brand-navy px-4 py-2 font-bold text-white disabled:opacity-50">{pending?"업로드 중...":"파일 등록"}</button></form>;
}
