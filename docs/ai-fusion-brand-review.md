# PR #37 브랜드 보완 및 검수 결과

기준일: 2026-11-11 (한국시간). 기준 HEAD: 81e4331307aa2bf42590210181c37a23ecd60fd4.
기존 codex/ai-fusion-branding 브랜치에서 작업하며 새 브랜드 브랜치는 만들지 않았다.

## 결론

- 슬로건·로고 표시·시연 일정 제목·항공영상 이미지 설명을 최소 수정했다.
- 로컬 Chrome에서 PC·모바일 시각 검수와 주요 조회 흐름을 확인했다.
- 3단계 교육과정 세부 설계로 진행할 수 있다. 목표·12주안·시간을 임의로 확정하거나 실제 DB에 넣지는 않았다.
- 실제 DB 변경·권한 변경·B-04 브랜치 수정·PR 병합·main 수정·Production 배포는 수행하지 않았다.

## 수정 파일

| 파일 | 변경 이유 |
| --- | --- |
| src/config/site.ts | 슬로건을 정확히 “AI로 연결하는 지식, 융합으로 여는 미래”로 수정 |
| src/components/layout/site-header.tsx | scale 확대와 object-cover를 제거하고 object-contain 적용. 원본 전체와 DEU_AI 문구를 표시하며 모바일 80px·큰 화면 96px 영역 확보 |
| src/components/home-previews.tsx | 시연 데이터일 때 “다음 개강 일정” 대신 “교육일정 예시” 표시 |
| src/data/course-photos.ts | 항공영상 사진의 실내 드론·모니터 장면에 맞게 대체 텍스트 수정 |
| src/data/mock/outcomes.ts | 같은 사진을 사용하는 결과물 예시의 설명도 일치시킴 |
| docs/ai-fusion-brand-review.md | 본 검수 기록 |

원본 로고·대표 이미지 바이너리·학과 ID/slug·커리큘럼·신청 코드·관리자 코드·SQL은 이번 보완에서 변경하지 않았다.

## 시각·기능 검수

| 항목 | 실제 결과 |
| --- | --- |
| PC 1440×900 | 전체 로고·기관명·슬로건·데스크톱 메뉴·히어로 확인. 가로 넘침 없음 |
| 모바일 360×800 | 로고와 DEU_AI 문구 전체 표시, 기관명·슬로건·버튼 확인. 문서 폭 345px ≤ 화면 360px |
| 모바일 390×844 | 로고·메뉴·히어로·학과 상세 확인. 상세 문서 폭 375px ≤ 화면 390px |
| 태블릿 768×1024 | 로고·기관명·모바일 메뉴·슬로건·슬라이드 확인. 문서 폭 753px ≤ 화면 768px |
| 모바일 메뉴 | 열림·닫힘과 Escape 복귀 확인 |
| 브랜드 | 헤더·푸터·홈 제목 AI융합대학, 상세 제목 “AI 음악제작학과 \| AI융합대학”, 목록 제목 “교육과정 \| AI융합대학” 확인. 개편 화면의 본문에 에이담 노출 없음 |
| 슬라이드 6장 | 1~6번 버튼으로 경영·음악·항공영상·멀티미디어·프로그래밍·광고영상 사진과 캡션·상세 링크 확인 |
| 학과 카드 6개 | 학과명·상세 href·대표 이미지 slug 연결 확인. PC 카드 배치와 이미지 장면 확인 |
| 검색 | “음악” 입력 후 검색 결과 1개와 AI 음악제작학과 카드 확인 |
| 상세 6개 | 로컬 HTTP 200 및 교육목표·주차별 내용 준비 중 안내 확인. 데이터는 목표/주차 빈 배열, 교육시간 null 유지 |
| 실제 시간 안내 | 모바일 상세의 예정 교육시간은 안내 예정. 12주나 24시간으로 확정 표시하지 않음 |
| 일정 | 홈은 교육일정 예시·접수 준비 중, 일정 페이지는 시연용/실제 모집 미확정 표시. 음악 과정 필터·예시 날짜·정원·신청 시연 링크 확인 |

이미지는 AI 생성 교육 장면 예시이며 실제 교내 시설·수강생 사진이 아니다.
학과명은 AI 경영관리학과, AI 음악제작학과, AI 항공영상제작학과, AI 멀티미디어학과, AI 프로그래밍학과, AI 광고영상제작과로 유지했다.

## mock와 Supabase의 차이

| 조건 | 표시되는 내용 | 확인 범위 |
| --- | --- | --- |
| PR #37 기본/mock | 신규 6개 학과·6개 이미지·시연 기수. 목표·주차·시간 미확정 | 이번 로컬 화면과 코드 검수 |
| Supabase 공개 조회 | 기존 5개 published 강좌와 60주차. 공개 교육기수 0개이므로 일정은 빈 상태 | 개발 DB READ ONLY 조회와 PR #35의 DB 연결 Preview에서 기존 5개 목록을 실제 확인 |
| PR #37을 Supabase 소스로 설정할 경우 | 동일 조회 어댑터가 기존 DB의 5개를 표시한다. 신규 6개 mock가 자동 합쳐지지 않는다 | 코드·DB 자료 기반 판정. PR #37 환경변수를 변경하지 않았으며 이 조합의 인증된 실행 검수는 별도 |
| 브랜드 mock/기본값 | 코드의 AI융합대학·새 슬로건 | 이번 시각 검수 |
| 브랜드 supabase | DB published_brand_settings 우선. 현재 개발 DB에 뷰가 없으므로 기본 브랜드와 unavailable 안내로 돌아가는 구조 | 코드·DB 존재 여부 확인. 실제 브랜드 DB 기능 완료로 간주하지 않음 |

- 비교한 DB 연결 Preview는 PR #35 커밋의 이전 브랜드 “에이담 AI아카데미”를 표시한다. PR #37의 브랜드 회귀로 혼동하지 않는다.
- ACADEMY_PREVIEW_READ_ONLY=true는 인증 설정을 차단한다. 공개 강좌는 getSupabasePublicConfig로 읽지만 브랜드는 getSupabaseAuthConfig를 사용하므로 기본값으로 돌아간다. 이번에 권한 경계를 완화하지 않았다.
- READ ONLY 재확인: courses=5, course_weeks=60, offerings=1, public_offerings=0, applications 없음, published_brand_settings 없음.
- 기존 기수 UUID·강좌 FK·공개상태·데이터는 그대로다.

## 품질·회귀 결과

- TypeScript --noEmit: 통과.
- ESLint: 통과.
- Next.js production Webpack 빌드: 통과.
- verify-admin-auth-gates: 통과. 가상 인증·멤버십·폐기·RPC 실패 차단 검사.
- verify-admin-validation: 통과.
- verify-brand-services: 통과. 모의 서비스 검사이며 실제 DB 브랜드 연결 성공을 뜻하지 않음.
- verify-course-access: 통과. 격리 DB의 기존 5개·60주차와 비공개/쓰기 권한 검사.
- verify-schedule-access: 통과. 격리 DB의 일정·부모 공개상태·중복 seed 차단 검사.
- verify-b04-day01-schema: 통과. 격리 스키마·PII 분리·중복키·롤백·기존 v2 가드/ACL/RLS 보존 검사.
- verify-admin-offering-services: 통과. 사용자 세션 기반 v2 RPC 및 비밀 키 미사용 경로 검사.
- verify-application-validation: 통과. 서버 입력·모집기간 경계 검사.
- 실제 관리자 계정으로 등록/수정하거나 실제 신청을 전송하지 않았다. 이 검수는 B-04 실제 동시 신청 검수 완료를 의미하지 않는다.
- 로컬 시각 검수는 별도 Preview 작업 폴더에서 수행했다. b04-work의 기존 미추적 2일차 파일 6개는 그대로 두었다.

## 남은 문제와 3단계 진입 조건

1. 기존 sample-life/sample-work 등의 시연 ID가 새 학과를 가리키는 호환성 문제는 남아 있다. 이번 최소 브랜드 보완에서 신청 경로를 바꾸지 않았으며 3단계에서 구 기수 보존·신규 기수 ID 정책을 설계한다.
2. ai-music / ai-advertising-video는 마스터 권장 ai-music-production / ai-ad-video와 다르다. 기존 링크 보존·alias 계획을 세운 후 변경한다.
3. 교육목표·학습 분야·실습·12주 표준안·교육시간은 미확정이다. 3단계에서는 초안을 작성하고 검토 대상으로 제시한다.
4. 신규 6개·72주차의 실제 DB 추가와 기존 5개의 공개 전환은 별도 설계·격리 검증·승인이 필요하다.
5. 실제 신청 연결은 B-04 정원 트랜잭션·권한 검수 이후 통합해야 한다. 기존 관리자 v2의 신청 테이블 감지 차단 가드는 유지한다.
6. OG/SNS 공유 이미지 등 마스터 지시서의 추가 항목은 이번 “PR #37 최소 보완” 범위를 넘어선 후속 검수 대상으로 남긴다.
7. 3단계 세부 설계로의 진입을 막는 브랜드 표시 오류는 이번 확인 범위에서 발견되지 않았다. 설계 진행 가능 판정이며, 실제 운영 전환 승인이나 전체 B-04 완료 판정은 아니다.

## 증빙과 출처

- 로컬 스크린샷: 브랜드 검수/home-1440.jpg, home-360.jpg, home-390.jpg, courses-1440.jpg, supabase-existing-5.jpg.
- [PR #37](https://github.com/c7609chj8-dot/ai-education-hub/pull/37)
- [DB 연결 기준 PR #35](https://github.com/c7609chj8-dot/ai-education-hub/pull/35)
- [B-04 기준 PR #36](https://github.com/c7609chj8-dot/ai-education-hub/pull/36)
- [개발 DB 비교 Preview](https://ai-education-nomk5pe6r-time-6148.vercel.app/programs)
