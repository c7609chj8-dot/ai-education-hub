import Link from "next/link";
import {redirect} from "next/navigation";
import {getAdminAccess} from "@/lib/admin/access";
import {ActivityList} from "./activity-list";
export const metadata={title:"관리자 작업 이력",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
export default async function ActivityPage(){const access=await getAdminAccess();if(access==="unauthenticated")redirect("/admin/login");if(access!=="allowed")redirect("/admin/session?access=denied");return <div className="content-frame"><section className="w-full rounded-card border border-line bg-surface p-6 shadow-sm sm:p-8"><Link href="/admin/console" className="text-brand-blue underline">관리자 화면</Link><h1 className="mt-4 text-3xl font-bold text-brand-navy">관리자 작업 이력</h1><p className="mt-4 text-sm text-muted">기록된 신청 상태, 문의 상세·상태, 콘텐츠·자료·브랜드 변경만 표시합니다. 강좌·기수 변경과 신청·문의 목록 조회는 포함되지 않습니다. 담당자와 대상 ID도 보호 대상 정보이므로 필요한 경우에만 확인하세요.</p><ActivityList/></section></div>;}
