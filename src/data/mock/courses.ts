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
  coreTopics: string[];
  weeks: string[];
  weeksCount: number;
  durationHours: null;
  finalProject: string;
  isCurriculumDraft: true;
};

type DraftCourseInput = Omit<Course, "weeksCount" | "durationHours" | "isCurriculumDraft">;

function draftCourse(input: DraftCourseInput): Course {
  return {
    ...input,
    weeksCount: input.weeks.length,
    durationHours: null,
    isCurriculumDraft: true,
  };
}

// 검토용 초안입니다. 학사 승인, 교육시간, 실제 모집·개강 정보는 확정하지 않았습니다.
export const courseCatalog = {
  management: draftCourse({
    id: "ai-management",
    slug: "ai-management",
    title: "AI 경영관리학과",
    category: "경영·데이터",
    audience: "경영 실무자 · 관리자 · 창업 준비자",
    summary: "경영 자료를 질문으로 정리하고 AI와 스프레드시트를 활용해 의사결정 근거를 만드는 실습 중심 교육 초안입니다.",
    resultArtifact: "경영 분석·업무개선 기획서",
    objectives: [
      "경영 문제를 분석 가능한 질문과 지표로 구체화합니다.",
      "가상 데이터를 정리하고 AI 분석 결과를 원자료와 대조합니다.",
      "고객·시장 정보를 근거와 가정을 구분해 해석합니다.",
      "비용·효과·실행 조건을 포함한 업무개선안을 설명합니다.",
    ],
    coreTopics: ["경영 질문과 지표 설계", "스프레드시트 데이터 정리·시각화", "고객·시장 분석과 근거 검증", "업무개선 기획과 결과 보고"],
    weeks: [
      "AI 경영 활용과 문제 정의",
      "질문 설계와 답변 검증",
      "데이터 수집과 정리",
      "핵심 지표와 시각화",
      "고객 이해와 수요 가설",
      "시장 자료와 출처 평가",
      "업무 흐름과 개선 과제",
      "문서·보고서 작성 지원",
      "개선안의 비용·효과 검토",
      "최종 프로젝트 설계",
      "프로젝트 제작과 동료 검토",
      "결과 발표와 개선",
    ],
    finalProject: "가상 조직의 업무 또는 고객 문제를 선정해 근거 자료가 포함된 경영 개선안을 제안합니다.",
  }),
  music: draftCourse({
    id: "ai-music",
    slug: "ai-music",
    title: "AI 음악제작학과",
    category: "음악·사운드",
    audience: "음악 창작 입문자 · 콘텐츠 제작자",
    summary: "음악의 구성 요소를 이해하고 AI를 창작 보조 도구로 활용해 짧은 음악과 사운드를 제작하는 교육 초안입니다.",
    resultArtifact: "음악·사운드 포트폴리오",
    objectives: [
      "리듬·멜로디·구조를 활용해 음악 제작 의도를 설명합니다.",
      "AI 생성 결과를 비교·선별하고 편집으로 개선합니다.",
      "음량·전환·내보내기 품질을 점검합니다.",
      "음원 출처·이용 조건·AI 활용 내역을 기록한 포트폴리오를 만듭니다.",
    ],
    coreTopics: ["음악 기획과 기본 구조", "AI 작곡 보조와 결과 평가", "오디오·MIDI 편집과 사운드 디자인", "음원 이용 조건 확인과 포트폴리오"],
    weeks: [
      "음악 제작 흐름과 감상 기준",
      "리듬과 음악 구조",
      "멜로디와 화성의 기초",
      "AI 음악 기획과 생성 비교",
      "오디오 편집 기초",
      "MIDI와 가상 악기",
      "녹음과 사운드 수집",
      "사운드 디자인과 편곡",
      "기초 음량 조절과 출력",
      "최종 프로젝트 기획",
      "작품 제작과 이용 조건 검토",
      "청음 발표와 포트폴리오",
    ],
    finalProject: "선택한 용도에 맞는 짧은 음악 또는 사운드 작품을 기획·편집하고 제작 의도를 설명합니다.",
  }),
  aerial: draftCourse({
    id: "ai-aerial-video",
    slug: "ai-aerial-video",
    title: "AI 항공영상제작학과",
    category: "드론·항공영상",
    audience: "드론·항공 촬영에 관심 있는 성인",
    summary: "항공 촬영 기획부터 AI 영상 편집까지 연결해 보는 교육 초안입니다. 실제 비행 실습은 별도 운영 조건 검토가 필요합니다.",
    resultArtifact: "항공영상 포트폴리오",
    objectives: [
      "촬영 목적·구도·동선을 포함한 항공영상 기획안을 작성합니다.",
      "촬영 전 확인 항목과 현장 운영 조건을 구분합니다.",
      "제공 영상을 선별·편집하고 AI 보조 결과를 검수합니다.",
      "촬영·편집 과정과 자료 이용 조건을 설명하는 포트폴리오를 만듭니다.",
    ],
    coreTopics: ["항공영상 기획과 화면 구성", "촬영 전 현장·장비·안전 확인", "영상 선별·색·자막·사운드 편집", "AI 보조 편집과 결과 검수"],
    weeks: [
      "항공영상 이해와 활용 사례",
      "현장 운영과 사전 확인",
      "구도와 촬영 동선 기획",
      "장비 이해와 모의 조작",
      "촬영 계획 검토",
      "영상 수집과 장면 선별",
      "기본 컷 편집과 흐름",
      "색과 화면 안정성 점검",
      "AI 편집 보조와 검수",
      "최종 프로젝트 기획",
      "최종 영상 편집",
      "상영과 제작 기록 제출",
    ],
    finalProject: "제공된 항공영상 또는 승인된 실습에서 확보한 자료로 공간 소개 영상을 제작합니다. 비행 자격 취득 과정으로 확정하지 않습니다.",
  }),
  multimedia: draftCourse({
    id: "ai-multimedia",
    slug: "ai-multimedia",
    title: "AI 멀티미디어학과",
    category: "디자인·멀티미디어",
    audience: "디자인 입문자 · 디지털 콘텐츠 제작자",
    summary: "텍스트·이미지·영상·사운드를 결합해 하나의 메시지를 전달하는 디지털 콘텐츠를 제작하는 교육 초안입니다.",
    resultArtifact: "멀티미디어 콘텐츠 포트폴리오",
    objectives: [
      "대상·메시지·매체에 맞는 콘텐츠 구조를 설계합니다.",
      "시각·영상·음향 자료를 조합해 일관된 표현을 만듭니다.",
      "AI 결과의 오류·가독성·접근성을 점검합니다.",
      "출처와 제작 과정을 포함한 멀티미디어 포트폴리오를 구성합니다.",
    ],
    coreTopics: ["메시지·매체 기획", "이미지·타이포그래피·레이아웃", "영상·사운드 결합", "접근성·이용 조건·출력 검수"],
    weeks: [
      "멀티미디어 사례와 제작 흐름",
      "대상과 콘텐츠 기획",
      "색·글자·레이아웃 기초",
      "AI 이미지 생성과 선별",
      "이미지 편집과 합성",
      "영상 구성과 기본 편집",
      "사운드와 메시지 전달",
      "모션과 화면 전환",
      "접근성과 다중 화면 검수",
      "최종 프로젝트 설계",
      "통합 제작과 동료 테스트",
      "작품 공개 시연과 포트폴리오",
    ],
    finalProject: "전시·교육·캠페인 등 선택한 주제에 맞는 멀티미디어 콘텐츠 패키지를 제작합니다.",
  }),
  programming: draftCourse({
    id: "ai-programming",
    slug: "ai-programming",
    title: "AI 프로그래밍학과",
    category: "개발·자동화",
    audience: "프로그래밍 입문자 · 업무 자동화 관심자",
    summary: "프로그래밍 입문자가 AI의 도움을 받으며 작은 프로그램을 설계·실행·검증하는 교육 초안입니다.",
    resultArtifact: "프로그램·자동화 프로젝트",
    objectives: [
      "변수·조건·반복·함수의 동작을 작은 예제로 설명합니다.",
      "가상 데이터로 파일 처리와 자동화 프로그램을 만듭니다.",
      "AI가 제안한 코드를 읽고 오류·비밀정보 노출 여부를 확인합니다.",
      "테스트와 사용 설명을 포함한 작은 프로젝트를 완성합니다.",
    ],
    coreTopics: ["프로그래밍 기초와 실행 환경", "파일·표 데이터 처리", "AI 코딩 보조와 오류 분석", "테스트·비밀정보 관리·프로젝트 문서화"],
    weeks: [
      "프로그래밍과 실행 환경",
      "변수와 자료형",
      "조건과 반복",
      "함수와 코드 분리",
      "파일과 CSV 데이터",
      "데이터 검증과 오류 처리",
      "AI 코딩 보조와 검토",
      "작은 업무 자동화",
      "테스트와 비밀정보 점검",
      "최종 프로젝트 설계",
      "프로젝트 구현과 사용성 검토",
      "시연과 문서 정리",
    ],
    finalProject: "가상 데이터를 처리하는 작은 자동화 프로그램을 만들고 사용 방법과 한계를 설명합니다.",
  }),
  advertising: draftCourse({
    id: "ai-advertising-video",
    slug: "ai-advertising-video",
    title: "AI 광고영상제작과",
    category: "광고·영상",
    audience: "마케팅 담당자 · 광고 콘텐츠 제작자",
    summary: "대상 고객과 전달 메시지를 정하고 기획·촬영 자료·AI 보조 편집을 연결해 짧은 광고영상을 제작하는 교육 초안입니다.",
    resultArtifact: "광고영상 포트폴리오",
    objectives: [
      "타깃·메시지·행동 유도를 포함한 광고 기획안을 작성합니다.",
      "대본·스토리보드·촬영 계획을 일관되게 구성합니다.",
      "영상·자막·사운드를 편집하고 AI 결과를 검수합니다.",
      "표현의 근거·출처·플랫폼별 출력 규격을 기록합니다.",
    ],
    coreTopics: ["타깃과 광고 메시지 설계", "대본·스토리보드·촬영 구성", "AI 영상·이미지·음향 보조 제작", "편집·표현 근거·출력 검수"],
    weeks: [
      "광고영상 이해와 사례 분석",
      "타깃과 가상 상품 기획",
      "카피와 영상 대본",
      "스토리보드와 촬영 계획",
      "AI 이미지·영상 제작 보조",
      "제품 촬영 기초",
      "컷 편집과 메시지 흐름",
      "자막·음악·내레이션",
      "화면 비율과 출력 검수",
      "최종 캠페인 기획",
      "광고 시사본 검토",
      "최종 발표와 개선 제안",
    ],
    finalProject: "가상 상품·행사·서비스 중 하나를 정해 짧은 광고영상과 가로·세로 출력본을 제작합니다.",
  }),
} satisfies Record<string, Course>;

export const courses = Object.values(courseCatalog);

// 공개 사전 안내에서는 실제·예시 기수를 모두 노출하지 않습니다.
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

export const sampleOfferings: Offering[] = [];
export const sampleOutcomes = courses.slice(0, 3);
