export type CoursePreview = {
  id: string;
  slug: string;
  title: string;
  category: string;
  audience: string;
  summary: string;
  resultArtifact: string;
};

export const courseCatalog = {
  life: {
    id: "life-chatgpt", slug: "life-chatgpt", title: "생활 속 챗GPT 활용",
    category: "AI 입문", audience: "일반 성인 · 중장년 · 시니어",
    summary: "일상 속 궁금증을 해결하고 생활에 필요한 문서를 만들어 봅니다.",
    resultArtifact: "나만의 AI 생활 활용집",
  },
  work: {
    id: "ai-work", slug: "ai-work", title: "생성형 AI 업무혁신 실무",
    category: "업무 활용", audience: "직장인 · 행정 · 사무직 · 자영업자",
    summary: "문서 작성부터 자료 분석까지 업무에 필요한 AI 활용법을 익힙니다.",
    resultArtifact: "업무개선 포트폴리오",
  },
  ebook: {
    id: "ai-ebook", slug: "ai-ebook", title: "AI 전자책 제작·작가 도전",
    category: "콘텐츠 제작", audience: "일반 성인 · 예비 작가 · 은퇴자",
    summary: "책의 기획과 원고 작성부터 전자책 편집까지 경험합니다.",
    resultArtifact: "전자책 PDF 완성본",
  },
  instructor: {
    id: "ai-instructor", slug: "ai-instructor", title: "AI 전문강사·교육콘텐츠 제작",
    category: "교육 콘텐츠", audience: "강사 · 예비강사 · 교사 · 교육담당자",
    summary: "교육 대상에 맞는 강의 자료와 참여형 콘텐츠를 기획합니다.",
    resultArtifact: "PPT·강사대본·퀴즈 패키지",
  },
  business: {
    id: "ai-business", slug: "ai-business", title: "AI 소상공인 창업·마케팅",
    category: "창업·마케팅", audience: "소상공인 · 창업 준비자",
    summary: "고객 분석부터 홍보 콘텐츠와 마케팅 계획까지 실습합니다.",
    resultArtifact: "AI 마케팅 실행계획서",
  },
} satisfies Record<string, CoursePreview>;

export const courses = Object.values(courseCatalog);

export const sampleOfferings = [
  { id: "sample-life", course: courseCatalog.life, date: "일정 미정", status: "모집 예정" },
  { id: "sample-work", course: courseCatalog.work, date: "일정 미정", status: "모집 예정" },
];

export const sampleOutcomes = [courseCatalog.life, courseCatalog.work, courseCatalog.ebook];
