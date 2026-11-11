import Link from "next/link";
import { sections } from "@/config/navigation";
import { InquiryForm } from "./inquiry-form";

export const metadata = { title: sections.contact.label };

export default function ContactPage() {
  return (
    <>
      <section className="page-intro bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-8 sm:py-16">
          <p className="text-sm font-bold tracking-wide text-teal-ink">문의</p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-brand-navy sm:text-5xl">궁금한 점을 살펴보세요</h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">문의 화면의 입력 과정을 미리 체험할 수 있습니다.</p>
          <p className="mt-3 text-sm font-semibold text-teal-ink">시연용 화면입니다. 실제 문의는 접수되지 않습니다.</p>
        </div>
      </section>
      <section className="bg-canvas">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-8 sm:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-12">
          <div><h2 className="text-2xl font-bold text-brand-navy">문의 전에 확인해 주세요</h2><p className="mt-4 leading-relaxed text-muted">이 화면은 입력 연습을 위한 시연입니다. 이름과 이메일, 문의 내용에는 실제 개인정보 대신 가상의 정보를 입력해 주세요.</p><p className="mt-4 leading-relaxed text-muted">실제 연락처와 문의 방법은 운영 준비가 끝나면 안내합니다.</p><div className="mt-6 flex flex-wrap gap-3"><Link className="ui-button ui-button--secondary" href="/faq">자주 묻는 질문</Link><Link className="ui-button ui-button--secondary" href="/partnership">교육협력 안내</Link></div></div>
          <InquiryForm />
        </div>
      </section>
    </>
  );
}
