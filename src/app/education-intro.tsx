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
        <p className="font-semibold text-brand-navy">6개 학과의 교육과정은 모두 검토용 12주차 초안입니다.</p>
        <p className="mt-1 text-muted">교육시간·운영 방식·모집 일정은 확정하지 않았으며, 실제 접수 기능도 아직 제공하지 않습니다.</p>
      </div>
    </div>
  );
}
