"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { signIn } from "../auth-actions";

export function LoginForm({ available }: { available: boolean }) {
  const [state, action, pending] = useActionState(signIn, null);
  return (
    <form action={action} className="mt-6 space-y-5">
      <div><label htmlFor="email" className="block font-semibold">이메일</label><input id="email" name="email" type="email" autoComplete="username" required maxLength={254} className="mt-2 min-h-11 w-full rounded-control border border-line bg-surface px-3" /></div>
      <div><label htmlFor="password" className="block font-semibold">비밀번호</label><input id="password" name="password" type="password" autoComplete="current-password" required maxLength={1024} className="mt-2 min-h-11 w-full rounded-control border border-line bg-surface px-3" /></div>
      {state?.error && <p role="alert" className="text-sm font-medium text-red-700">{state.error}</p>}
      {!available && <p role="status" className="text-sm text-muted">현재 로그인 서비스를 이용할 수 없습니다. 관리자에게 문의해 주세요.</p>}
      <Button type="submit" disabled={!available || pending} className="w-full">{pending ? "로그인 중..." : "로그인"}</Button>
    </form>
  );
}
