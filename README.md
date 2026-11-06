# AI Education Hub (가칭)

독립 AI 교육기관 홈페이지의 프런트엔드입니다. 한국어 시작 화면에서 가칭 기관명과 교육 방향을 확인할 수 있습니다.

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

## DAY 02 디자인과 브랜드 설정

기관명, 가칭 표시, 슬로건, 소개 문구, 로고와 대표 이미지 경로, 연락처는 `src/config/site.ts`에서 관리합니다. 미정인 대표 이미지와 연락처는 `null`로 둡니다. 시작 화면과 페이지 메타데이터는 이 설정을 읽습니다.

`src/app/globals.css`에 네이비·블루·틸 색상, 한글 시스템 서체, 4px 간격 단위, 제목 크기와 포커스 표시를 정의했습니다. 공통 버튼·카드·배지는 `src/components/ui`에 있습니다. 버튼은 기본적으로 `type="button"`이며, 비활성 상태는 HTML의 `disabled` 속성을 사용합니다.

### 검수 기록

2026년 11월 6일, `C:\Projects\ai-education-hub`의 `main`에서 검수했습니다.

- `npx tsc --noEmit`, `npm run lint`, `npm run build` 모두 통과
- Edge의 360px, 768px, 1440px에서 한국어 첫 화면과 탭 아이콘 HTTP 200 확인. 가로 넘침·브라우저 오류 0건
- Tab으로 교육 방향 버튼에 이동하고 Enter·Space로 펼침과 접힘을 확인. 비활성 신청 버튼은 Tab 순서에서 제외
- 기본·호버·누름 상태의 배경색 구분, 키보드 포커스 테두리, 버튼 높이 44px 확인. 기본 버튼의 글자 대비 5.17 대 1, 배지 6.70 대 1
- DAY 01에 기록한 개발 도구 보안 경고는 별도 추적 중입니다. 다음 작업은 공통 헤더·푸터와 모바일 메뉴입니다.
