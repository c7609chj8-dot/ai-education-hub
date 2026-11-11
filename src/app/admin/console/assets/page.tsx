import Link from "next/link";
import {redirect} from "next/navigation";
import {getAdminAccess} from "@/lib/admin/access";
import {listAdminAssets} from "@/lib/assets/server";
import {AssetForm} from "./asset-form";
import {UploadForm} from "./upload-form";
export const metadata={title:"자료 관리",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
export default async function AssetsPage({searchParams}:{searchParams:Promise<{at?:string;id?:string}>}){
 const access=await getAdminAccess();if(access==="unauthenticated")redirect("/admin/login");if(access!=="allowed")redirect("/admin/session?access=denied");const query=await searchParams,form=new FormData();form.set("before_at",query.at??"");form.set("before_id",query.id??"");const result=await listAdminAssets(form);
 return <div className="content-frame"><section className="w-full rounded-card border border-line bg-surface p-6 shadow-sm sm:p-8"><Link href="/admin/console" className="text-brand-blue underline">관리자 화면</Link><h1 className="mt-4 text-3xl font-bold text-brand-navy">자료·성과 관리</h1>{!result.ok?<p className="mt-4">자료 관리 기능을 사용할 수 없습니다. 설정을 확인해 주세요.</p>:<><h2 className="mt-8 text-xl font-bold">새 파일</h2><UploadForm/><h2 className="mt-10 text-xl font-bold">등록된 파일</h2>{result.value.items.length===0&&<p className="mt-3 text-muted">등록된 파일이 없습니다.</p>}{result.value.items.map((asset)=><details key={asset.id} className="mt-3 rounded border border-line p-4"><summary className="cursor-pointer font-bold">{asset.title} · {asset.isPublic?"공개":"비공개"}</summary><AssetForm asset={asset}/></details>)}{result.value.next&&<Link href={{pathname:"/admin/console/assets",query:{at:result.value.next.at,id:result.value.next.id}}} className="mt-5 inline-flex min-h-11 items-center text-brand-blue underline">다음 자료 보기</Link>}</>}</section></div>;
}
