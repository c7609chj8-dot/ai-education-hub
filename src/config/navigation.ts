export type PublicSection = {
  href: string;
  label: string;
  notice: string;
};

export const sections = {
  programs: { href: "/programs", label: "교육과정", notice: "6개 학과의 검토용 12주차 교육과정 초안을 확인할 수 있습니다." },
  schedule: { href: "/schedule", label: "교육일정", notice: "실제 교육기수·모집 일정은 확정 후 안내합니다." },
  outcomes: { href: "/outcomes", label: "교육성과", notice: "검토용 교육과정에서 목표로 하는 결과물 예시를 소개합니다." },
  news: { href: "/news", label: "공지사항", notice: "사전 공개 단계의 안내 예시를 게시합니다." },
  resources: { href: "/resources", label: "교육자료실", notice: "실습에 사용할 교육자료 안내를 준비하고 있습니다." },
  faq: { href: "/faq", label: "자주 묻는 질문", notice: "교육과정 초안과 사전 공개 범위에 관한 답변을 확인할 수 있습니다." },
  partnership: { href: "/partnership", label: "교육협력", notice: "대학·기업·공공기관을 위한 교육협력 안내를 준비하고 있습니다." },
  about: { href: "/about", label: "기관소개", notice: "기관의 비전과 교육철학을 소개할 예정입니다." },
  contact: { href: "/contact", label: "문의", notice: "공식 문의 방법과 연락처는 확정 후 안내합니다." },
} satisfies Record<string, PublicSection>;

export const educationLinks = [sections.programs, sections.schedule, sections.outcomes];
export const informationLinks = [sections.news, sections.resources, sections.faq];
