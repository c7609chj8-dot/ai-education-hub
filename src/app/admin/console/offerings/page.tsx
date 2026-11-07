import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminAccess } from "@/lib/admin/access";
import { loadAdminCatalog } from "@/lib/admin/management";
import { OfferingForm } from "./offering-form";

export const metadata = { title: "기수 관리", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function OfferingsPage() {
  const access = await getAdminAccess();
  if (access === "unauthenticated") redirect("/admin/login");
  if (access !== "allowed") redirect("/admin/session?access=denied");
  const catalog = await loadAdminCatalog();
  return <div className="content-frame"><section className="w-full rounded-card border border-line bg-surface p-6 shadow-sm sm:p-8">
    <Link className="text-brand-blue underline" href="/admin/console">관리자 화면</Link><h1 className="mt-4 text-3xl font-bold text-brand-navy">기수 관리</h1>
    {!catalog ? <p className="mt-4">관리 기능을 사용할 수 없습니다. 설정을 확인해 주세요.</p> : <>
      <h2 className="mt-8 text-xl font-bold">새 기수</h2><OfferingForm courses={catalog.courses} />
      <h2 className="mt-10 text-xl font-bold">등록된 기수</h2>
      {catalog.offerings.length === 0 && <p className="mt-3 text-muted">등록된 기수가 없습니다.</p>}
      {catalog.offerings.map((offering) => <details key={offering.id} className="mt-3 rounded border border-line p-4"><summary className="cursor-pointer font-bold">{catalog.courses.find((course) => course.id === offering.courseId)?.title ?? "알 수 없는 강좌"} · {offering.startDate ?? "일정 미정"} · {offering.isPublic ? "공개" : "비공개"}</summary><OfferingForm courses={catalog.courses} offering={offering} /></details>)}
    </>}
  </section></div>;
}
