import Link from "next/link";
import type { ReactNode } from "react";

type AdminSection = "dashboard" | "programs";

export function DemoShell({ active, children }: { active: AdminSection; children: ReactNode }) {
  const links = [{ href: "/admin/demo", label: "대시보드", id: "dashboard" }, { href: "/admin/demo/programs", label: "강좌 목록", id: "programs" }] as const;
  return (
    <div className="w-full bg-canvas">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-12">
        <div className="rounded-card border border-teal-ink/20 bg-teal-soft px-5 py-4 text-sm leading-relaxed text-teal-ink">
          <span className="font-bold">관리자 시연 · 실제 운영 화면 아님</span><span className="block sm:inline"> · 모든 현황은 예시이며 실제 접수하거나 저장하지 않습니다.</span>
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-8">
          <aside className="h-fit rounded-card border border-line bg-surface p-4">
            <p className="px-2 text-xs font-bold tracking-wide text-teal-ink">에이담 AI아카데미</p>
            <p className="mt-1 px-2 text-lg font-bold text-brand-navy">관리자 시연</p>
            <nav aria-label="관리자 시연 메뉴" className="mt-4">
              <ul className="flex flex-wrap gap-2 lg:flex-col">
                {links.map((link) => <li key={link.id}><Link href={link.href} aria-current={active === link.id ? "page" : undefined} className={`flex min-h-11 items-center rounded-control px-3 font-semibold ${active === link.id ? "bg-brand-navy text-white" : "text-brand-navy hover:bg-canvas"}`}>{link.label}</Link></li>)}
              </ul>
            </nav>
            <p className="mt-5 border-t border-line px-2 pt-4 text-sm leading-relaxed text-muted">일정·신청자 관리와 설정은 이후 시연에서 준비합니다.</p>
            <Link href="/" className="mt-3 inline-flex min-h-11 items-center px-2 text-sm font-semibold text-brand-blue underline underline-offset-4">홈페이지로 돌아가기</Link>
          </aside>
          <div className="min-w-0">{children}</div>
        </div>
      </div>
    </div>
  );
}
