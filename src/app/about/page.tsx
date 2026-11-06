import { SectionNotice } from "@/components/section-notice";
import { sections } from "@/config/navigation";

export const metadata = { title: sections.about.label };

export default function AboutPage() {
  return <SectionNotice section={sections.about} />;
}
