import { SectionNotice } from "@/components/section-notice";
import { sections } from "@/config/navigation";

export const metadata = { title: sections.contact.label };

export default function ContactPage() {
  return <SectionNotice section={sections.contact} />;
}
