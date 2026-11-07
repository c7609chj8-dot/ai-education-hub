"use server";

import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase/server";

export type AuthActionState = { error: string } | null;

export async function signIn(_state: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const email = formData.get("email");
  const password = formData.get("password");
  if (typeof email !== "string" || typeof password !== "string" || !email.trim() || email.length > 254 || !password || password.length > 1024) {
    return { error: "이메일과 비밀번호를 확인해 주세요." };
  }
  const supabase = await createAuthClient(true);
  if (!supabase) return { error: "현재 로그인 서비스를 이용할 수 없습니다. 관리자에게 문의해 주세요." };

  try {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) return { error: "로그인할 수 없습니다. 입력 정보를 확인해 주세요." };
  } catch {
    return { error: "로그인 서비스를 이용할 수 없습니다. 잠시 후 다시 시도해 주세요." };
  }
  redirect("/admin/session");
}

export async function signOut(): Promise<AuthActionState> {
  const supabase = await createAuthClient(true);
  if (!supabase) return { error: "현재 로그아웃할 수 없습니다. 잠시 후 다시 시도해 주세요." };
  try {
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) return { error: "로그아웃할 수 없습니다. 잠시 후 다시 시도해 주세요." };
  } catch {
    return { error: "로그아웃할 수 없습니다. 잠시 후 다시 시도해 주세요." };
  }
  redirect("/admin/login?signedOut=1");
}
