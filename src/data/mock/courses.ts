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
  weeks: string[];
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
    weeks: [
      "AI 시대와 챗GPT 이해",
      "AI에게 질문 잘하는 방법",
      "AI 정보검색과 사실 확인",
      "AI 생활문서 작성",
      "건강·금융 정보의 안전한 활용",
      "AI 여행계획 설계",
      "AI 이미지 활용",
      "AI 취미생활 활용",
      "AI 가족 소통 도우미",
      "AI 허위정보와 사기 예방",
      "개인 AI 활용집 편집",
      "작품 발표 및 평가",
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
    weeks: [
      "업무에 활용하는 생성형 AI",
      "실무형 프롬프트 작성법",
      "공문·메일·문서 작성",
      "AI 보고서 작성",
      "AI 회의록·업무지시 관리",
      "AI 엑셀·데이터 활용",
      "AI 데이터분석과 시각화",
      "AI PPT 제작 실습",
      "자료조사와 출처 확인",
      "AI 업무자동화 기초",
      "나만의 업무개선 프로젝트",
      "프로젝트 발표 및 평가",
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
    weeks: [
      "AI 시대, 나도 작가 되기",
      "독자분석과 책 기획",
      "AI 목차 구성",
      "AI 자료조사와 출처",
      "AI와 함께 원고 쓰기",
      "경험을 이야기로 확장",
      "문장 교정과 퇴고",
      "AI 표지·삽화 제작",
      "전자책 편집과 PDF 제작",
      "AI 저작권과 출판 윤리",
      "출판·유통 준비",
      "전자책 발표회",
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
    weeks: [
      "AI 시대의 전문강사 역량",
      "교육대상 분석과 요구조사",
      "AI 교육계획서 자동설계",
      "최신 자료조사 및 출처 검증",
      "강의 스토리라인 설계",
      "AI PPT 제작 실습",
      "참여형·실습형 강의 설계",
      "AI 강사대본·발표자 노트",
      "AI 교육 퀴즈·평가자료",
      "교육자료 품질 및 안전 검수",
      "강의 리허설과 피드백",
      "최종 강의 시연 및 평가",
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
    weeks: [
      "AI 시대의 소상공인 경쟁력",
      "고객분석과 타깃 설정",
      "경쟁사·시장 조사",
      "상품·서비스 기획",
      "AI 블로그 마케팅",
      "SNS 홍보 콘텐츠 제작",
      "AI 홍보 이미지와 영상 기획",
      "AI 고객응대와 리뷰 관리",
      "프로모션과 홍보 일정",
      "매출·홍보 데이터 분석",
      "마케팅 실행계획 작성",
      "사업별 결과물 발표",
    ],
    weeksCount: 12, durationHours: 24,
  },
} satisfies Record<string, Course>;

export const courses = Object.values(courseCatalog);

export type OfferingStatus = "모집중" | "마감임박" | "마감" | "예정";

export type Offering = {
  id: string;
  course: CoursePreview;
  startDate: string;
  endDate: string;
  location: string;
  capacity: number;
  enrolledCount: number;
  status: OfferingStatus;
};

export const sampleOfferings: Offering[] = [
  { id: "sample-life", course: courseCatalog.life, startDate: "2026-11-16", endDate: "2027-02-01", location: "온라인", capacity: 20, enrolledCount: 8, status: "모집중" },
  { id: "sample-work", course: courseCatalog.work, startDate: "2026-11-16", endDate: "2027-02-01", location: "강의실", capacity: 20, enrolledCount: 18, status: "마감임박" },
  { id: "sample-ebook", course: courseCatalog.ebook, startDate: "2026-11-24", endDate: "2027-02-09", location: "온라인", capacity: 20, enrolledCount: 20, status: "마감" },
  { id: "sample-instructor", course: courseCatalog.instructor, startDate: "2026-12-02", endDate: "2027-02-17", location: "강의실", capacity: 20, enrolledCount: 0, status: "예정" },
  { id: "sample-business", course: courseCatalog.business, startDate: "2026-12-07", endDate: "2027-02-22", location: "온라인", capacity: 20, enrolledCount: 5, status: "모집중" },
];

export const sampleOutcomes = [courseCatalog.life, courseCatalog.work, courseCatalog.ebook];
