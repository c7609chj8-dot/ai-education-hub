import { SectionNotice } from "@/components/section-notice";
import { sections } from "@/config/navigation";

export const metadata = { title: sections.news.label };

export default function NewsPage() {
  return <SectionNotice section={sections.news} />;
}
