import { SectionNotice } from "@/components/section-notice";
import { sections } from "@/config/navigation";

export const metadata = { title: sections.resources.label };

export default function ResourcesPage() {
  return <SectionNotice section={sections.resources} />;
}
