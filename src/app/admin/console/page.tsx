import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminAccess } from "@/lib/admin/access";

export const metadata = { title: "관리자", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminConsolePage() {
  const access = await getAdminAccess();
  if (access === "unauthenticated") redirect("/admin/login");
  if (access !== "allowed") redirect("/admin/session?access=denied");

  return <div className="content-frame"><section className="w-full rounded-card border border-line bg-surface p-6 shadow-sm sm:p-8">
    <p className="text-sm font-bold text-teal-ink">에이담 AI아카데미</p>
    <h1 className="mt-2 text-3xl font-bold text-brand-navy">관리자 화면</h1>
    <p className="mt-4 text-muted">관리자 권한을 확인했습니다. 운영 기능은 준비 중입니다.</p>
    <Link href="/admin/session" className="mt-6 inline-flex min-h-11 items-center font-semibold text-brand-blue underline underline-offset-4">로그인 상태로 돌아가기</Link>
  </section></div>;
}
