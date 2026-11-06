"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";

export function EducationIntro() {
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();

  return (
    <div className="mt-8">
      <div className="flex flex-wrap gap-3">
        <Button
          aria-expanded={expanded}
          aria-controls={panelId}
          onClick={() => setExpanded((open) => !open)}
        >
          {expanded ? "교육 방향 접기" : "교육 방향 보기"}
          <svg aria-hidden="true" viewBox="0 0 16 16" className={expanded ? "size-4 rotate-180" : "size-4"}>
            <path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" />
          </svg>
        </Button>
        <Button variant="secondary" disabled>수강 신청 준비 중</Button>
      </div>
      <div id={panelId} hidden={!expanded} className="mt-6 border-s-4 border-brand-teal ps-4">
        <p className="font-semibold text-brand-navy">초기 과정은 12주 동안 주 2시간으로 준비하고 있습니다.</p>
        <p className="mt-1 text-muted">생활과 업무에 활용할 수 있도록 실습을 중심으로 진행할 예정입니다.</p>
      </div>
    </div>
  );
}
