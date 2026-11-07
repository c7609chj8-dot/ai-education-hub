"use client";

import { Button } from "@/components/ui/button";

export default function ScheduleError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="content-frame"><section role="alert" className="w-full rounded-card border border-line bg-surface p-6 sm:p-8">
    <h1 className="text-2xl font-bold text-brand-navy">교육일정을 불러올 수 없습니다</h1>
    <p className="mt-3 text-muted">잠시 후 다시 시도해 주세요.</p>
    <Button onClick={reset} className="mt-5">다시 시도</Button>
  </section></div>;
}
