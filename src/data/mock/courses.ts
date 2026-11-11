export type CurriculumDraft = {
  introduction: string;
  objectives: string[];
  coreTopics: string[];
  weeks: { title: string; practice: string }[];
  finalProject: string;
  deliverables: string[];
  software: string[];
  equipment: string[];
};

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
  durationHours: number | null;
  curriculumDraft?: CurriculumDraft;
};

export const legacyCourseCatalog = {
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

// 검토용 초안: 학사 승인·교육시간·실제 모집을 확정하지 않습니다.
export const curriculumDrafts: Record<string, CurriculumDraft> = {
  "ai-management": {
    "introduction": "경영 자료를 질문으로 정리하고 AI와 스프레드시트를 활용해 의사결정 근거를 만드는 실습 중심 교육 초안입니다. 가상 기업 데이터를 바탕으로 분석 결과를 검증하고 실행계획으로 연결합니다.",
    "objectives": [
      "경영 문제를 분석 가능한 질문과 지표로 구체화합니다.",
      "가상 데이터를 정리하고 AI 분석 결과를 원자료와 대조합니다.",
      "고객·시장 정보를 근거와 가정을 구분해 해석합니다.",
      "비용·효과·실행 조건을 포함한 업무개선안을 설명합니다."
    ],
    "coreTopics": [
      "경영 질문과 지표 설계",
      "스프레드시트 데이터 정리·시각화",
      "고객·시장 분석과 근거 검증",
      "업무개선 기획과 결과 보고"
    ],
    "weeks": [
      {
        "title": "AI 경영 활용과 문제 정의",
        "practice": "가상 기업을 선정하고 해결할 문제·분석 질문 3개를 작성합니다."
      },
      {
        "title": "질문 설계와 답변 검증",
        "practice": "같은 질문의 답변을 비교하고 근거·추정·오류를 표시합니다."
      },
      {
        "title": "데이터 수집과 정리",
        "practice": "제공된 가상 매출 CSV의 결측·중복을 찾아 정리표를 만듭니다."
      },
      {
        "title": "핵심 지표와 시각화",
        "practice": "매출·비용 지표를 계산하고 원자료와 일치하는 차트 2개를 만듭니다."
      },
      {
        "title": "고객 이해와 수요 가설",
        "practice": "가상 고객 사례를 분류하고 검증할 수 있는 수요 가설을 작성합니다."
      },
      {
        "title": "시장 자료와 출처 평가",
        "practice": "제공 자료의 날짜·출처·한계를 기록한 비교표를 만듭니다."
      },
      {
        "title": "업무 흐름과 개선 과제",
        "practice": "현재 업무 절차를 도식화하고 반복 작업 1개를 선정합니다."
      },
      {
        "title": "문서·보고서 작성 지원",
        "practice": "분석표를 바탕으로 보고서 초안을 만들고 숫자와 표현을 검수합니다."
      },
      {
        "title": "개선안의 비용·효과 검토",
        "practice": "비용·효과 추정치와 산출 근거, 확인이 필요한 가정을 정리합니다."
      },
      {
        "title": "최종 프로젝트 설계",
        "practice": "대상 업무·목표 지표·실행 일정·평가 방법을 기획합니다."
      },
      {
        "title": "프로젝트 제작과 동료 검토",
        "practice": "분석자료와 실행계획을 연결하고 동료 검토 의견을 반영합니다."
      },
      {
        "title": "결과 발표와 개선",
        "practice": "근거·한계·후속 측정을 포함해 발표하고 수정본을 제출합니다."
      }
    ],
    "finalProject": "가상 조직의 업무 또는 고객 문제를 선정해 근거 자료가 포함된 경영 개선안을 제안합니다.",
    "deliverables": [
      "데이터 정리표와 지표·차트",
      "출처·가정·한계 기록",
      "경영 분석·업무개선 기획서와 발표자료"
    ],
    "software": [
      "CSV를 다룰 수 있는 스프레드시트",
      "기관 승인 생성형 AI 도구",
      "문서·프레젠테이션 도구"
    ],
    "equipment": [
      "인터넷 연결 노트북 또는 PC",
      "제공된 가상 기업 데이터"
    ]
  },
  "ai-music": {
    "introduction": "음악의 구성 요소를 이해하고 AI를 창작 보조 도구로 활용해 짧은 음악과 사운드를 제작하는 교육 초안입니다. 직접 만든 소리와 사용 가능한 자료를 구분하고 제작 과정을 기록합니다.",
    "objectives": [
      "리듬·멜로디·구조를 활용해 음악 제작 의도를 설명합니다.",
      "AI 생성 결과를 비교·선별하고 편집으로 개선합니다.",
      "음량·전환·내보내기 품질을 점검합니다.",
      "음원 출처·이용 조건·AI 활용 내역을 기록한 포트폴리오를 만듭니다."
    ],
    "coreTopics": [
      "음악 기획과 기본 구조",
      "AI 작곡 보조와 결과 평가",
      "오디오·MIDI 편집과 사운드 디자인",
      "음원 이용 조건 확인과 포트폴리오"
    ],
    "weeks": [
      {
        "title": "음악 제작 흐름과 감상 기준",
        "practice": "참고곡을 감상하고 분위기·구조·사용 목적을 정리합니다."
      },
      {
        "title": "리듬과 음악 구조",
        "practice": "리듬 패턴과 곡의 구간을 설계한 구성표를 만듭니다."
      },
      {
        "title": "멜로디와 화성의 기초",
        "practice": "짧은 멜로디 또는 코드 진행을 만들고 선택 이유를 기록합니다."
      },
      {
        "title": "AI 음악 기획과 생성 비교",
        "practice": "동일 기획의 생성 결과를 비교하고 사용할 구간을 선정합니다."
      },
      {
        "title": "오디오 편집 기초",
        "practice": "선택 구간의 자르기·이어 붙이기·전환을 실습합니다."
      },
      {
        "title": "MIDI와 가상 악기",
        "practice": "간단한 연주 패턴을 입력하고 악기 소리를 비교합니다."
      },
      {
        "title": "녹음과 사운드 수집",
        "practice": "본인 목소리나 직접 만든 소리를 녹음하고 사용 내역을 기록합니다."
      },
      {
        "title": "사운드 디자인과 편곡",
        "practice": "음악 구간에 효과음·악기를 더해 전후 차이를 비교합니다."
      },
      {
        "title": "기초 음량 조절과 출력",
        "practice": "트랙별 음량과 과도한 피크를 점검하고 테스트 파일을 출력합니다."
      },
      {
        "title": "최종 프로젝트 기획",
        "practice": "짧은 영상·전시·브랜드 등 용도에 맞는 음악 기획서를 만듭니다."
      },
      {
        "title": "작품 제작과 이용 조건 검토",
        "practice": "작품을 편집하고 음원 출처·이용 조건·AI 사용 기록을 정리합니다."
      },
      {
        "title": "청음 발표와 포트폴리오",
        "practice": "동료 청음 의견을 반영해 최종 음원과 제작 설명을 제출합니다."
      }
    ],
    "finalProject": "선택한 용도에 맞는 짧은 음악 또는 사운드 작품을 기획·편집하고 제작 의도를 설명합니다.",
    "deliverables": [
      "최종 음원과 편집 프로젝트 파일",
      "음원 출처·이용 조건 및 AI 활용 기록",
      "기획서·제작 과정·청음 피드백"
    ],
    "software": [
      "오디오·MIDI 편집 도구",
      "기관 승인 AI 음악 제작 도구",
      "파일 재생·변환 도구"
    ],
    "equipment": [
      "노트북 또는 PC",
      "헤드폰 또는 이어폰",
      "녹음용 마이크(선택)"
    ]
  },
  "ai-aerial-video": {
    "introduction": "항공영상의 기획·구도·편집을 연결해 짧은 영상 결과물을 만드는 교육 초안입니다. 제공된 영상으로 시작하며 실제 비행 실습은 장소·운영 인력·안전 절차가 확보된 경우에만 별도로 검토합니다.",
    "objectives": [
      "촬영 목적·구도·동선을 포함한 항공영상 기획안을 작성합니다.",
      "촬영 전 확인 항목과 현장 운영 조건을 구분합니다.",
      "제공 영상을 선별·편집하고 AI 보조 결과를 검수합니다.",
      "촬영·편집 과정과 자료 이용 조건을 설명하는 포트폴리오를 만듭니다."
    ],
    "coreTopics": [
      "항공영상 기획과 화면 구성",
      "촬영 전 현장·장비·안전 확인",
      "영상 선별·색·자막·사운드 편집",
      "AI 보조 편집과 결과 검수"
    ],
    "weeks": [
      {
        "title": "항공영상 이해와 활용 사례",
        "practice": "제공 영상을 보고 목적·구도·전환 방식을 분석합니다."
      },
      {
        "title": "현장 운영과 사전 확인",
        "practice": "장소·촬영 대상·운영 인력·장비 확인 목록을 작성합니다."
      },
      {
        "title": "구도와 촬영 동선 기획",
        "practice": "가상 장소의 촬영 구도와 이동 경로를 스토리보드로 만듭니다."
      },
      {
        "title": "장비 이해와 모의 조작",
        "practice": "장비 점검 시연 또는 제공 조작 자료로 점검 기록을 작성합니다."
      },
      {
        "title": "촬영 계획 검토",
        "practice": "가상 현장 조건의 위험 요소와 촬영 대안을 정리합니다."
      },
      {
        "title": "영상 수집과 장면 선별",
        "practice": "제공 영상의 화질·구도·흔들림을 비교해 사용할 장면을 고릅니다."
      },
      {
        "title": "기본 컷 편집과 흐름",
        "practice": "장면을 배열해 도입·전개·마무리가 있는 시퀀스를 만듭니다."
      },
      {
        "title": "색과 화면 안정성 점검",
        "practice": "색·노출·수평을 조정하고 보정 전후를 비교합니다."
      },
      {
        "title": "AI 편집 보조와 검수",
        "practice": "자막·장면 분류 등 보조 결과를 확인하고 오류를 수정합니다."
      },
      {
        "title": "최종 프로젝트 기획",
        "practice": "지역 소개 또는 공간 기록 영상의 기획·자료 계획을 작성합니다."
      },
      {
        "title": "최종 영상 편집",
        "practice": "음악·자막·출처를 포함해 시사본을 만들고 피드백을 받습니다."
      },
      {
        "title": "상영과 제작 기록 제출",
        "practice": "최종 영상·기획서·점검 기록·자료 이용 내역을 제출합니다."
      }
    ],
    "finalProject": "제공된 항공영상 또는 승인된 실습에서 확보한 자료로 공간 소개 영상을 제작합니다. 비행 자격 취득 과정으로 확정하지 않습니다.",
    "deliverables": [
      "항공영상 편집 결과물",
      "촬영 기획·스토리보드",
      "현장 확인 및 자료 이용 기록"
    ],
    "software": [
      "영상 편집 도구",
      "기관 승인 AI 영상 보조 도구",
      "영상 재생·파일 관리 도구"
    ],
    "equipment": [
      "영상 편집이 가능한 노트북 또는 PC",
      "제공된 항공영상과 헤드폰",
      "드론·조종기·촬영 장소·운영 인력(현장 실습 별도 검토)"
    ]
  },
  "ai-multimedia": {
    "introduction": "텍스트·이미지·영상·사운드를 결합해 하나의 메시지를 전달하는 디지털 콘텐츠를 제작하는 교육 초안입니다. 목적과 이용 환경에 맞는 형식을 정하고 AI 제작 결과를 검수합니다.",
    "objectives": [
      "대상·메시지·매체에 맞는 콘텐츠 구조를 설계합니다.",
      "시각·영상·음향 자료를 조합해 일관된 표현을 만듭니다.",
      "AI 결과의 오류·가독성·접근성을 점검합니다.",
      "출처와 제작 과정을 포함한 멀티미디어 포트폴리오를 구성합니다."
    ],
    "coreTopics": [
      "메시지·매체 기획",
      "이미지·타이포그래피·레이아웃",
      "영상·사운드 결합",
      "접근성·이용 조건·출력 검수"
    ],
    "weeks": [
      {
        "title": "멀티미디어 사례와 제작 흐름",
        "practice": "참고 콘텐츠의 메시지·구성 요소·표현 방식을 분석합니다."
      },
      {
        "title": "대상과 콘텐츠 기획",
        "practice": "가상 주제의 대상·목적·제작 형식을 기획합니다."
      },
      {
        "title": "색·글자·레이아웃 기초",
        "practice": "색과 글자의 가독성을 비교하고 화면 시안을 만듭니다."
      },
      {
        "title": "AI 이미지 생성과 선별",
        "practice": "시안에 필요한 이미지 후보를 만들고 오류를 기록합니다."
      },
      {
        "title": "이미지 편집과 합성",
        "practice": "직접 준비한 자료로 이미지 크기·구도·레이아웃을 조정합니다."
      },
      {
        "title": "영상 구성과 기본 편집",
        "practice": "이미지와 영상을 연결한 짧은 시퀀스를 만듭니다."
      },
      {
        "title": "사운드와 메시지 전달",
        "practice": "배경음·효과음·내레이션의 역할을 정하고 편집합니다."
      },
      {
        "title": "모션과 화면 전환",
        "practice": "단순한 움직임·전환을 적용하고 과도한 효과를 줄입니다."
      },
      {
        "title": "접근성과 다중 화면 검수",
        "practice": "자막·대비·화면 비율을 PC와 모바일에서 점검합니다."
      },
      {
        "title": "최종 프로젝트 설계",
        "practice": "작품의 구성도·자료 목록·제작 일정을 작성합니다."
      },
      {
        "title": "통합 제작과 동료 테스트",
        "practice": "텍스트·이미지·영상·소리를 결합하고 피드백을 반영합니다."
      },
      {
        "title": "작품 공개 시연과 포트폴리오",
        "practice": "결과물·제작 과정·출처 목록을 묶어 발표합니다."
      }
    ],
    "finalProject": "전시·교육·캠페인 등 선택한 주제에 맞는 멀티미디어 콘텐츠 패키지를 제작합니다.",
    "deliverables": [
      "대표 이미지와 멀티미디어 결과물",
      "화면 구성도·편집 원본",
      "접근성 점검표와 자료 출처"
    ],
    "software": [
      "이미지·레이아웃 편집 도구",
      "영상·음향 편집 도구",
      "기관 승인 생성형 AI 도구"
    ],
    "equipment": [
      "노트북 또는 PC",
      "헤드폰 또는 이어폰",
      "태블릿·펜 입력 장치(선택)"
    ]
  },
  "ai-programming": {
    "introduction": "프로그래밍 입문자가 AI의 도움을 받으며 작은 프로그램을 설계·실행·검증하는 교육 초안입니다. 코드를 그대로 복사하는 데 그치지 않고 입력·처리·출력과 오류를 설명하는 데 중점을 둡니다.",
    "objectives": [
      "변수·조건·반복·함수의 동작을 작은 예제로 설명합니다.",
      "가상 데이터로 파일 처리와 자동화 프로그램을 만듭니다.",
      "AI가 제안한 코드를 읽고 오류·비밀정보 노출 여부를 확인합니다.",
      "테스트와 사용 설명을 포함한 작은 프로젝트를 완성합니다."
    ],
    "coreTopics": [
      "프로그래밍 기초와 실행 환경",
      "파일·표 데이터 처리",
      "AI 코딩 보조와 오류 분석",
      "테스트·비밀정보 관리·프로젝트 문서화"
    ],
    "weeks": [
      {
        "title": "프로그래밍과 실행 환경",
        "practice": "예제 프로그램을 실행하고 입력·처리·출력을 표시합니다."
      },
      {
        "title": "변수와 자료형",
        "practice": "가상 업무의 수치·문자 데이터를 다루는 코드를 작성합니다."
      },
      {
        "title": "조건과 반복",
        "practice": "조건별 처리와 반복 계산 예제를 만들고 결과를 확인합니다."
      },
      {
        "title": "함수와 코드 분리",
        "practice": "반복되는 처리를 함수로 나누고 호출 결과를 설명합니다."
      },
      {
        "title": "파일과 CSV 데이터",
        "practice": "제공된 가상 CSV를 읽어 요약 결과를 새 파일로 저장합니다."
      },
      {
        "title": "데이터 검증과 오류 처리",
        "practice": "누락·잘못된 입력을 처리하고 오류 메시지를 개선합니다."
      },
      {
        "title": "AI 코딩 보조와 검토",
        "practice": "AI 제안 코드의 동작·의존성·문제점을 직접 확인합니다."
      },
      {
        "title": "작은 업무 자동화",
        "practice": "가상 자료의 정리·분류·보고서 생성 중 한 기능을 구현합니다."
      },
      {
        "title": "테스트와 비밀정보 점검",
        "practice": "정상·경계·오류 입력을 테스트하고 코드의 민감정보를 점검합니다."
      },
      {
        "title": "최종 프로젝트 설계",
        "practice": "사용자·입출력·기능 범위·완료 조건을 작성합니다."
      },
      {
        "title": "프로젝트 구현과 사용성 검토",
        "practice": "기능을 구현하고 다른 학습자의 실행 결과를 반영합니다."
      },
      {
        "title": "시연과 문서 정리",
        "practice": "코드·테스트 결과·설치 및 사용 설명을 묶어 발표합니다."
      }
    ],
    "finalProject": "가상 데이터를 처리하는 작은 자동화 프로그램을 만들고 사용 방법과 한계를 설명합니다.",
    "deliverables": [
      "프로그램 소스와 실행 예제",
      "정상·경계·오류 테스트 기록",
      "설치·사용 설명과 AI 코드 검토 기록"
    ],
    "software": [
      "Python 3 실행 환경",
      "코드 편집기와 웹 브라우저",
      "기관 승인 AI 코딩 보조 도구(선택)"
    ],
    "equipment": [
      "프로그램 설치·실행이 가능한 노트북 또는 PC",
      "제공된 가상 CSV 데이터"
    ]
  },
  "ai-advertising-video": {
    "introduction": "대상 고객과 전달 메시지를 정하고 기획·촬영 자료·AI 보조 편집을 연결해 짧은 광고영상을 제작하는 교육 초안입니다. 가상 상품을 사용해 표현의 근거와 자료 이용 조건을 함께 점검합니다.",
    "objectives": [
      "타깃·메시지·행동 유도를 포함한 광고 기획안을 작성합니다.",
      "대본·스토리보드·촬영 계획을 일관되게 구성합니다.",
      "영상·자막·사운드를 편집하고 AI 결과를 검수합니다.",
      "표현의 근거·출처·플랫폼별 출력 규격을 기록합니다."
    ],
    "coreTopics": [
      "타깃과 광고 메시지 설계",
      "대본·스토리보드·촬영 구성",
      "AI 영상·이미지·음향 보조 제작",
      "편집·표현 근거·출력 검수"
    ],
    "weeks": [
      {
        "title": "광고영상 이해와 사례 분석",
        "practice": "제공 광고의 대상·메시지·행동 유도를 분석합니다."
      },
      {
        "title": "타깃과 가상 상품 기획",
        "practice": "가상 상품의 특징·고객·근거 있는 표현을 정리합니다."
      },
      {
        "title": "카피와 영상 대본",
        "practice": "핵심 메시지와 장면별 대사를 작성하고 과장 표현을 점검합니다."
      },
      {
        "title": "스토리보드와 촬영 계획",
        "practice": "장면·구도·소품·자료 목록을 스토리보드로 작성합니다."
      },
      {
        "title": "AI 이미지·영상 제작 보조",
        "practice": "장면 후보를 만들고 상품·인물·문자 표현 오류를 검토합니다."
      },
      {
        "title": "제품 촬영 기초",
        "practice": "가상 상품이나 소품을 촬영하고 조명·구도 차이를 비교합니다."
      },
      {
        "title": "컷 편집과 메시지 흐름",
        "practice": "촬영·제공 자료를 배치해 메시지가 전달되는 초안을 만듭니다."
      },
      {
        "title": "자막·음악·내레이션",
        "practice": "자막 가독성과 음량을 점검하고 음향 자료를 연결합니다."
      },
      {
        "title": "화면 비율과 출력 검수",
        "practice": "가로·세로 버전을 출력하고 잘림·화질·소리를 비교합니다."
      },
      {
        "title": "최종 캠페인 기획",
        "practice": "영상 목표·타깃·메시지·검토 기준을 기획서로 확정합니다."
      },
      {
        "title": "광고 시사본 검토",
        "practice": "동료에게 시사하고 이해도·표현 근거·자료 이용 기록을 점검합니다."
      },
      {
        "title": "최종 발표와 개선 제안",
        "practice": "최종 영상과 제작 자료를 제출하고 후속 개선점을 설명합니다."
      }
    ],
    "finalProject": "가상 상품·행사·서비스 중 하나를 정해 짧은 광고영상과 가로·세로 출력본을 제작합니다.",
    "deliverables": [
      "광고영상과 화면 비율별 출력본",
      "광고 기획서·대본·스토리보드",
      "표현 근거·자료 이용 및 AI 활용 기록"
    ],
    "software": [
      "영상 편집·자막 도구",
      "기관 승인 AI 영상·이미지 보조 도구",
      "오디오 편집 또는 녹음 도구"
    ],
    "equipment": [
      "노트북 또는 PC",
      "스마트폰 또는 카메라·삼각대",
      "촬영 소품과 간단한 조명(기관 보유 장비 우선)"
    ]
  }
};

function draftCourse(course: Course): Course {
  const curriculumDraft = curriculumDrafts[course.slug];
  if (!curriculumDraft) throw new Error("Missing curriculum draft");
  return { ...course, summary: curriculumDraft.introduction, objectives: curriculumDraft.objectives,
    weeks: curriculumDraft.weeks.map((week) => week.title), weeksCount: curriculumDraft.weeks.length,
    durationHours: null, curriculumDraft };
}

export const courseCatalog = {
  management: draftCourse({
  "id": "ai-management",
  "slug": "ai-management",
  "title": "AI 경영관리학과",
  "category": "경영·데이터",
  "audience": "경영 실무자 · 관리자 · 창업 준비자",
  "summary": "AI를 활용한 경영 자료 분석과 업무 개선을 탐색합니다.",
  "resultArtifact": "경영 분석·업무개선 기획서",
  "objectives": [],
  "weeks": [],
  "weeksCount": 0,
  "durationHours": null
}),
  music: draftCourse({
  "id": "ai-music",
  "slug": "ai-music",
  "title": "AI 음악제작학과",
  "category": "음악·사운드",
  "audience": "음악 창작 입문자 · 콘텐츠 제작자",
  "summary": "AI와 함께 음악을 기획하고 사운드를 만드는 과정을 탐색합니다.",
  "resultArtifact": "음악·사운드 포트폴리오",
  "objectives": [],
  "weeks": [],
  "weeksCount": 0,
  "durationHours": null
}),
  aerial: draftCourse({
  "id": "ai-aerial-video",
  "slug": "ai-aerial-video",
  "title": "AI 항공영상제작학과",
  "category": "드론·항공영상",
  "audience": "드론·항공 촬영에 관심 있는 성인",
  "summary": "항공 촬영 기획부터 AI 영상 편집까지 연결해 봅니다.",
  "resultArtifact": "항공영상 포트폴리오",
  "objectives": [],
  "weeks": [],
  "weeksCount": 0,
  "durationHours": null
}),
  multimedia: draftCourse({
  "id": "ai-multimedia",
  "slug": "ai-multimedia",
  "title": "AI 멀티미디어학과",
  "category": "디자인·멀티미디어",
  "audience": "디자인 입문자 · 디지털 콘텐츠 제작자",
  "summary": "이미지·영상·사운드를 결합한 디지털 콘텐츠를 탐색합니다.",
  "resultArtifact": "멀티미디어 콘텐츠 포트폴리오",
  "objectives": [],
  "weeks": [],
  "weeksCount": 0,
  "durationHours": null
}),
  programming: draftCourse({
  "id": "ai-programming",
  "slug": "ai-programming",
  "title": "AI 프로그래밍학과",
  "category": "개발·자동화",
  "audience": "프로그래밍 입문자 · 업무 자동화 관심자",
  "summary": "AI와 함께 코드를 이해하고 프로그램을 만드는 과정을 탐색합니다.",
  "resultArtifact": "프로그램·자동화 프로젝트",
  "objectives": [],
  "weeks": [],
  "weeksCount": 0,
  "durationHours": null
}),
  advertising: draftCourse({
  "id": "ai-advertising-video",
  "slug": "ai-advertising-video",
  "title": "AI 광고영상제작과",
  "category": "광고·영상",
  "audience": "마케팅 담당자 · 광고 콘텐츠 제작자",
  "summary": "광고 기획과 스토리보드부터 AI 영상 제작까지 탐색합니다.",
  "resultArtifact": "광고영상 포트폴리오",
  "objectives": [],
  "weeks": [],
  "weeksCount": 0,
  "durationHours": null
}),
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
  { id: "demo-ai-management-01", course: courseCatalog.management, startDate: "2026-11-16", endDate: "2027-02-01", location: "온라인", capacity: 20, enrolledCount: 8, status: "모집중" },
  { id: "demo-ai-music-01", course: courseCatalog.music, startDate: "2026-11-16", endDate: "2027-02-01", location: "강의실", capacity: 20, enrolledCount: 18, status: "마감임박" },
  { id: "demo-ai-aerial-video-01", course: courseCatalog.aerial, startDate: "2026-11-24", endDate: "2027-02-09", location: "온라인", capacity: 20, enrolledCount: 20, status: "마감" },
  { id: "demo-ai-multimedia-01", course: courseCatalog.multimedia, startDate: "2026-12-02", endDate: "2027-02-17", location: "강의실", capacity: 20, enrolledCount: 0, status: "예정" },
  { id: "demo-ai-programming-01", course: courseCatalog.programming, startDate: "2026-12-07", endDate: "2027-02-22", location: "온라인", capacity: 20, enrolledCount: 5, status: "모집중" },
  { id: "demo-ai-advertising-video-01", course: courseCatalog.advertising, startDate: "2026-12-14", endDate: "2027-03-01", location: "강의실", capacity: 20, enrolledCount: 0, status: "예정" },
];

export const sampleOutcomes = Object.values(courseCatalog);

// 기존 DB 시드 회귀 검증용이며 공개 목록에는 사용하지 않습니다.
export const legacySampleOfferings: Offering[] = [
  { id: "sample-life", course: legacyCourseCatalog.life, startDate: "2026-11-16", endDate: "2027-02-01", location: "온라인", capacity: 20, enrolledCount: 8, status: "모집중" },
  { id: "sample-work", course: legacyCourseCatalog.work, startDate: "2026-11-16", endDate: "2027-02-01", location: "강의실", capacity: 20, enrolledCount: 18, status: "마감임박" },
  { id: "sample-ebook", course: legacyCourseCatalog.ebook, startDate: "2026-11-24", endDate: "2027-02-09", location: "온라인", capacity: 20, enrolledCount: 20, status: "마감" },
  { id: "sample-instructor", course: legacyCourseCatalog.instructor, startDate: "2026-12-02", endDate: "2027-02-17", location: "강의실", capacity: 20, enrolledCount: 0, status: "예정" },
  { id: "sample-business", course: legacyCourseCatalog.business, startDate: "2026-12-07", endDate: "2027-02-22", location: "온라인", capacity: 20, enrolledCount: 5, status: "모집중" },
];


// 이전 브랜드 Preview의 광고영상 주소만 호환합니다. 기존 5개 ID는 원래 과정을 보존합니다.
export const demoOfferingAliases: Readonly<Record<string, string>> = {
  "sample-advertising": "demo-ai-advertising-video-01",
};
