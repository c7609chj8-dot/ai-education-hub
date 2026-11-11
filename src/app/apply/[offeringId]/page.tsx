import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { sampleOfferings } from "@/data/mock/courses";
import { formatDate } from "@/lib/dates";
import { canDemoApply } from "@/lib/offerings";

export const dynamicParams = false;

type PageProps = { params: Promise<{ offeringId: string }> };

export function generateStaticParams() {
  return sampleOfferings.map(({ id: offeringId }) => ({ offeringId }));
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
  const canPreviewApplication = canDemoApply(offering);

  return (
    <>
      <section className="page-intro bg-surface">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-8 sm:py-16">
          <Link href="/schedule" className="inline-flex min-h-11 items-center rounded-control font-semibold text-brand-blue underline underline-offset-4">
            <span aria-hidden="true" className="me-2">←</span> 교육일정
          </Link>
          <p className="mt-5 text-sm font-semibold text-teal-ink">수강신청 시연</p>
          <h1 className="mt-3 text-4xl font-bold leading-tight tracking-tight text-brand-navy sm:text-5xl">신청 과정을 살펴보세요</h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">예시 기수의 안내와 신청 흐름을 확인할 수 있습니다.</p>
          <p className="mt-3 font-semibold text-teal-ink">시연용 화면 · 개인정보 입력·전송·저장 및 실제 접수는 모두 비활성화되어 있습니다.</p>
        </div>
      </section>
      <section aria-label="수강신청 시연" className="bg-canvas">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-8 sm:py-16">
          <div className="rounded-card border border-line bg-surface p-6 sm:p-8">
            <p className="text-sm font-semibold text-teal-ink">예시 기수 · {offering.status}</p>
            <h2 className="mt-3 text-2xl font-bold text-brand-navy">{offering.course.title}</h2>
            <dl className="mt-6 grid gap-4 border-y border-line py-5 text-sm sm:grid-cols-3">
              <div><dt className="font-semibold text-muted">교육 기간 예시</dt><dd className="mt-1 text-ink">{formatDate(offering.startDate)} ~ {formatDate(offering.endDate)}</dd></div>
              <div><dt className="font-semibold text-muted">장소 예시</dt><dd className="mt-1 text-ink">{offering.location}</dd></div>
              <div><dt className="font-semibold text-muted">정원 예시</dt><dd className="mt-1 text-ink">{offering.enrolledCount} / {offering.capacity}명</dd></div>
            </dl>

            <div className="mt-8 rounded-control border border-line bg-canvas p-5">
              <h3 className="text-lg font-bold text-brand-navy">신청 흐름 미리보기</h3>
              <ol className="mt-4 space-y-3 text-sm leading-relaxed text-ink">
                <li><span className="font-semibold text-brand-blue">1.</span> 교육과정과 모집 안내를 확인합니다.</li>
                <li><span className="font-semibold text-brand-blue">2.</span> 실제 운영 전에는 개인정보 수집·이용 안내와 접수 기준을 별도로 고지합니다.</li>
                <li><span className="font-semibold text-brand-blue">3.</span> 운영 승인 후에만 본인 확인, 중복·정원 검증, 접수 결과 안내를 진행합니다.</li>
              </ol>
            </div>

            {canPreviewApplication ? (
              <div className="mt-6 rounded-control border border-teal-ink/20 bg-teal-soft p-5">
                <h3 className="font-bold text-brand-navy">입력 단계는 아직 열려 있지 않습니다</h3>
                <p className="mt-2 leading-relaxed text-muted">화면은 예시 일정에서 연결된 시연입니다. 이름·연락처 등 개인정보를 입력하거나 전송할 수 없고, 접수 완료로 처리되지 않습니다.</p>
              </div>
            ) : (
              <div className="mt-6 rounded-control border border-line bg-canvas p-5 text-muted">
                이 예시 기수는 현재 {offering.status} 상태라 신청 시연 단계도 제공하지 않습니다.
              </div>
            )}

            <div className="mt-7 flex flex-wrap gap-3">
              <Link href={`/programs/${offering.course.slug}`} className="ui-button ui-button--secondary">과정 안내 보기</Link>
              <Link href="/schedule" className="ui-button ui-button--primary">예시 일정 보기</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
