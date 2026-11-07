"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { signOut } from "../auth-actions";

export function LogoutForm() {
  const [state, action, pending] = useActionState(signOut, null);
  return <form action={action} className="mt-6 space-y-3">
    {state?.error && <p role="alert" className="text-sm font-medium text-red-700">{state.error}</p>}
    <Button type="submit" variant="secondary" disabled={pending}>{pending ? "로그아웃 중..." : "로그아웃"}</Button>
  </form>;
}
