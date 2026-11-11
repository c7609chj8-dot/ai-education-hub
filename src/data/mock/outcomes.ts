type OutcomeVisual = {
  description: string;
  image?: { src: string; alt: string };
};

export const sampleOutcomeVisuals: Record<string, OutcomeVisual> = {};

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
