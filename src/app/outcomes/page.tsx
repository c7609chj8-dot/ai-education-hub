import { SectionNotice } from "@/components/section-notice";
import { sections } from "@/config/navigation";

export const metadata = { title: sections.outcomes.label };

export default function OutcomesPage() {
  return <SectionNotice section={sections.outcomes} />;
}
