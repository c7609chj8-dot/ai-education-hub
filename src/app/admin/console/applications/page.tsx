import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminAccess } from "@/lib/admin/access";
import { searchAdminApplications } from "@/lib/admin/applications";
import { ApplicationsList } from "./applications-list";

export const metadata = { title: "신청 관리", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function ApplicationsPage() {
  const access = await getAdminAccess();
  if (access === "unauthenticated") redirect("/admin/login");
  if (access !== "allowed") redirect("/admin/session?access=denied");
  const form = new FormData(); form.set("search", ""); form.set("before_at", ""); form.set("before_id", "");
  const result = await searchAdminApplications(form);
  return <div className="content-frame"><section className="w-full rounded-card border border-line bg-surface p-6 shadow-sm sm:p-8">
    <Link className="text-brand-blue underline" href="/admin/console">관리자 화면</Link>
    <h1 className="mt-4 text-3xl font-bold text-brand-navy">신청 관리</h1>
    {!result.ok ? <p className="mt-4">신청 관리 기능을 사용할 수 없습니다. 설정을 확인해 주세요.</p> : <ApplicationsList initialPage={result.value} />}
  </section></div>;
}
