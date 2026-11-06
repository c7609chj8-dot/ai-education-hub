import { SectionNotice } from "@/components/section-notice";
import { sections } from "@/config/navigation";

export const metadata = { title: sections.programs.label };

export default function ProgramsPage() {
  return <SectionNotice section={sections.programs} />;
}
