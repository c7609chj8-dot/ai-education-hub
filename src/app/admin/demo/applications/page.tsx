import { DemoList } from "../demo-list";
export const metadata = { title: "관리자 시연 가상 신청 목록", robots: { index: false, follow: false } };
export default function DemoApplicationsPage() { return <DemoList kind="applications" />; }
