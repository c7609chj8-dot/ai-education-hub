import Link from "next/link";
import { sections } from "@/config/navigation";
import { siteConfig } from "@/config/site";

export function SiteFooter() {
  const { email, phone, address } = siteConfig.contact;
  return (
    <footer className="border-t border-line bg-surface text-sm text-muted">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:px-8 lg:grid-cols-2">
        <div>
          <p className="text-xl font-bold text-brand-navy">{siteConfig.name}</p>
          <p className="mt-2 leading-relaxed">{siteConfig.slogan}</p>
          <p className="mt-2 text-xs font-semibold">학과 소개와 교육과정은 검토용 초안이며, 실제 모집·접수 정보가 아닙니다.</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {email && <span className="min-w-0 break-all">{email}</span>}
            {phone && <span>{phone}</span>}
            {!email && !phone && <span>연락처 추후 확정</span>}
            {address && <span className="min-w-0 break-words">{address}</span>}
            {siteConfig.socialUrl ? <a href={siteConfig.socialUrl}>공식 SNS</a> : <span>공식 SNS 추후 확정</span>}
          </div>
        </div>
        <div className="flex flex-wrap items-start gap-x-5 gap-y-1 lg:justify-end">
          <nav aria-label="기관 안내" className="flex gap-5">
            {[sections.about, sections.contact].map((section) => (
              <Link key={section.href} className="footer-link" href={section.href}>{section.label}</Link>
            ))}
          </nav>
          <details className="privacy-note">
            <summary className="footer-link cursor-pointer">개인정보처리 안내 (준비 중)</summary>
            <p className="max-w-72 pb-2 leading-relaxed">
              현재 공개 화면에서는 신청·문의 내용을 입력받거나 전송·저장하지 않습니다.
              실제 접수에 적용할 안내는 서비스 개시 전에 게시합니다.
            </p>
          </details>
        </div>
      </div>
    </footer>
  );
}
