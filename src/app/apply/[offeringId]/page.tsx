import Link from "next/link";

export const metadata = { title: "수강신청 준비 중" };

export default function ApplicationPage() {
  return (
    <>
      <section className="page-intro bg-surface">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-8 sm:py-16">
          <p className="text-sm font-semibold text-teal-ink">수강신청</p>
          <h1 className="mt-3 text-4xl font-bold leading-tight tracking-tight text-brand-navy sm:text-5xl">수강신청 준비 중</h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
            실제 교육기수와 모집 정보가 확정되기 전에는 신청을 받지 않습니다.
          </p>
        </div>
      </section>
      <section aria-label="수강신청 준비 안내" className="bg-canvas">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-8 sm:py-16">
          <div className="rounded-card border border-line bg-surface p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-brand-navy">현재 개인정보를 입력하거나 전송할 수 없습니다.</h2>
            <p className="mt-4 leading-relaxed text-muted">
              이 공개 사전 안내에서는 실제 신청 저장, 대기자 등록, 연락처 수집을 제공하지 않습니다. 모집 기준과 개인정보 처리 안내가 확정되면 별도로 공지합니다.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/schedule" className="ui-button ui-button--primary">교육일정 안내 보기</Link>
              <Link href="/programs" className="ui-button ui-button--secondary">교육과정 초안 보기</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
