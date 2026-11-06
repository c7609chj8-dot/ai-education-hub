export type CoursePreview = {
  id: string;
  slug: string;
  title: string;
  category: string;
  audience: string;
  summary: string;
  resultArtifact: string;
};

export type Course = CoursePreview & {
  objectives: string[];
  weeksCount: number;
  durationHours: number;
};

export const courseCatalog = {
  life: {
    id: "life-chatgpt", slug: "life-chatgpt", title: "생활 속 챗GPT 활용",
    category: "AI 입문", audience: "일반 성인 · 중장년 · 시니어",
    summary: "일상 속 궁금증을 해결하고 생활에 필요한 문서를 만들어 봅니다.",
    resultArtifact: "나만의 AI 생활 활용집",
    objectives: [
      "생성형 AI의 기본 개념을 이해하고 필요한 답을 얻기 위한 질문을 작성합니다.",
      "생활문서, 여행 계획, 취미 활동에 AI를 활용하고 정보의 출처를 확인합니다.",
      "안전한 이용 방법을 익히고 자신에게 필요한 활용 사례를 정리합니다.",
    ],
    weeksCount: 12, durationHours: 24,
  },
  work: {
    id: "ai-work", slug: "ai-work", title: "생성형 AI 업무혁신 실무",
    category: "업무 활용", audience: "직장인 · 행정 · 사무직 · 자영업자",
    summary: "문서 작성부터 자료 분석까지 업무에 필요한 AI 활용법을 익힙니다.",
    resultArtifact: "업무개선 포트폴리오",
    objectives: [
      "업무 목적에 맞는 프롬프트를 작성하고 문서·보고서 초안을 만듭니다.",
      "회의록, 데이터 분석, 시각화와 발표자료 제작에 AI를 활용합니다.",
      "업무개선 과제를 정해 결과를 점검하고 포트폴리오로 정리합니다.",
    ],
    weeksCount: 12, durationHours: 24,
  },
  ebook: {
    id: "ai-ebook", slug: "ai-ebook", title: "AI 전자책 제작·작가 도전",
    category: "콘텐츠 제작", audience: "일반 성인 · 예비 작가 · 은퇴자",
    summary: "책의 기획과 원고 작성부터 전자책 편집까지 경험합니다.",
    resultArtifact: "전자책 PDF 완성본",
    objectives: [
      "독자와 주제를 정하고 자료조사를 바탕으로 책의 구성과 목차를 기획합니다.",
      "AI와 함께 원고를 작성·퇴고하고 표지와 삽화를 제작합니다.",
      "저작권과 출판 윤리를 살피며 원고를 편집해 PDF로 완성합니다.",
    ],
    weeksCount: 12, durationHours: 24,
  },
  instructor: {
    id: "ai-instructor", slug: "ai-instructor", title: "AI 전문강사·교육콘텐츠 제작",
    category: "교육 콘텐츠", audience: "강사 · 예비강사 · 교사 · 교육담당자",
    summary: "교육 대상에 맞는 강의 자료와 참여형 콘텐츠를 기획합니다.",
    resultArtifact: "PPT·강사대본·퀴즈 패키지",
    objectives: [
      "교육 대상과 요구를 분석하고 목적에 맞는 교육계획을 세웁니다.",
      "AI를 활용해 강의 자료, 강사대본과 퀴즈를 제작합니다.",
      "자료의 품질을 점검하고 강의를 시연하며 피드백을 반영합니다.",
    ],
    weeksCount: 12, durationHours: 24,
  },
  business: {
    id: "ai-business", slug: "ai-business", title: "AI 소상공인 창업·마케팅",
    category: "창업·마케팅", audience: "소상공인 · 창업 준비자",
    summary: "고객 분석부터 홍보 콘텐츠와 마케팅 계획까지 실습합니다.",
    resultArtifact: "AI 마케팅 실행계획서",
    objectives: [
      "고객과 시장을 분석하고 사업에 맞는 상품·서비스를 기획합니다.",
      "블로그·SNS 홍보물과 고객응대에 필요한 콘텐츠를 만들어 봅니다.",
      "홍보 일정과 데이터를 바탕으로 마케팅 실행계획을 정리합니다.",
    ],
    weeksCount: 12, durationHours: 24,
  },
} satisfies Record<string, Course>;

export const courses = Object.values(courseCatalog);

export const sampleOfferings = [
  { id: "sample-life", course: courseCatalog.life, date: "일정 미정", status: "모집 예정" },
  { id: "sample-work", course: courseCatalog.work, date: "일정 미정", status: "모집 예정" },
];

export const sampleOutcomes = [courseCatalog.life, courseCatalog.work, courseCatalog.ebook];
