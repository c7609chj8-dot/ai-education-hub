"use client";
import {useRef,useState,type FormEvent} from "react";
import type {ManagedAsset} from "@/lib/assets/types";
import {updateAssetAction,type AssetState} from "./actions";
export function AssetForm({asset}:{asset:ManagedAsset}){
 const running=useRef(false),[pending,setPending]=useState(false),[state,setState]=useState<AssetState>(null);
 async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();if(running.current||state?.unknown)return;running.current=true;setPending(true);setState(null);try{setState(await updateAssetAction(new FormData(event.currentTarget)));}catch{setState({error:"저장 결과를 확인하지 못했습니다. 목록을 새로고침해 확인해 주세요.",unknown:true});}finally{running.current=false;setPending(false);}}
 const input="mt-1 w-full rounded-control border border-line bg-white p-2";
 return <form method="post" onSubmit={submit} className="mt-4 grid gap-4"><input type="hidden" name="id" value={asset.id}/><input type="hidden" name="revision" value={asset.revision}/><p className="text-sm text-muted">{asset.kind==="resource"?"교육자료":"성과 이미지"} · {asset.mime} · {asset.byteSize} bytes</p><label>제목<input name="title" defaultValue={asset.title} required maxLength={200} className={input}/></label><label>설명<textarea name="description" defaultValue={asset.description} required maxLength={1000} className={input}/></label><label className="flex gap-2"><input type="checkbox" name="is_public" defaultChecked={asset.isPublic}/> 공개합니다</label>{state?.error&&<p role="alert" className="text-red-700">{state.error}</p>}{state?.success&&<p role="status" className="text-teal-ink">{state.success}</p>}<button disabled={pending||state?.unknown} className="min-h-11 rounded-control bg-brand-navy px-4 py-2 font-bold text-white disabled:opacity-50">{pending?"저장 중...":"자료 정보 저장"}</button></form>;
}
