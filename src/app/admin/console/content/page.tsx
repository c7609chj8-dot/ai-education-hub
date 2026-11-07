import Link from "next/link";
import {redirect} from "next/navigation";
import {getAdminAccess} from "@/lib/admin/access";
import {listAdminContent} from "@/lib/admin/content";
import {ContentForm} from "./content-form";
export const metadata={title:"콘텐츠 관리",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
export default async function ContentPage({searchParams}:{searchParams:Promise<{kind?:string;order?:string;id?:string}>}){
 const access=await getAdminAccess();if(access==="unauthenticated")redirect("/admin/login");if(access!=="allowed")redirect("/admin/session?access=denied");
 const query=await searchParams,form=new FormData();form.set("kind",query.kind??"");form.set("order",query.order??"");form.set("id",query.id??"");const result=await listAdminContent(form);
 return <div className="content-frame"><section className="w-full rounded-card border border-line bg-surface p-6 shadow-sm sm:p-8"><Link href="/admin/console" className="text-brand-blue underline">관리자 화면</Link><h1 className="mt-4 text-3xl font-bold text-brand-navy">콘텐츠 관리</h1>
 {!result.ok?<p className="mt-4">콘텐츠 관리 기능을 사용할 수 없습니다. 설정을 확인해 주세요.</p>:<><p className="mt-4 text-sm text-muted">공지·FAQ·교육협력 내용을 등록하고 공개 여부를 설정합니다.</p><h2 className="mt-8 text-xl font-bold">새 콘텐츠</h2><ContentForm/><h2 className="mt-10 text-xl font-bold">등록된 콘텐츠</h2>{result.value.items.length===0&&<p className="mt-3 text-muted">등록된 콘텐츠가 없습니다.</p>}{result.value.items.map((item)=><details key={item.id} className="mt-3 rounded border border-line p-4"><summary className="cursor-pointer font-bold">{item.title} · {item.isPublic?"공개":"비공개"}</summary><ContentForm content={item}/></details>)}{result.value.next&&<Link className="mt-5 inline-flex min-h-11 items-center text-brand-blue underline" href={{pathname:"/admin/console/content",query:{kind:result.value.next.kind,order:String(result.value.next.order),id:result.value.next.id}}}>다음 콘텐츠 보기</Link>}</>}
 </section></div>;
}
