import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminAccess } from "@/lib/admin/access";
import { loadAdminCatalog } from "@/lib/admin/management";
import { CourseForm } from "./course-form";

export const metadata = { title: "강좌 관리", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function CoursesPage() {
  const access = await getAdminAccess();
  if (access === "unauthenticated") redirect("/admin/login");
  if (access !== "allowed") redirect("/admin/session?access=denied");
  const catalog = await loadAdminCatalog();
  return <div className="content-frame"><section className="w-full rounded-card border border-line bg-surface p-6 shadow-sm sm:p-8">
    <Link className="text-brand-blue underline" href="/admin/console">관리자 화면</Link><h1 className="mt-4 text-3xl font-bold text-brand-navy">강좌 관리</h1>
    {!catalog ? <p className="mt-4">관리 기능을 사용할 수 없습니다. 설정을 확인해 주세요.</p> : <>
      <h2 className="mt-8 text-xl font-bold">새 강좌</h2><CourseForm />
      <h2 className="mt-10 text-xl font-bold">등록된 강좌</h2>
      {catalog.courses.length === 0 && <p className="mt-3 text-muted">등록된 강좌가 없습니다.</p>}
      {catalog.courses.map((course) => <details key={course.id} className="mt-3 rounded border border-line p-4"><summary className="cursor-pointer font-bold">{course.title} · {course.publicationState === "published" ? "공개" : course.publicationState === "draft" ? "작성 중" : "보관"}</summary><CourseForm course={course} /></details>)}
    </>}
  </section></div>;
}
