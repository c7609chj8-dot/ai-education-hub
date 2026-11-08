# B-03-3: 개발용 강좌 데이터 등록 결과

2026-11-08 사용자가 승인한 개발 프로젝트 `ai-education-hub-dev` / `uenvjqgylrevujdjpfed`에 가상 강좌 데이터를 등록했다. 운영 프로젝트와 다른 Supabase 프로젝트는 사용하지 않았다. 실제 개인정보는 포함하지 않는다.

## 실행 및 원자성

- 실행 직전 프로젝트 상태 `ACTIVE_HEALTHY`, 마이그레이션 이력 3건, 강좌·주차 각 0건을 재확인했다. 기존 마이그레이션을 실행하지 않았다.
- 원본 `supabase/drafts/day08_dev_examples.sql`의 정규화 SHA-256은 승인된 `3b847d7ffa324f84ffa57d9df68f3c076192a2791f416e21f210f1a7aa23bb76`이었다.
- 실행기는 Supabase MCP `execute_sql`이다. 원본 파일의 명시적 `BEGIN`/`COMMIT` 대신, **기존 잠금·빈 테이블 검사·강좌 INSERT·주차 INSERT 네 문장 내용은 그대로** 단일 PostgreSQL `DO` 문 안에서 순서대로 실행했다. 끝에 5강좌·60주·강좌별 1~12주 조건을 추가하여 불일치하면 예외로 전체 문장이 실패하도록 했다. 원본 파일은 바꾸지 않았다. 단일 문장을 사용하므로 여러 SQL 문장에 걸친 MCP 트랜잭션 처리를 가정하지 않는다. 전달한 래퍼 SQL SHA-256: `90557269092753f4f74f237c7d019b01e9c14c3f3dffd6fbecb9ee5768eb05c2`. [PostgreSQL DO](https://www.postgresql.org/docs/17/sql-do.html)
- `node scripts/verify-dev-seed-atomic.mjs`로 격리 PGlite에서 같은 래퍼의 정상 5·60 등록, 강좌 INSERT 직후 강제 오류 시 두 테이블 모두 0건으로 롤백, 중복 실행 거부를 확인했다. 실제 개발 DB에서 강제 오류나 중복 등록 시험은 실행하지 않았다. 사용자 승인에 따라 래퍼를 실제 개발 DB에 한 번만 제출했고 MCP는 오류 없이 반환했다.

## 등록 후 실제 DB와 API 검증

| 검사 | 결과 |
| --- | --- |
| 실제 SQL 건수 | 공개 강좌 5건, 주차 60건. 각 강좌 12건, 주차 번호 1~12 및 중복 없는 번호 확인 |
| 등록 대상 slug | `life-chatgpt`, `ai-work`, `ai-ebook`, `ai-instructor`, `ai-business` |
| 익명 공개 GET | `published_courses` HTTP 200 / 5건, `published_course_weeks` HTTP 200 / 60건 |
| 뷰에 없는 열 | 강좌 뷰 `publication_state` 요청은 HTTP 400 / SQLSTATE `42703` |
| 익명 강좌 뷰 쓰기 | POST, 없는 UUID 대상 PATCH·DELETE가 각 HTTP 401 / SQLSTATE `42501`로 거부 |
| 익명 주차 뷰 쓰기 | POST, 없는 course UUID 대상 PATCH·DELETE가 각 HTTP 500 / SQLSTATE `55000` 반환. 쓰기는 성공하지 않았으나 권한 거부 응답으로 판정하지 않는다. 카탈로그에서 주차 뷰는 자동 변경 불가, 익명 쓰기 권한도 없음이 확인됐다. 500 응답 원인은 별도 조사 필요 |
| 쓰기 요청 후 DB | 강좌 5건과 주차 60건 유지. 쓰기 검사는 NOT NULL 조건을 위반하는 빈 POST 또는 존재하지 않는 UUID만 사용 |
| DB ACL | `anon`·`authenticated` 모두 두 기초 테이블 및 두 뷰의 INSERT·UPDATE·DELETE 테이블 권한과 INSERT·UPDATE 열 권한 없음 |
| Security Advisor | `academy.offerings`의 정책 없는 RLS INFO 1건. 이전 `public.rls_auto_enable()` 경고 2건은 반환되지 않음. [Advisor 설명](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) |

실제 비공개 강좌 행에 대한 API 차단은 **미검증**이다. 사용자 승인 범위가 공개 가상 강좌 5개·60주로 한정돼 별도의 비공개 시험 행을 만들지 않았다. 실제 일반 사용자 JWT·관리자 로그인 및 인증 사용자 Data API 요청도 미검증이다. 카탈로그 권한 확인 또는 격리 테스트로 실제 JWT/API 결과를 대체하지 않는다.

예시 데이터는 모두 공개 상태여서 개발 프로젝트의 공개 API에 노출된다. 운영 정보로 사용하려면 별도 콘텐츠 검수와 승인된 운영 전환 절차가 필요하다. main 병합과 Production 배포는 하지 않았다.
