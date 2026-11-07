import { DemoList } from "../demo-list";
export const metadata = { title: "관리자 시연 일정 목록", robots: { index: false, follow: false } };
export default function DemoOfferingsPage() { return <DemoList kind="offerings" />; }
