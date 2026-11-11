import Link from "next/link";
import {redirect} from "next/navigation";
import {getAdminAccess} from "@/lib/admin/access";
import {getAdminBrand} from "@/lib/brand/admin";
import {siteConfig} from "@/config/site";
import {BrandForm} from "./brand-form";
export const metadata={title:"브랜드·운영 정보 관리",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
export default async function BrandPage(){const access=await getAdminAccess();if(access==="unauthenticated")redirect("/admin/login");if(access!=="allowed")redirect("/admin/session?access=denied");const result=await getAdminBrand();return <div className="content-frame"><section className="w-full rounded-card border border-line bg-surface p-6 shadow-sm sm:p-8"><Link href="/admin/console" className="text-brand-blue underline">관리자 화면</Link><h1 className="mt-4 text-3xl font-bold text-brand-navy">브랜드·운영 정보 관리</h1>{!result.ok?<p className="mt-4">브랜드 관리 기능을 사용할 수 없습니다. 설정을 확인해 주세요.</p>:<BrandForm brand={result.value} defaultName={siteConfig.name} defaultSlogan={siteConfig.slogan}/>}</section></div>;}
