import { SectionNotice } from "@/components/section-notice";
import { sections } from "@/config/navigation";

export const metadata = { title: sections.partnership.label };

export default function PartnershipPage() {
  return <SectionNotice section={sections.partnership} />;
}
