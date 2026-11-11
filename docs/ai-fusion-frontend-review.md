# AI융합대학 프론트엔드 완성 검수 보고서

검수일: 2026-11-11. 기준 PR #37 `codex/ai-fusion-branding`.

## 결과

- 프론트엔드 변경 커밋: `0b7c211e1ace4ef348d27b2362c8e76325d8ebaf`.
- [검수한 시연 Preview](https://ai-education-h3ptwh65t-time-6148.vercel.app/)는 Vercel READY, Preview(target=null)이다. Production 승격은 하지 않았다.
- [PR #37](https://github.com/c7609chj8-dot/ai-education-hub/pull/37)은 Draft를 유지한다.
- 실제 Supabase 쓰기·A1/A2 실행·기존 강좌 삭제·main 병합은 하지 않았다. 관리자 인증·RPC·RLS·GRANT·B-04 소스는 변경하지 않았다.

## 개선 전후 및 화면별 결과

| 화면 | 개선 전 | 개선 후 및 검수 결과 |
|---|---|---|
| 메인 | 밝은 단색 배경, 사진 단독 배치 | 남색 그라데이션·흰 사진 프레임·미확정 안내. 정확한 슬로건과 6개 이미지 연결, 사진 End 키로 6번째 이동 확인 |
| 헤더·푸터 | 로고 상하 여백 부족, 푸터 정보 밀집 | 로고 주변 여백, 기관명·슬로건 배치. 원본 DEU_AI 이미지와 contain 유지. 모바일 메뉴 열기·Escape 닫기·초점 복귀 확인 |
| 학과 목록 | 카드의 ‘완성 결과물’ 표현 | ‘예상 결과물’로 정리, 카드 경계·초점·hover 개선. 음악 검색 및 음악·사운드 필터는 1개, 초기화는 6개 |
| 학과 상세 | 대표 이미지 없이 긴 본문, 세부 항목 바로가기 없음 | 카드와 같은 대표 이미지·AI 생성 예시 표시, 교육목표/주차/일정 앵커, 12주 과제 구분, PC 안내 카드 sticky |
| 교육일정 | 컨트롤과 달력의 구분 약함 | 흰 툴바·선택일 강조·선택 결과 읽기 안내. 달력/목록 전환과 11월→12월 이동 정상. 날짜·정원·모집 상태는 예시 표시 유지 |
| 신청 시연 | 하단 일반 오류 문구 | 상단 오류 요약·오류 필드 테두리·첫 오류 초점·모바일 전체 폭 확인 버튼·JS 안내. 빈 제출 3개 오류, 유효한 가상 입력 완료, 재시도 초점 및 입력 초기화 확인 |
| 기관소개·성과·공지·FAQ·문의·협력·자료실 | 제목 영역 배경 개별 구성 | 같은 제목 배경/경계 적용. 성과·공지·문의의 예시 표시 보존. FAQ 키보드 펼침, 문의 시연 완료 확인 |
| FAQ 내용 | 이전 5개 과정, 주 2시간·총 24시간 계획 문구 | 6개 학과·12주 검토용 초안·총 시간 미확정으로 수정. 실제 DB 콘텐츠는 변경하지 않음 |
| SEO·공유 | 제목·설명 중심 | OG/Twitter 브랜드·설명·제공 로고 추가. Preview 자신의 도메인으로 공유 이미지 주소 생성. 기존 PNG 파비콘 유지 및 HTTP 200 확인 |

## 데이터·주소 보호

- 새 6개 canonical slug 및 6개 고유 demo ID 변경 없음. 음악 `ai-music`, 광고영상 `ai-advertising-video` 기존 URL 유지.
- 기존 5개 과정 상세·신청 시연 주소 보존, 별칭 리디렉션 보존, 실제 UUID 신청 경로는 404.
- 6개 학과 각각 12주·실습 12개, 총 72개 검토용 초안 보존. 교육시간 null, 모집 일정 미확정 유지.
- 시연 폼에는 실제 저장 API·서버 액션을 추가하지 않았다. 가상의 이름/전화번호/이메일만 검수에 사용했다.
- GitHub 비교 결과 수정 범위는 공개 UI·시연 FAQ·검수 스크립트·문서뿐이다. `src/lib`·`supabase`·관리자 파일은 변경 없음.
- PR #35 HEAD `cd7f03a7f77e6344d1c61d367a4d34f85cc0d4d8`, PR #36 HEAD `10cdf991334b595a9b43c57b1c5b270d21945c56`, main `a33a0125c6572e8d0141ee16946b607ebc594067` 불변 확인.

## 시연 Preview와 DB 연결 Preview 비교

| 구분 | 현재 기대/관찰 결과 | 해석 |
|---|---|---|
| 이번 PR #37 시연 Preview | 새 6개 학과·72주차 초안·AI융합대학 | 검수 대상, 실제 모집/저장 아님 |
| [기존 읽기 전용 Supabase Preview](https://ai-education-nomk5pe6r-time-6148.vercel.app/programs) | 기존 5개 공개 과정 실제 화면 확인 | 현재 DB 공개 데이터의 정상 결과. 신규 6개가 안 나오는 것을 오류로 판단하지 않음 |
| 위 기존 Preview의 명칭 | 에이담 AI아카데미 | 이전 PR #35 코드의 별도 배포이므로 이번 PR #37의 브랜드 회귀로 판단하지 않음 |

이번에는 실제 DB 60주차·비공개 기수 1건을 SQL로 다시 집계하지 않았다. 해당 보존은 이전 DB 기준선이며, 이번 변경에서 DB 호출/쓰기·환경 설정 변경은 하지 않았다. Supabase 환경에서 새 6개를 강제로 합치는 코드도 추가하지 않았다.

## 실제 실행한 검사

| 검사 | 결과/범위 |
|---|---|
| TypeScript `tsc --noEmit` | 통과, 최종 Next 빌드의 TypeScript 검사도 통과 |
| ESLint | 최종 변경까지 통과 |
| `next build --webpack` | 최종 소스 통과 |
| Vercel Git Preview | READY, 동일 프론트엔드 커밋 확인, Production 아님 |
| `verify-ai-fusion-stage3.mjs` | 6학과·72주차/과제·이미지·ID·이전 URL 계약 및 격리 PGlite 모델 통과 |
| `verify-ai-fusion-stage3-http.mjs` | 최종 로컬 빌드에서 6개 상세/신청·12주차·이전 5개 제목·리디렉션·UUID 404·관리자 비인증 401 통과 |
| `verify-ai-fusion-frontend-http.mjs` | 10개 공개 페이지·브랜드·OG/Twitter·파비콘·FAQ 미확정 시간 검사 통과 |
| `verify-admin-auth-gates.mjs` | 가상 Auth/DB 권한 검증·회수·실패 시 차단 통과 |
| `verify-application-validation.mjs` | 서버 입력·중복/만료·모집 경계 조건 격리 테스트 통과 |
| `verify-application-submission.mjs` | 가상 제출·중복·불확실 응답 처리 격리 테스트 통과 |
| 반응형 지표 | 메인·목록·경영 상세·일정·신청·소개·성과·공지·FAQ·문의 × 1440/768/390/360 = 40조합, 실제 viewport 및 문서 폭 비교, 가로 넘침 없음 |
| 시각·입력 | 공통 화면과 모바일 커리큘럼·오류·완료 검수, Preview 메인 네 너비 로고/색상/사진 검수. Preview 검색 1개 결과·시연 완료·모바일 Escape 확인 |

검색 검수 중 개발 서버에서는 입력값과 결과가 일시적으로 불일치했다. 새로 시작한 최종 production-mode 로컬 빌드와 Vercel Preview에서는 동일 검색이 1개를 반환했다. 이 관찰만으로 검색 코드를 변경하지 않았다.

## 수정 파일

- `src/app/globals.css`, `src/app/page.tsx`, `src/app/layout.tsx`
- `src/components/course-card.tsx`, `src/components/layout/site-header.tsx`, `src/components/layout/site-footer.tsx`
- `src/app/programs/page.tsx`, `src/app/programs/[slug]/page.tsx`
- `src/app/schedule/page.tsx`, `src/app/schedule/schedule.tsx`
- `src/app/apply/[offeringId]/page.tsx`, `src/app/apply/[offeringId]/application-form.tsx`
- `src/app/about/page.tsx`, `src/app/outcomes/page.tsx`, `src/app/news/page.tsx`, `src/app/faq/page.tsx`, `src/app/contact/page.tsx`, `src/app/partnership/page.tsx`, `src/app/resources/page.tsx`（공통 제목 클래스만 변경）
- `src/data/mock/information.ts`
- `scripts/verify-ai-fusion-frontend-http.mjs`
- `docs/ai-fusion-frontend-plan.md`, 본 보고서

## 남은 제한 및 사용자 검수

- 교육목표·12주차·도구 후보는 초안이다. 교육시간·실제 모집·학위/학점/인가 정보는 확정하지 않았다.
- 실제 관리자 로그인 후 DB 등록/수정, 실제 B-04 동시 신청은 이번 검수에서 실행하지 않았다. 인증 격리 회귀 및 비인증 차단을 확인한 범위로 한정한다.
- DB 연결된 PR #37의 신규 상세 메타데이터/API 연동은 아직 보류다. 실제 신규 6개 공개 결과는 현재 검수 대상이 아니다.
- 데스크톱 Chrome 반응형 검수이며 실제 iOS/Android 기기·VoiceOver/NVDA 전체 조작은 미검증이다. 모든 색 조합의 자동 WCAG 감사까지 수행한 것은 아니다.
- Vercel 보호 설정을 유지했다. 접근 시 기존 Vercel 인증이 필요할 수 있다. 공유 플랫폼의 실제 캐시/미리보기 수집 결과는 별도 확인이 필요하다.
- 화면 캡처는 작업 폴더의 `프론트엔드 검수`에 있다. `preview-home-1440.png`, `preview-home-768.png`, `preview-home-390.png`, `preview-home-360.png`, `curriculum-360.png`, `apply-errors-360.png`, `apply-complete-360.png`, `layout-matrix.json`을 참조한다. 로컬 증거 파일은 GitHub에 업로드하지 않았다.
- 사용자 검수 순서: 메인 → 학과 검색 → 상세 초안/이미지 → 일정 예시 → 신청 시연 → FAQ/문의. 실제 모집으로 오인할 표현과 모바일 가독성을 우선 확인한다.

## 이후 백업·DB 연동 순서

1. 실제 개발 DB 백업 생성, SHA-256 무결성 및 데이터/스키마/권한 복구 검증. 전체 Auth·Storage·전역 역할 복구 미검증 한계는 계속 명시한다.
2. 대상 프로젝트 `uenvjqgylrevujdjpfed`, 5/60/1 기준선·충돌·보안·SQL 해시를 새 preflight로 재검사한다.
3. 필수 조건 충족과 승인 범위 재확인 후 A1/A2 비공개 등록만 진행한다. A2 실패 시 A1 잔존을 보고하고 임의 삭제하지 않는다.
4. 새 6개/72주차·상세 메타데이터의 읽기 API와 공개 정책을 별도 검토한다. 기존 5개/기수 UUID/신청 참조를 보존한다.
5. B/C 공개 전환은 별도 승인 후 진행한다. DB 연결 Preview 통합검수와 B-04 호환성 검증을 수행한다.
6. main 병합과 Production 배포는 최종 별도 승인 후 진행한다. 현재 DB/운영 전환 승인을 요청하거나 실행할 준비가 완료된 상태로 간주하지 않는다.

## 근거

- [PR #37](https://github.com/c7609chj8-dot/ai-education-hub/pull/37)
- [이번 프론트엔드 변경 비교](https://github.com/c7609chj8-dot/ai-education-hub/compare/fb11db9a2eb88a0579125066e96f0e4684278586...0b7c211e1ace4ef348d27b2362c8e76325d8ebaf)
- [검수 Preview](https://ai-education-h3ptwh65t-time-6148.vercel.app/)
- 기존 작업계획 `docs/ai-fusion-frontend-plan.md`, DB 보류 보고 `docs/ai-fusion-stage5-preflight-hold.md`
