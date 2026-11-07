"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { ScheduleOffering } from "@/lib/schedule-types";
import { formatDate, formatMonth, moveMonth } from "@/lib/dates";

const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

function OfferingList({ offerings, example }: { offerings: ScheduleOffering[]; example: boolean }) {
  return (
    <ul className="space-y-3">
      {offerings.map((offering) => (
        <li key={offering.id} className="rounded-card border border-line bg-surface p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-teal-ink">{example ? "예시 · " : ""}{offering.status}</p>
              <h3 className="mt-2 text-lg font-bold text-brand-navy">{offering.course.title}</h3>
            </div>
            <Link href={`/programs/${offering.course.slug}`} aria-label={`${offering.course.title} 과정 안내 보기`} className="inline-flex min-h-11 items-center rounded-control font-semibold text-brand-blue underline underline-offset-4">
              과정 안내 보기 <span aria-hidden="true" className="ms-2">→</span>
            </Link>
          </div>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
            <div><dt className="font-semibold text-muted">교육 기간{example ? " 예시" : ""}</dt><dd className="mt-1 text-ink">{offering.startDate ? formatDate(offering.startDate) : "시작일 미정"} ~ {offering.endDate ? formatDate(offering.endDate) : "종료일 미정"}</dd></div>
            <div><dt className="font-semibold text-muted">장소{example ? " 예시" : ""}</dt><dd className="mt-1 text-ink">{offering.location || "안내 예정"}</dd></div>
            <div><dt className="font-semibold text-muted">정원{example ? " 예시" : ""}</dt><dd className="mt-1 text-ink">{offering.enrolledCount === null ? `${offering.capacity}명` : `${offering.enrolledCount} / ${offering.capacity}명`}</dd></div>
          </dl>
            {offering.demoApply ? (
              <Link href={`/apply/${offering.id}`} aria-label={`${offering.course.title} 신청 시연`} className="ui-button ui-button--secondary mt-4">
                신청 시연 <span aria-hidden="true">→</span>
              </Link>
            ) : (
              <p className="mt-4 text-sm font-semibold text-muted">{example ? "이 기수는 신청 시연 대상이 아닙니다." : "신청 안내는 준비 중입니다."}</p>
            )}
        </li>
      ))}
    </ul>
  );
}

export function Schedule({
  offerings,
  courseOptions,
  example,
}: {
  offerings: ScheduleOffering[];
  example: boolean;
  courseOptions: { id: string; title: string }[];
}) {
  const courseId = useSearchParams().get("course") || null;
  const selectedCourse = courseOptions.find((course) => course.id === courseId);

  if (courseId && !selectedCourse) {
    return (
      <div className="content-frame">
        <div>
          <p className="font-semibold text-brand-navy">선택한 교육과정을 찾을 수 없습니다.</p>
          <Link href="/schedule" className="mt-3 inline-flex min-h-11 items-center rounded-control font-semibold text-brand-blue underline underline-offset-4">전체 교육일정 보기</Link>
        </div>
      </div>
    );
  }

  const visibleOfferings = selectedCourse
    ? offerings.filter((offering) => offering.course.id === selectedCourse.id)
    : offerings;

  return (
    <ScheduleCalendar
      key={courseId ?? "all"}
      offerings={visibleOfferings}
      courseTitle={selectedCourse?.title}
      example={example}
    />
  );
}

function ScheduleCalendar({ offerings, courseTitle, example }: { offerings: ScheduleOffering[]; courseTitle?: string; example: boolean }) {
  const dated = offerings.filter((offering): offering is ScheduleOffering & { startDate: string } => offering.startDate !== null);
  const undated = offerings.filter((offering) => offering.startDate === null);
  const firstOffering = dated.reduce<(ScheduleOffering & { startDate: string }) | undefined>((earliest, offering) => (
    !earliest || offering.startDate < earliest.startDate ? offering : earliest
  ), undefined);
  const [month, setMonth] = useState(firstOffering?.startDate.slice(0, 7) ?? "");
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [selectedDay, setSelectedDay] = useState<string | null>(firstOffering?.startDate ?? null);

  if (!month) {
    return (
      <div className="content-frame">
        <div>
          {undated.length > 0 ? <><p className="mb-4 font-semibold text-brand-navy">날짜 미정 일정</p><OfferingList offerings={undated} example={example} /></> : <p className="font-semibold text-brand-navy">{courseTitle ? `${courseTitle}의 ${example ? "예시 " : ""}일정이 없습니다.` : `표시할 ${example ? "예시 " : ""}일정이 없습니다.`}</p>}
          {courseTitle && <Link href="/schedule" className="mt-3 inline-flex min-h-11 items-center rounded-control font-semibold text-brand-blue underline underline-offset-4">전체 교육일정 보기</Link>}
        </div>
      </div>
    );
  }

  const [year, monthNumber] = month.split("-").map(Number);
  const firstDay = new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const monthOfferings = dated
    .filter((offering) => offering.startDate.startsWith(month))
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  const selectedOfferings = monthOfferings.filter((offering) => offering.startDate === selectedDay);
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  function changeMonth(offset: number) {
    setMonth(moveMonth(month, offset));
    setSelectedDay(null);
  }

  return (
    <section aria-label={example ? "예시 교육일정" : "교육일정"} className="bg-canvas">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-8 sm:py-16">
        {courseTitle && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-surface px-5 py-3">
            <p className="font-semibold text-brand-navy">선택한 과정 · {courseTitle}</p>
            <Link href="/schedule" className="inline-flex min-h-11 items-center rounded-control font-semibold text-brand-blue underline underline-offset-4">전체 교육일정 보기</Link>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="secondary" aria-label="이전 달" onClick={() => changeMonth(-1)}>←</Button>
            <h2 className="min-w-32 text-center text-xl font-bold text-brand-navy sm:text-2xl" aria-live="polite">{formatMonth(month)}</h2>
            <Button variant="secondary" aria-label="다음 달" onClick={() => changeMonth(1)}>→</Button>
          </div>
          <div role="group" aria-label="일정 보기 방식" className="flex gap-2">
            <Button variant={view === "calendar" ? "primary" : "secondary"} aria-pressed={view === "calendar"} onClick={() => setView("calendar")}>달력 보기</Button>
            <Button variant={view === "list" ? "primary" : "secondary"} aria-pressed={view === "list"} onClick={() => setView("list")}>목록 보기</Button>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted">{example ? "예시 일정이 있는 달부터 표시합니다. 날짜와 모집 상태는 샘플입니다." : "일정이 있는 달부터 표시합니다."}</p>

        {view === "calendar" ? (
          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="rounded-card border border-line bg-surface p-3 sm:p-6">
              <p className="mb-4 text-sm text-muted">점이 있는 날짜를 선택하면 {example ? "예시 " : ""}일정을 볼 수 있습니다.</p>
              <table className="w-full table-fixed border-collapse text-center">
                <caption className="sr-only">{formatMonth(month)} {example ? "예시 " : ""}교육일정</caption>
                <thead><tr>{weekdays.map((day) => <th key={day} scope="col" className="pb-2 text-sm font-semibold text-muted">{day}</th>)}</tr></thead>
                <tbody>
                  {Array.from({ length: totalCells / 7 }, (_, row) => (
                    <tr key={row}>
                      {Array.from({ length: 7 }, (_, col) => {
                        const day = row * 7 + col - firstDay + 1;
                        if (day < 1 || day > daysInMonth) return <td key={col} />;
                        const date = `${month}-${String(day).padStart(2, "0")}`;
                        const count = monthOfferings.filter((offering) => offering.startDate === date).length;
                        return (
                          <td key={col} className="p-0.5">
                            {count ? (
                              <button
                                type="button"
                                aria-label={`${formatDate(date)}, ${example ? "예시 " : ""}일정 ${count}개`}
                                aria-pressed={date === selectedDay}
                                onClick={() => setSelectedDay(date)}
                                className="calendar-day calendar-day--event"
                              >
                                <span aria-hidden="true">{day}</span>
                                <span aria-hidden="true" className="calendar-dot" />
                              </button>
                            ) : (
                              <span className="calendar-day" aria-label={formatDate(date)}>{day}</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <h3 className="mb-4 text-xl font-bold text-brand-navy">
                {selectedDay ? `${formatDate(selectedDay)} ${example ? "예시 " : ""}일정` : `선택한 날짜의 ${example ? "예시 " : ""}일정`}
              </h3>
              {selectedOfferings.length ? (
                <OfferingList offerings={selectedOfferings} example={example} />
              ) : (
                <div className="rounded-card border border-line bg-surface p-6 text-muted">
                  {monthOfferings.length ? "달력에서 일정이 표시된 날짜를 선택해 주세요." : `이번 달에 표시할 ${example ? "예시 " : ""}일정이 없습니다.`}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-6">
            <h3 className="mb-4 text-xl font-bold text-brand-navy">{formatMonth(month)} {example ? "예시 " : ""}일정</h3>
            {monthOfferings.length ? <OfferingList offerings={monthOfferings} example={example} /> : (
              <div className="rounded-card border border-line bg-surface p-6 text-muted">{`이번 달에 표시할 ${example ? "예시 " : ""}일정이 없습니다.`}</div>
            )}
          </div>
        )}
        {undated.length > 0 && <div className="mt-8"><h3 className="mb-4 text-xl font-bold text-brand-navy">날짜 미정 일정</h3><OfferingList offerings={undated} example={example} /></div>}
      </div>
    </section>
  );
}
