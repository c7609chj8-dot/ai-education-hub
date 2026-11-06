import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { sampleOfferings } from "@/data/mock/courses";
import { canDemoApply } from "@/lib/offerings";
import { ApplicationForm } from "./application-form";

// 기수 확인을 완료한 뒤 화면을 표시해 잘못된 주소의 404를 유지합니다.
export const instant = false;

type PageProps = { params: Promise<{ offeringId: string }> };

export function generateStaticParams() {
  return sampleOfferings.map((offering) => ({ offeringId: offering.id }));
}

async function getOffering(params: PageProps["params"]) {
  const { offeringId } = await params;
  const offering = sampleOfferings.find((item) => item.id === offeringId);
  if (!offering) notFound();
  return offering;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const offering = await getOffering(params);
  return { title: `${offering.course.title} 신청 시연` };
}

export default async function ApplicationPage({ params }: PageProps) {
  const offering = await getOffering(params);
  const choices = sampleOfferings.filter(canDemoApply).map((item) => ({
    id: item.id,
    title: item.course.title,
    startDate: item.startDate,
    status: item.status,
  }));

  return (
    <>
      <section className="bg-surface">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-8 sm:py-16">
          <Link href="/schedule" className="inline-flex min-h-11 items-center rounded-control font-semibold text-brand-blue underline underline-offset-4">
            <span aria-hidden="true" className="me-2">←</span> 교육일정
          </Link>
          <p className="mt-5 text-sm font-semibold text-teal-ink">수강신청 시연</p>
          <h1 className="mt-3 text-4xl font-bold leading-tight tracking-tight text-brand-navy sm:text-5xl">신청 과정을 살펴보세요</h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">가상의 기수를 선택하고 입력 검사를 체험할 수 있습니다.</p>
          <p className="mt-3 font-semibold text-teal-ink">시연용 · 입력 내용은 실제로 접수하거나 저장하지 않습니다.</p>
        </div>
      </section>
      <section aria-label="신청 시연" className="bg-canvas">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-8 sm:py-16">
          {canDemoApply(offering) ? (
            <ApplicationForm initialOfferingId={offering.id} choices={choices} />
          ) : (
            <div className="rounded-card border border-line bg-surface p-6 sm:p-8">
              <h2 className="text-xl font-bold text-brand-navy">{offering.course.title}</h2>
              <p className="mt-3 leading-relaxed text-muted">이 예시 기수는 {offering.status} 상태라 신청 시연을 시작할 수 없습니다.</p>
              <Link href="/schedule" className="ui-button ui-button--secondary mt-5">다른 예시 일정 보기</Link>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
