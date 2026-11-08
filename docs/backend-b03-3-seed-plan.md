# B-03-3: 개발용 공개 강좌 데이터 등록 준비

대상: `ai-education-hub-dev` / `uenvjqgylrevujdjpfed`. 2026-11-08 읽기 전용 점검. **예시 데이터는 등록하지 않았으며 별도 승인이 필요하다.**

## 실제 DB 상태

마이그레이션 이력은 `20261107100302_academy_course_foundation`, `20261108064422_restrict_rls_auto_enable_execute`, `20261108105949_public_course_catalog` 세 건이다. 마지막 버전과 Git 파일명이 일치한다. 기록된 SQL은 11개 statement 배열로 저장돼 파일과 바이트 해시가 다르다. 주석·공백·세미콜론을 제외하고 이어 붙인 단순 텍스트 비교는 일치했다. 바이트 단위 일치나 그 비교만으로 SQL 의미의 완전한 동등성을 주장하지 않는다.

`academy.courses`, `academy.course_weeks`는 각각 0건이고 두 테이블의 RLS가 활성화돼 있다. `courses.objectives` 및 `courses_select_published`, `course_weeks_select_published`를 확인했다. 두 정책은 `anon`과 `authenticated`의 공개 강좌 및 그 주차 SELECT에 한정된다. `public.published_courses`, `public.published_course_weeks`의 `security_invoker=true` 및 공개 강좌 조건을 확인했다.

두 역할의 강좌 SELECT 허용 열은 `id`, `slug`, `title`, `category`, `summary`, `audience`, `result_artifact`, `duration_hours`, `objectives`, `publication_state`이고, 주차는 `course_id`, `week_number`, `title`이다. 두 기초 테이블에 대한 INSERT·UPDATE·DELETE 테이블 권한은 없다. 두 공개 뷰는 두 역할에 SELECT만 있고, `service_role`에는 뷰 권한이 없다. 이는 카탈로그 조회이며 실제 인증 JWT를 이용한 검사는 아니다.

실제 `anon` Data API GET에서 두 공개 뷰는 각각 HTTP 200과 `[]`를 반환했다. `published_courses`에 없는 `created_at` 열 요청은 HTTP 400 / `42703`이었다. 실제 공개 데이터가 없으므로 공개 행 조회 및 비공개 행 차단은 아직 증명되지 않았다. 실제 authenticated JWT와 API 쓰기 차단도 미검증이다. 일시적으로 사용한 공개용 키 파일은 검사 직후 삭제했다.

Security Advisor는 `academy.offerings`의 정책 없는 RLS INFO 1건을 반환했다. `public.rls_auto_enable()`의 과거 경고 2건은 반환되지 않았다. [권고 내용](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)

## 검토한 등록 SQL

기존 `supabase/drafts/day08_dev_examples.sql`은 별도 스키마 마이그레이션이 아닌 개발 전용 seed다. 파일 바이트 SHA-256은 `34cc49b35b335cfe2c8d5b62c2770d145391b0d0c0095708f14e7c95d7a3155c`, UTF-8에서 CRLF→LF 및 양끝 공백 제거 후 SHA-256은 `3b847d7ffa324f84ffa57d9df68f3c076192a2791f416e21f210f1a7aa23bb76`이며 기존 검증본과 정규화 해시가 같다.

대상은 `life-chatgpt`, `ai-work`, `ai-ebook`, `ai-instructor`, `ai-business` 5개 강좌와 강좌별 1~12주, 총 60주다. 개인정보는 포함하지 않는다. 모두 `published`이므로 등록 후 개발 프로젝트 공개 API에서 가상 내용이 조회된다.

SQL은 `BEGIN`, 두 테이블에 대한 `SHARE ROW EXCLUSIVE` 잠금, 잠금 후 두 테이블의 빈 상태 확인 및 비어 있지 않을 때 예외, 5개 강좌와 60개 주차 INSERT, `COMMIT` 순서다. 기존 데이터가 하나라도 있거나 SQL 해시가 바뀌면 실행하지 않는다. 잠금과 빈 상태 검사는 동일 DB 세션 및 동일 트랜잭션 안에서 실행돼야 한다. 이전 PostgreSQL 17.11 격리 테스트에서는 동시 실행 두 건 중 하나만 성공하고 나머지가 빈 테이블 검사에서 중단됐다.

## 승인 후 실행·복구 계획

1. 사용자 승인 후에도 대상 프로젝트 ID·SQL 해시·두 테이블의 빈 상태·제약조건·역할·RLS를 다시 확인한다. 세 마이그레이션은 재실행하지 않는다.
2. 세션 풀러를 통한 검증된 **단일 DB 세션**에서 seed 파일 전체를 한 번 실행한다. CLI 3.0.0은 `db query --remote=<비밀번호 없는 세션 풀러 URL> --file supabase/drafts/day08_dev_examples.sql`을 지원하며 공개 소스는 URL 대상에서 dedicated connection의 `queryRaw(sql)`을 사용한다. 그러나 이 PC에서 해당 실행 경로의 seed 파일 처리·실패 롤백을 격리 DB로 아직 재시험하지 못했고, `psql`과 풀러 자격 증명도 현재 작업 환경에 확인되지 않았다. 실제 실행 전 해당 경로 검증과 보안 자격 증명 준비가 필요하다. MCP 정식 스키마 migration이나 `db push`로 seed를 실행하지 않는다. [CLI 소스](https://github.com/supabase/cli/blob/v3.0.0/apps/cli/src/commands/db/query/query.handler.ts)
3. 성공 응답 후 실제 DB에서 강좌 총 5개, 각 slug별 주차 수 12개와 주차 번호 1~12를 확인한다. 개발 Data API 공개 조회, 허용 열 및 실제 익명·일반 인증 사용자 경로를 확인하고 미준비 항목은 미검증으로 기록한다. 비공개 행 테스트에는 별도 가상 비공개 행과 정리 계획에 대한 승인이 필요하다.
4. 오류·연결 끊김·결과 불명 시 추가 변경과 재실행을 중단하고, 별도 읽기 전용 연결로 세션 상태·실제 행·이력을 확인한다. 커밋 여부가 불명확하면 성공이나 롤백을 추정하지 않는다. 부분 데이터 삭제·복구는 영향과 범위를 검토해 별도 승인 후 진행한다.

운영 DB·다른 프로젝트·main·운영 배포는 변경하지 않았다.
