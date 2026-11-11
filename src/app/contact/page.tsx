import Link from "next/link";
import { sections } from "@/config/navigation";

export const metadata = { title: sections.contact.label };

export default function ContactPage() {
  return (
    <>
      <section className="page-intro bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-8 sm:py-16">
          <p className="text-sm font-bold tracking-wide text-teal-ink">문의</p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-brand-navy sm:text-5xl">문의 채널 준비 중</h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
            공개 사전 안내 단계에서는 이름·연락처·문의 내용을 입력받거나 전송하지 않습니다.
          </p>
        </div>
      </section>
      <section className="bg-canvas">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-8 sm:py-16 lg:grid-cols-2 lg:gap-12">
          <div className="rounded-card border border-line bg-surface p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-brand-navy">확정 후 안내할 내용</h2>
            <ul className="mt-5 list-disc space-y-2 ps-5 text-ink">
              <li>공식 문의 방법과 운영 연락처</li>
              <li>교육협력·기관 맞춤 교육 절차</li>
              <li>개인정보 수집·이용 및 보관 안내</li>
            </ul>
          </div>
          <div className="rounded-card border border-line bg-surface p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-brand-navy">먼저 확인해 보세요</h2>
            <p className="mt-4 leading-relaxed text-muted">현재 공개된 교육과정 초안과 자주 묻는 질문에서 운영 준비 현황을 확인할 수 있습니다.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link className="ui-button ui-button--primary" href="/faq">자주 묻는 질문</Link>
              <Link className="ui-button ui-button--secondary" href="/partnership">교육협력 안내</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
