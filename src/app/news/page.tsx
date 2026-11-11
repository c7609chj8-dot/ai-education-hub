import { sections } from "@/config/navigation";
import { sampleNews } from "@/data/mock/information";
import { formatDate } from "@/lib/dates";

export const metadata = { title: sections.news.label };

export default function NewsPage() {
  return (
    <>
      <section className="page-intro bg-surface">
        <div className="mx-auto max-w-4xl px-4 py-14 sm:px-8 sm:py-16">
          <p className="text-sm font-bold tracking-wide text-teal-ink">교육정보</p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-brand-navy sm:text-5xl">공지사항</h1>
          <p className="mt-5 text-lg leading-relaxed text-muted">교육과 운영에 관한 소식을 확인하세요.</p>
          <p className="mt-3 text-sm font-semibold text-teal-ink">시연용 공지 예시입니다. 내용과 날짜는 샘플입니다.</p>
        </div>
      </section>
      <section aria-label="공지 예시 목록" className="bg-canvas">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-8 sm:py-16">
          <ul className="space-y-3">
            {sampleNews.map((item) => (
              <li key={item.id}>
                <details className="information-item">
                  <summary>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-teal-ink">공지 예시 · {item.category}</span>
                      <span className="mt-2 block text-lg font-bold text-brand-navy">{item.title}</span>
                      <span className="mt-2 block text-sm text-muted">날짜 예시 · {formatDate(item.date)}</span>
                    </span>
                    <span className="information-indicator" aria-hidden="true">+</span>
                  </summary>
                  <div className="information-body"><p>{item.body}</p></div>
                </details>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
