"use client";
import {useId,useRef,useState,type FormEvent} from "react";
import type {ManagedBrand} from "@/lib/brand/types";
import {saveBrandAction,type BrandState} from "./actions";
const input="mt-1 w-full rounded-control border border-line bg-white p-2 text-ink";
export function BrandForm({brand,defaultName,defaultSlogan}:{brand:ManagedBrand|null;defaultName:string;defaultSlogan:string}){
 const id=useId(),running=useRef(false);const [revision,setRevision]=useState(brand?.revision??0),[pending,setPending]=useState(false),[state,setState]=useState<BrandState|null>(null);
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();if(running.current||state?.unknown)return;running.current=true;setPending(true);setState(null);try{const result=await saveBrandAction(new FormData(e.currentTarget));setState(result);if(result.revision!==undefined)setRevision(result.revision);}catch{setState({error:"저장 결과를 확인하지 못했습니다. 입력을 보관하고 새로고침해 확인해 주세요.",unknown:true});}finally{running.current=false;setPending(false);}}
 return <form onSubmit={submit} className="mt-6 grid gap-4">
 <input type="hidden" name="revision" value={revision}/>
 <label htmlFor={`${id}-name`}>브랜드명<input className={input} id={`${id}-name`} name="name" maxLength={80} defaultValue={brand?.name??defaultName} required/></label>
 <label htmlFor={`${id}-slogan`}>대표 문구<input className={input} id={`${id}-slogan`} name="slogan" maxLength={160} defaultValue={brand?.slogan??defaultSlogan} required/></label>
 <label htmlFor={`${id}-email`}>이메일 (선택)<input className={input} id={`${id}-email`} name="email" type="email" maxLength={254} defaultValue={brand?.email??""}/></label>
 <label htmlFor={`${id}-phone`}>전화번호 (선택)<input className={input} id={`${id}-phone`} name="phone" type="tel" maxLength={30} defaultValue={brand?.phone??""}/></label>
 <label htmlFor={`${id}-address`}>주소 (선택)<input className={input} id={`${id}-address`} name="address" maxLength={200} defaultValue={brand?.address??""}/></label>
 <label className="flex items-center gap-2"><input type="checkbox" name="is_public" defaultChecked={brand?.isPublic??false}/> 위 정보를 공개 화면에 표시합니다</label>
 <p className="text-sm text-muted">공개 상태에서 저장하면 입력한 내용이 바로 공개됩니다. 개발 환경에서는 실제 연락처 대신 가상 정보만 사용하세요.</p>
 {state?.error&&<p role="alert" className="text-red-700">{state.error}</p>}{state?.revision!==undefined&&<p role="status" className="text-teal-ink">브랜드 설정을 저장했습니다.</p>}
 <button disabled={pending||state?.unknown} className="min-h-11 rounded-control bg-brand-navy px-4 py-2 font-bold text-white disabled:opacity-50">{pending?"저장 중...":"설정 저장"}</button>
 </form>;
}
