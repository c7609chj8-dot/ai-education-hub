import Link from "next/link";
import { sections } from "@/config/navigation";

export const metadata = { title: sections.schedule.label };

export default function SchedulePage() {
  return (
    <>
      <section className="page-intro bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-8 sm:py-16">
          <p className="text-sm font-bold tracking-wide text-teal-ink">교육일정</p>
          <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight text-brand-navy sm:text-5xl">
            실제 모집 일정은 준비 중입니다
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
            학과별 교육과정 초안은 공개했지만, 실제 교육기수·모집 상태·정원·교육 장소와 일정은 아직 확정하지 않았습니다.
          </p>
          <p className="mt-3 max-w-2xl text-sm font-semibold leading-relaxed text-teal-ink">
            현재 화면에서는 실제 또는 예시 기수 정보를 제공하지 않으며, 수강신청도 접수하지 않습니다.
          </p>
        </div>
      </section>
      <section aria-labelledby="schedule-next-heading" className="bg-canvas">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-8 sm:py-16">
          <div className="max-w-3xl rounded-card border border-line bg-surface p-6 sm:p-8">
            <h2 id="schedule-next-heading" className="text-2xl font-bold text-brand-navy">확정 후 안내할 정보</h2>
            <ul className="mt-5 list-disc space-y-2 ps-5 text-ink">
              <li>교육기수와 모집 기간</li>
              <li>교육시간·장소·정원과 잔여석</li>
              <li>수강신청 방법과 개인정보 수집·이용 안내</li>
            </ul>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/programs" className="ui-button ui-button--primary">교육과정 초안 보기 <span aria-hidden="true">→</span></Link>
              <Link href="/faq" className="ui-button ui-button--secondary">자주 묻는 질문</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
