export type PublicSection = {
  href: string;
  label: string;
  notice: string;
};

export const sections = {
  programs: { href: "/programs", label: "교육과정", notice: "강좌 목록과 과정별 커리큘럼을 준비하고 있습니다." },
  schedule: { href: "/schedule", label: "교육일정", notice: "기수별 개강 일정과 모집 안내를 준비하고 있습니다." },
  outcomes: { href: "/outcomes", label: "교육성과", notice: "과정별 실습 결과물을 소개할 예정입니다." },
  news: { href: "/news", label: "공지사항", notice: "교육 운영과 모집에 관한 공지를 게시할 예정입니다." },
  resources: { href: "/resources", label: "교육자료실", notice: "실습에 사용할 교육자료 안내를 준비하고 있습니다." },
  faq: { href: "/faq", label: "자주 묻는 질문", notice: "과정 선택과 수강 방법에 관한 답변을 준비하고 있습니다." },
  partnership: { href: "/partnership", label: "교육협력", notice: "대학·기업·공공기관을 위한 교육협력 안내를 준비하고 있습니다." },
  about: { href: "/about", label: "기관소개", notice: "기관의 비전과 교육철학을 소개할 예정입니다." },
  contact: { href: "/contact", label: "문의", notice: "문의 방법과 연락처는 확정 후 안내하겠습니다." },
} satisfies Record<string, PublicSection>;

export const educationLinks = [sections.programs, sections.schedule, sections.outcomes];
export const informationLinks = [sections.news, sections.resources, sections.faq];
