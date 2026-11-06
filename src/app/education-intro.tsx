"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";

type EducationIntroProps = {
  slogan: string;
  description: string;
};

export function EducationIntro({ slogan, description }: EducationIntroProps) {
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
        <p className="font-semibold text-brand-navy">{slogan}</p>
        <p className="mt-1 text-muted">{description}</p>
      </div>
    </div>
  );
}
