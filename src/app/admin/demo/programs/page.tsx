import { DemoList } from "../demo-list";
export const metadata = { title: "관리자 시연 강좌 목록", robots: { index: false, follow: false } };
export default function DemoProgramsPage() { return <DemoList kind="programs" />; }
