import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase/server";
import { LogoutForm } from "./logout-form";

export const metadata = { title: "로그인 상태", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminSessionPage() {
  const supabase = await createAuthClient();
  if (!supabase) redirect("/admin/login");

  let email: string | undefined;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (!error && data.user) email = data.user.email || "로그인 계정";
  } catch { /* A failed verification must not grant access. */ }
  if (!email) redirect("/admin/login");

  return <div className="content-frame"><section className="w-full rounded-card border border-line bg-surface p-6 shadow-sm sm:p-8">
    <p className="text-sm font-bold text-teal-ink">에이담 AI아카데미</p>
    <h1 className="mt-2 text-3xl font-bold text-brand-navy">로그인 상태</h1>
    <p className="mt-4 text-muted">로그인 계정: <span className="font-semibold text-ink">{email}</span></p>
    <p className="mt-3 text-muted">운영 기능은 준비 중입니다.</p>
    <LogoutForm />
  </section></div>;
}
