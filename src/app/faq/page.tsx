import { SectionNotice } from "@/components/section-notice";
import { sections } from "@/config/navigation";

export const metadata = { title: sections.faq.label };

export default function FaqPage() {
  return <SectionNotice section={sections.faq} />;
}
