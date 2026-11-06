import { SectionNotice } from "@/components/section-notice";
import { sections } from "@/config/navigation";

export const metadata = { title: sections.schedule.label };

export default function SchedulePage() {
  return <SectionNotice section={sections.schedule} />;
}
