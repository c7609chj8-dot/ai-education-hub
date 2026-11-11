import Link from "next/link";
import { sections } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import type { Brand } from "@/lib/brand/types";

export function SiteFooter({brand,status}:{brand:Brand;status:"default"|"example"|"unavailable"}) {
  const { email, phone, address } = brand;
  return (
    <footer className="border-t border-line bg-surface text-sm text-muted">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:px-8 lg:grid-cols-2">
        <div>
          <p className="text-xl font-bold text-brand-navy">
            {brand.name}
          </p>
          <p className="mt-2 leading-relaxed">{brand.slogan}</p>
          {status === "example" && <p className="mt-1 text-xs font-semibold">개발용 시연 정보입니다. 실제 운영 정보가 아닙니다.</p>}
          {status === "unavailable" && <p role="status" className="mt-1 text-xs">운영 정보를 불러오지 못했습니다.</p>}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {email && <span className="min-w-0 break-all">{email}</span>}
            {phone && <span>{phone}</span>}
            {!email && !phone && <span>연락처 추후 확정</span>}
            {address && <span className="min-w-0 break-words">{address}</span>}
            {siteConfig.socialUrl
              ? <a href={siteConfig.socialUrl}>공식 SNS</a>
              : <span>공식 SNS 추후 확정</span>}
          </div>
        </div>
        <div className="flex flex-wrap items-start gap-x-5 gap-y-1 lg:justify-end">
          <nav aria-label="기관 안내" className="flex gap-5">
            {[sections.about, sections.contact].map((section) => (
              <Link key={section.href} className="footer-link" href={section.href}>{section.label}</Link>
            ))}
          </nav>
          <details className="privacy-note">
            <summary className="footer-link cursor-pointer">개인정보처리 안내 (초안)</summary>
            <p className="max-w-72 pb-2 leading-relaxed">
              현재 시연 화면에서는 신청·문의 내용을 전송하거나 저장하지 않습니다.
              실제 접수에 적용할 안내는 서비스 개시 전에 게시합니다.
            </p>
          </details>
        </div>
      </div>
    </footer>
  );
}
