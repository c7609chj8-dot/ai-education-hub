import Link from "next/link";
import { redirect } from "next/navigation";
import { getVerifiedUser } from "@/lib/supabase/verified-user";
import { LogoutForm } from "./logout-form";

export const metadata = { title: "로그인 상태", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminSessionPage({ searchParams }: { searchParams: Promise<{ access?: string }> }) {
  const user = await getVerifiedUser();
  if (!user) redirect("/admin/login");
  const { access } = await searchParams;

  return <div className="content-frame"><section className="w-full rounded-card border border-line bg-surface p-6 shadow-sm sm:p-8">
    <p className="text-sm font-bold text-teal-ink">AI융합대학</p>
    <h1 className="mt-2 text-3xl font-bold text-brand-navy">로그인 상태</h1>
    <p className="mt-4 text-muted">로그인 계정: <span className="font-semibold text-ink">{user.email || "로그인 계정"}</span></p>
    {access === "denied" && <p role="status" className="mt-3 text-sm font-semibold text-red-700">관리자 권한이 없습니다.</p>}
    <p className="mt-3 text-muted">운영 기능은 준비 중입니다.</p>
    <Link href="/admin/console" prefetch={false} className="mt-5 inline-flex min-h-11 items-center font-semibold text-brand-blue underline underline-offset-4">관리자 화면</Link>
    <LogoutForm />
  </section></div>;
}
