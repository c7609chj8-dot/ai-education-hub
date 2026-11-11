// 개인정보나 실제 접수 내역이 아닌 화면 구성용 가상 데이터입니다.
export const demoApplications = [
  { id: "demo-01", label: "가상 신청 01", courseId: "ai-management", state: "확인 대기" },
  { id: "demo-02", label: "가상 신청 02", courseId: "ai-music", state: "확인 완료" },
  { id: "demo-03", label: "가상 신청 03", courseId: "ai-programming", state: "확인 대기" },
] as const;

