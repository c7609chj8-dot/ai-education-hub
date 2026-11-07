import Link from "next/link";
import { getSupabaseAuthConfig } from "@/lib/supabase/config";
import { LoginForm } from "./login-form";

export const metadata = { title: "관리자 로그인", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ signedOut?: string }> }) {
  const { signedOut } = await searchParams;
  return (
    <div className="content-frame"><section className="w-full rounded-card border border-line bg-surface p-6 shadow-sm sm:p-8">
      <p className="text-sm font-bold text-teal-ink">에이담 AI아카데미</p>
      <h1 className="mt-2 text-3xl font-bold text-brand-navy">관리자 로그인</h1>
      <p className="mt-3 text-muted">발급받은 계정으로 로그인해 주세요.</p>
      {signedOut === "1" && <p role="status" className="mt-4 text-teal-ink">로그아웃되었습니다.</p>}
      <LoginForm available={Boolean(getSupabaseAuthConfig())} />
      <Link href="/" className="mt-6 inline-block font-semibold text-brand-blue underline underline-offset-4">홈으로 돌아가기</Link>
    </section></div>
  );
}
