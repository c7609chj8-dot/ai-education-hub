type OutcomeVisual = {
  description: string;
  image?: { src: string; alt: string };
};

export const sampleOutcomeVisuals: Record<string, OutcomeVisual> = {
  "life-chatgpt": {
    description: "생활 속 질문과 활용 방법을 한 권의 자료로 정리하는 예시입니다.",
    image: {
      src: "/images/outcome-life-example.webp",
      alt: "노트와 태블릿이 놓인 AI 활용 학습 자료 예시 이미지",
    },
  },
  "ai-work": {
    description: "문서와 데이터 활용 과정을 업무개선 포트폴리오로 정리하는 예시입니다.",
    image: {
      src: "/images/outcome-work-example.webp",
      alt: "차트가 표시된 노트북과 노트가 놓인 업무 학습 자료 예시 이미지",
    },
  },
  "ai-ebook": {
    description: "책의 기획과 원고를 편집해 전자책 PDF로 완성하는 예시입니다.",
  },
};

export const sampleTestimonials = [
  {
    id: "sample-life-feedback",
    text: "일상에서 떠오르는 질문을 AI와 함께 정리하는 방법을 배워 보고 싶어요.",
  },
  {
    id: "sample-work-feedback",
    text: "업무에 필요한 자료를 만들면서 나에게 맞는 활용법을 찾아보고 싶어요.",
  },
];
