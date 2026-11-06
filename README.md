# AI Education Hub (가칭)

독립 AI 교육기관 홈페이지의 프런트엔드입니다. DAY 01에는 Next.js App Router, TypeScript, Tailwind CSS, ESLint를 설정하고 한국어 시작 화면을 제공합니다.

## 로컬 실행

초기 검수 환경은 Node.js 24.20.0과 npm 11.19.0입니다. 프로젝트 루트에서 실행합니다.

```sh
npm ci
npm run dev
```

터미널에 표시되는 로컬 주소를 엽니다. 기본 주소는 http://localhost:3000 입니다.

## 검수

```sh
npx tsc --noEmit
npm run lint
npm run build
```

홈 화면은 `src/app/page.tsx`, 언어와 메타데이터는 `src/app/layout.tsx`, 공통 스타일은 `src/app/globals.css`에서 관리합니다.

## DAY 01 검수 기록

2026년 11월 6일에 Next.js 16.4.5로 초기 환경을 검수했습니다.

- 타입 검사, ESLint, 프로덕션 빌드 통과
- Edge에서 1440px, 768px, 360px로 첫 화면 확인. 세 화면 모두 HTTP 200, 가로 넘침과 브라우저 오류 0건
- 탭 아이콘 HTTP 200 확인
- npm audit 결과 운영 의존성 경고 0건. 개발 도구의 minimatch 의존 경로에서 중간 등급 경고 8건이 남아 있으며, 호환되는 린트 도구 업데이트 시 재검사합니다.
