type OutcomeVisual = { description: string; image?: { src: string; alt: string } };

export const sampleOutcomeVisuals: Record<string, OutcomeVisual> = {
  "ai-management": {
    "description": "경영 분석·업무개선 기획서의 구성 예시입니다. 실제 수강생 성과가 아닙니다.",
    "image": {
      "src": "/images/hero/ai-management.jpg",
      "alt": "경영 자료를 함께 분석하는 성인 학습자와 강사을 표현한 AI 생성 이미지"
    }
  },
  "ai-music": {
    "description": "음악·사운드 포트폴리오의 구성 예시입니다. 실제 수강생 성과가 아닙니다.",
    "image": {
      "src": "/images/hero/ai-music.jpg",
      "alt": "음악 제작 스튜디오에서 키보드와 음향 장비를 사용하는 학습자을 표현한 AI 생성 이미지"
    }
  },
  "ai-aerial-video": {
    "description": "항공영상 포트폴리오의 구성 예시입니다. 실제 수강생 성과가 아닙니다.",
    "image": {
      "src": "/images/hero/ai-aerial-video.jpg",
      "alt": "드론과 모니터의 항공영상을 함께 검토하는 학습자와 강사을 표현한 AI 생성 이미지"
    }
  },
  "ai-multimedia": {
    "description": "멀티미디어 콘텐츠 포트폴리오의 구성 예시입니다. 실제 수강생 성과가 아닙니다.",
    "image": {
      "src": "/images/hero/ai-multimedia.jpg",
      "alt": "디지털 작업실에서 태블릿과 모니터로 콘텐츠를 제작하는 학습자을 표현한 AI 생성 이미지"
    }
  },
  "ai-programming": {
    "description": "프로그램·자동화 프로젝트의 구성 예시입니다. 실제 수강생 성과가 아닙니다.",
    "image": {
      "src": "/images/hero/ai-programming.jpg",
      "alt": "컴퓨터 실습실에서 코드를 살펴보며 협업하는 성인 학습자을 표현한 AI 생성 이미지"
    }
  },
  "ai-advertising-video": {
    "description": "광고영상 포트폴리오의 구성 예시입니다. 실제 수강생 성과가 아닙니다.",
    "image": {
      "src": "/images/hero/ai-advertising-video.jpg",
      "alt": "촬영 스튜디오에서 제품 광고를 기획하고 촬영하는 제작팀을 표현한 AI 생성 이미지"
    }
  }
};

export const sampleTestimonials = [
 {id: "sample-creative-feedback", text: "관심 있는 분야에서 AI로 나만의 콘텐츠를 만들어 보고 싶어요."},
 {id: "sample-practical-feedback", text: "실습을 통해 업무와 창작에 적용할 방법을 찾아보고 싶어요."},
];
