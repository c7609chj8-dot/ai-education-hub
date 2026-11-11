# 통합 B단계: 개발 DB와 SQL 초안 분석 및 적용 계획

점검일: 2026년 11월 8일 (한국 시간)

기준: `codex/integration-stage-a` 커밋 `ae1562cc286b9847e66ce7161af18a11cd54759d`, PR #24
대상: `ai-education-hub-dev` / `uenvjqgylrevujdjpfed`
상태: **읽기 전용 분석과 계획. 실제 DB 변경은 승인되지 않았으며 실행하지 않았다.**

## 1. 결론과 점검 범위

- 개발 DB에는 기초 강좌·주차·기수 세 테이블과 기초/보안 마이그레이션 두 건만 확인됐다. 강좌·주차·기수의 현재 행 수는 각각 0이다. 8~19일차의 기능 SQL과 3개 예시 데이터 SQL은 정식 이력에 없다.
- 공개 조회, 관리자 관리, 신청·문의, 콘텐츠·파일·이력은 코드와 SQL 초안이 있으나 필요한 객체·권한 및 실제 API 검증이 미완료다. 개인정보·관리자 계정·Storage 파일은 이번에 조회하거나 출력하지 않았다.
- 특히 **기수 관리 화면·10일차/12일차 저장 함수에는 모집 시작·종료 시각을 설정하는 입력이 없지만, 신청 함수는 이 시각이 둘 다 있어야 접수를 허용한다.** 9일차 시연 일정 seed도 두 시각을 넣지 않는다. 그대로 적용하면 관리자나 예시 데이터로 만든 기수가 `open`이어도 실제 신청은 `unavailable`일 수 있다. 모집 시간·시간대·경계 정책을 정하고 관리자/API/SQL을 함께 보완·검증해야 한다.
- 실제 DB 적용 여부는 **현재 불가: 별도 승인 전이며 SQL 정식화·실제 역할/API 검증·백업과 복구 계획이 필요**하다. 단계 번호는 검토·승인 묶음이지 한 번에 전부 적용하라는 뜻이 아니다.
- 이번 점검은 `academy`와 앱 관련 `public.published_*`·`public.academy_*`, 관련 `public.rls_auto_enable()` 및 대상 Storage 버킷을 중심으로 카탈로그를 조회했다. Supabase 관리 스키마 전체나 모든 외부 동적 의존성을 완전 조사한 것은 아니다.

## 2. 실제 개발 DB 현황

### 2.1 이력과 보안 PR

| 실제 버전·이름 | DB 상태 | A단계 Git 상태 |
| --- | --- | --- |
| `20261107100302_academy_course_foundation` | 적용 기록 확인 | 같은 버전 파일 1개 |
| `20261108064422_restrict_rls_auto_enable_execute` | 적용 기록 확인 | 같은 버전 파일 1개. PR #23 커밋 `7a6a6e5366dc2a35d3a1304a53bce47e45b87cb9`은 기준 커밋의 조상 |

두 Git 파일과 DB에 기록된 SQL은 줄바꿈을 LF로 바꾸고 양끝 공백을 제거한 SHA-256이 각각 일치했다. 기초 SQL은 `08c8a4359cf523fd0e2d1572be811f5770421ac69036e81da5ff4d9e8d106665`, 보안 SQL은 `2ba591b2767c43a32731c8b74b5ffaa07c47a41d096eee6fb3672aad9278c49d`이다. **원본 바이트 일치 검증은 아니다. 이미 적용된 두 파일은 재실행하지 않는다.** 별도 원본 작업 공간에는 실제 버전과 다른 미추적 `20261107133122_restrict_rls_auto_enable_execute.sql`이 남아 있으나 이 브랜치에는 포함되지 않았다. 삭제·커밋·적용하지 않는다.

### 2.2 테이블·열·제약조건·인덱스

| 테이블 | 현재 열 | 주요 제약조건과 인덱스 |
| --- | --- | --- |
| `academy.courses` | `id`, `slug`, `title`, `category`, `summary`, `audience`, `result_artifact`, `duration_hours`, `publication_state`, `created_at` | PK `courses_pkey`, slug UNIQUE `courses_slug_key`; slug 형식·필수 문자열·양수 시간·상태 CHECK. `objectives`는 아직 없음 |
| `academy.course_weeks` | `id`, `course_id`, `week_number`, `title` | PK `course_weeks_pkey`, `course_id` FK `ON DELETE RESTRICT`, `(course_id,week_number)` UNIQUE, 주차 양수·제목 CHECK |
| `academy.offerings` | `id`, `course_id`, `start_date`, `end_date`, `enrollment_opens_at`, `enrollment_closes_at`, `location`, `capacity`, `status`, `created_at` | PK `offerings_pkey`, `course_id` FK `ON DELETE RESTRICT`, 인덱스 `offerings_course_id_idx`, 정원·날짜 순서·모집 시간·상태 CHECK. `is_public`은 아직 없음 |

각 PK/UNIQUE 인덱스를 포함해 확인된 인덱스는 총 6개다. 모든 확인된 CHECK/FK/PK/UNIQUE 제약은 `convalidated=true`다. 세 테이블은 RLS 활성·FORCE RLS 비활성이고 소유자는 `postgres`, ACL은 `{postgres=arwdDxtm/postgres}`이다. 세 테이블에 사용자 정의 행 트리거는 없었다. FK 구현에 필요한 PostgreSQL 내부 트리거는 이 행 트리거 목록에서 제외했다.

확인된 제약 이름은 다음과 같다. 인덱스는 각 `*_pkey` 3개, `courses_slug_key`, `course_weeks_course_id_week_number_key`, `offerings_course_id_idx`이다.

- `courses`: `courses_pkey`, `courses_slug_key`, `courses_slug_check`, `courses_title_check`, `courses_category_check`, `courses_summary_check`, `courses_audience_check`, `courses_result_artifact_check`, `courses_duration_hours_check`, `courses_publication_state_check`.
- `course_weeks`: `course_weeks_pkey`, `course_weeks_course_id_fkey`, `course_weeks_course_id_week_number_key`, `course_weeks_title_check`, `course_weeks_week_number_check`.
- `offerings`: `offerings_pkey`, `offerings_course_id_fkey`, `offerings_capacity_check`, `offerings_check`(교육일 순서), `offerings_check1`(모집 시각 순서), `offerings_status_check`.

### 2.3 함수·뷰·트리거·정책·GRANT

- 조회 범위에서 `academy`에는 위 3개 외 앱 테이블·뷰·함수가 없고, `public.academy_*` 함수와 `public.published_*` 관계 객체도 없었다. Supabase 관리용 `public`의 모든 객체가 없다는 뜻은 아니다.
- `public.rls_auto_enable()`은 `postgres` 소유 `SECURITY DEFINER` 이벤트 트리거 함수이고 ACL은 `{postgres=X/postgres}`다. `anon`, `authenticated`, `service_role`, `authenticator`의 EXECUTE는 모두 false다. `ensure_rls`는 활성 `ddl_command_end` 트리거로 CREATE TABLE/CTAS/SELECT INTO에 연결된다. 함수는 `public` 생성 테이블을 대상으로 하므로 **`academy`의 신규 테이블 RLS는 각 SQL에서 명시적으로 활성화해야 한다**. `extensions.pgrst_ddl_watch()`도 관련 DDL을 감시한다.
- `academy`의 정책은 현재 0개다. `anon`, `authenticated`, `service_role`은 이 스키마의 USAGE/CREATE, 세 테이블의 SELECT/INSERT/UPDATE/DELETE 및 열 수준 SELECT/INSERT/UPDATE가 모두 false로 조회됐다. 세 역할은 `public` 스키마 USAGE는 있고 CREATE는 없다. `service_role`은 `BYPASSRLS=true`이므로 향후 객체 권한을 부여하면 RLS만으로 제한되는 역할이 아니다.
- Security Advisor에는 `rls_auto_enable()` 관련 WARN이 현재 없고 RLS 정책 없음 INFO 3건이 있다. INFO만으로 노출·안전을 단정하지 않는다. `academy-assets`라는 Storage 버킷은 조회되지 않았고, `storage.objects` 정책 중 해당 이름을 **문자열로 직접 언급한** 정책도 조회되지 않았다. 일반화된 정책이나 다른 버킷의 안전성까지 입증한 것은 아니다.
- 실제 개발 API의 공개 키 GET에서 `published_courses`, `published_course_weeks`, `published_offerings`, `published_contents`, `published_assets`, `published_brand_settings`는 각각 404 `PGRST205`; `Accept-Profile: academy`의 강좌 조회는 406 `PGRST106`이었다. 응답 본문·키는 기록하지 않았다. 이는 공개 뷰 부재와 비노출 스키마의 현재 관찰이며 실제 로그인·전체 권한 검증을 대신하지 않는다.

## 3. SQL 전체 목록과 분류

`supabase/drafts`에는 아래 17개 파일이 있다. 11개 기능 SQL과 3개 예시 SQL은 **원격 미적용 초안**, 2개 검사용 SQL과 1개 기초 원본은 실제 마이그레이션으로 다시 실행하지 않는다.

| 파일 | 종류·의도 | 의존·주의 |
| --- | --- | --- |
| `course_foundation.sql` | 기초 스키마 원본 초안 | 기초 버전은 이미 적용. 재실행 시 기존 schema/table/index와 충돌 |
| `course_foundation_check.sql` | 가상 데이터·제약 검사용 | 일회용 DB 전용. 원격에서 실행하지 않음 |
| `day05_access_check.sql` | 임시 GRANT·RLS/역할 검사용 | 일회용 DB 전용. 전체 테이블 GRANT가 있으므로 원격 실행 금지 |
| `day08_public_courses.sql` | `courses.objectives`, 강좌·주차 공개 정책 2개, `published_courses`, `published_course_weeks`, 열 GRANT | 기초 선행; 공개 스키마 USAGE·뷰 노출과 열 권한 재검토 |
| `day08_dev_examples.sql` | 가상 강좌 5개·주차 60개 seed | day08 구조 선행, 두 테이블 비어 있어야 함; 운영 데이터 아님 |
| `day09_public_offerings.sql` | `offerings.is_public`, 공개 정책, `published_offerings`, 열 GRANT | day08 선행; 공개 강좌에 속한 비-draft 기수만 노출 |
| `day09_dev_offerings.sql` | 가상 일정 5개 seed | day08 예시·day09 선행, 기수 비어 있어야 함. 모집 시작/종료 시각은 없음 |
| `day10_admin_management.sql` | `academy_admin_catalog`, `academy_admin_save_course`, `academy_admin_save_offering` 및 서비스 역할 권한 | day08/09 선행. 인증·ID 허용목록 자체를 만드는 SQL은 아님 |
| `day11_application_data.sql` | `applications`, `application_private`, 신청 인덱스·RLS·권한 회수 | 기수 기초 선행. 개인정보·안내/보존 정책 결정 필요 |
| `day12_atomic_applications.sql` | 요청 ID·중복/복합 FK·열 권한, `academy_submit_application`, `academy_admin_save_offering` 교체 | day08~11 선행. 신청 테이블이 비어 있어야 NOT NULL 추가 가능; 잠금·정원·모집 시간 확인 |
| `day14_admin_applications.sql` | 신청 상태 CHECK 교체, `application_status_events`, 인덱스, 검색·확인 함수 | day11/12 선행; `received`→`reviewed`, 두 상태 모두 정원 차지 |
| `day15_inquiries.sql` | `inquiries`, `inquiry_private`, `inquiry_events`, 인덱스, 제출·검색·열람·상태 전환 함수 | 연락처·문의 본문·처리 이력; 개인정보 정책 및 서버 인증 선행 |
| `day16_content_management.sql` | `contents`, `content_events`, `published_contents`, 정책·인덱스·관리자 목록/저장 함수 | 공개 콘텐츠 GRANT/RLS·관리자 서버 검증 필요 |
| `day16_dev_content_examples.sql` | 가상 공지·FAQ·협력 14건 seed | day16 선행, 콘텐츠 테이블이 비어 있어야 함; 운영 콘텐츠 아님 |
| `day17_assets.sql` | `assets`, `asset_events`, `published_assets`, 공개 정책·4개 관리/조회 함수 | 비공개 `academy-assets` 버킷은 SQL이 만들지 않음. Storage 정책·파일 검사 별도 |
| `day18_brand.sql` | `brand_settings`, `brand_events`, `published_brand_settings`, 공개 정책·조회/저장 함수 | 실제 연락처·주소·담당자 미정. 데이터 공개는 기관 승인 필요 |
| `day19_activity.sql` | 5개 이력 인덱스, `audit_log_reads`, `academy_admin_read_activity` | 14·15·16·17·18의 이력 테이블 모두 선행. 고권한 키의 감사 위조 및 이력 공백은 별도 위험 |

정식 `supabase/migrations`의 두 파일은 위 이력에 이미 반영돼 있다. 함수 정의 사본 `scripts/fixtures/rls_auto_enable.postgres17.sql.txt`는 격리 테스트용 텍스트이며 실행 마이그레이션이 아니다.

## 4. 의존 관계와 주요 충돌

```text
기초(기적용) ─ day08 공개 강좌 ─ day09 공개 기수 ─ day10 관리자 기수 저장
                   │                  │                      │
                   └ day08 예시       └ day09 예시          └ day11 → day12 → day14
day15 문의 ──────────────────────────────────────────────────────┐
day16 콘텐츠 ─ day16 예시 ──────────────────────────────────────┤
day17 자료/Storage(별도) ───────────────────────────────────────┤→ day19 이력
day18 브랜드 ───────────────────────────────────────────────────┘
보안 권한(기적용)은 위 SQL에 재실행하지 않음; 관리자 인증은 앱·Auth 별도 검증
```

1. **기초 재생성·중복:** 기존 `academy`/세 테이블에 기초 초안을 다시 실행하면 `42P06`/`42P07` 등의 충돌이 날 수 있다. day08의 `objectives`와 day09의 `is_public`은 현재 없지만 `ADD COLUMN`은 반복 실행에 안전하지 않다. 적용 직전 다시 검사한다.
2. **기수 함수 교체 순서:** day10은 `academy_admin_save_offering`을 `CREATE`, day12는 같은 서명에 `CREATE OR REPLACE`로 정원 방어를 추가한다. 순서를 바꾸면 생성 충돌 또는 기능 후퇴 위험이 있다. 최종 함수 정의와 ACL을 전후 검증한다.
3. **기존 행과 NOT NULL:** day12는 두 신규 열을 기본값 없이 `NOT NULL`로 추가한다. 현재 신청 테이블은 없지만, 추후 day11 적용 후 데이터가 들어가면 실패 가능성이 있다. 신청 쓰기 비활성 상태와 빈 테이블을 적용 직전 확인하고 실제 행에 대한 임의 보정은 금지한다.
4. **상태 제약과 감사 선행:** day14는 day11의 이름이 지정되지 않은 CHECK가 생성한 `applications_status_check`를 제거·교체한다. 실제 제약명·정의가 다르면 중단한다. day19는 다섯 이력 테이블 전체가 없으면 실패한다.
5. **모집 시각 누락:** day10/day12의 관리자 함수 서명과 관리자 UI에는 모집 시작·종료 입력이 없고 day09 예시 seed도 이 값을 넣지 않는다. day12의 신청 함수는 NULL·역전·기간 밖을 모두 거부한다. 실제 등록·시간대·DST·시작 포함/종료 제외 기준을 확정하고 [실행 금지 수정 검토안](../supabase/drafts/enrollment_window_change_review.md)의 계약·회귀 검증을 별도로 검토한다.
6. **예시 재실행·데이터:** day08/09/16 seed는 해당 테이블이 비어 있지 않으면 예외를 내도록 설계돼 있다. 반복해도 성공하는 멱등 seed가 아니다. 실제 강좌 정보와 예시를 같은 DB에 임의 혼합하거나 운영으로 복사하지 않는다.
7. **공개·고권한 범위:** day08/09/16/17/18은 `academy` USAGE, 특정 열 SELECT, RLS 및 `security_invoker` 뷰 GRANT를 추가한다. `academy`가 Data API에 노출되면 뷰뿐 아니라 기초 테이블의 **허용 열과 정책**도 직접 접근 경로가 될 수 있다. 새 함수의 기본 PUBLIC EXECUTE와 REVOKE 사이의 노출을 피하도록 승인된 정식 마이그레이션의 원자적 실행 여부를 검증한다. 기본 권한 전체 변경은 금지한다.
8. **중복 신청·취소:** day12는 이름 양끝 공백과 연락처 구분 기호를 정리하고 `(offering_id, applicant_name, contact)`로 중복을 막는다. `+82`/국내번호 동등 처리, 취소·반려·자리 복구·재신청은 확정되지 않았다. 현재 요청 ID 재시도 및 정원은 트랜잭션 잠금에 의존한다.
9. **60주 시연과 주차 관리:** 현재 `week_number > 0` 및 강좌별 주차 중복 금지만 DB에서 강제하며, 강좌별 정확히 12주를 강제하지 않는다. day10 관리자 함수에는 주차 등록·수정 함수도 없다. 5개 강좌·60주는 개발용 seed의 결과이고 실제 운영 강좌의 주차 편집·검증 기준은 별도 확정해야 한다.

## 5. 개인정보·권한 위험 분류

| 우선도 | 대상·위험 | 대응 및 미확정 사항 |
| --- | --- | --- |
| 매우 높음 | `application_private`의 이름·연락처, `inquiry_private`의 이름·이메일·본문 | 실제 수집 목적·안내/동의·보존·열람·삭제·백업 처리와 담당자 승인 선행. 개발 검증은 가상 데이터만 사용, 로그·PR·URL에 값 금지 |
| 매우 높음 | `service_role` secret key는 프로젝트 전반 고권한이며 BYPASSRLS | 서버 전용 보관·회전·접근 통제, 매 요청 `getUser`/ID 허용목록·feature gate, RPC 실행권·직접 테이블 경로 각각 검사. `SECURITY INVOKER`나 열 GRANT만으로 키 자체가 최소 권한이 되는 것은 아님 |
| 높음 | `p_actor`/`p_actor_id`는 서버가 넣어야 할 관리자 ID | 클라이언트 입력 ID 신뢰 금지; 일반 인증 사용자의 RPC 직접 호출과 위조 시도 차단. 실제 계정·세션 검증 미실시 |
| 높음 | 콘텐츠/자료/브랜드의 공개 여부와 Storage 객체 | 비공개 기본값, 부모·공개 열·뷰 및 직접 접근 차단, private bucket과 서명·파일 검증. 확장 일반 Storage 정책과 악성 파일 검사는 미검증 |
| 높음 | 이력의 담당자·대상 ID도 결합 시 개인정보가 될 수 있음 | 접근·보존 범위와 별도 보호 결정. 강좌/기수 변경·목록 검색·로그인·직접 서비스 키 사용 등은 19일차 이력에 빠져 있고 변조 방지 감사 저장소가 아님 |
| 높음 | 삭제·취소·백업 복원 | 자동 삭제 없이 관리자 검토·수동 절차가 선행 결정. 실제 삭제 기능, 취소 후 자리 복구 및 재신청 기준은 미확정 |

Supabase의 API 스키마 노출과 SQL GRANT, RLS는 별도 경계다. 뷰 권한과 기반 테이블의 열 권한·행 정책, 함수 EXECUTE 및 서비스 역할의 우회 성격을 각각 시험해야 한다. [API 보안 안내](https://supabase.com/docs/guides/api/securing-your-api), [RLS 안내](https://supabase.com/docs/guides/database/postgres/row-level-security)

## 6. 6개 적용 묶음의 계획

아래 모든 묶음의 공통 원칙: 적용 직전 프로젝트 ID·이력·객체/데이터 존재·대상 SQL·영향·백업/복원·승인자를 재확인한다. **실제 개발 DB에 대한 실행은 묶음별 SQL과 시점을 제시해 별도 승인받은 후에만** 한다. 저장소 초안의 파일명은 정식 버전이 아니며 실제 적용 전 Supabase 공식 마이그레이션 이력과 Git 파일을 일치시키는 방법을 검토한다. 예전 CLI 직접 연결은 `DbConfigIpv6Error`였으므로 반복하지 않는다. Supabase MCP를 우선하고 실행기/트랜잭션 지원을 확인한다.

### 1차 — 공개 강좌 5개·60주

- **SQL·객체:** `day08_public_courses.sql`: `courses.objectives`, 공개 강좌/주차 정책, `published_courses`, `published_course_weeks`, 해당 열 GRANT. `day08_dev_examples.sql`은 별도 개발용 데이터 선택지다.
- **선행·위험:** 기초 2개 테이블과 기존 4일차 이력 선행. 스키마 USAGE와 테이블 열 GRANT가 공개 경로를 확대할 수 있다. 뷰·열·정책 중복과 예시 테이블 공백 여부를 재확인한다.
- **검증:** 격리 DB에서 공개/비공개 강좌 및 주차·허용 열·금지 열·INSERT/UPDATE/DELETE를 `anon`/`authenticated`로 확인. 승인 후 실제 개발 Data API에서도 뷰와 `academy` 직접 경로의 노출/비노출을 각각 검사한다. 5개/60주는 시연임을 표시하고 실제 기관 정보로 간주하지 않으며 실제 주차 관리 기능·수량 기준을 별도 검토한다.
- **실패·완료:** 실패 시 이후 묶음과 사용자 공개 전환을 중단하고 이력·트랜잭션 적용 여부를 조사한다. 부분 적용의 역변경·복원은 별도 검토/승인한다. 완료는 승인된 이력과 실제 정책·API·가상 데이터 결과 일치이며, 빈 결과도 정상적으로 구별한다.

### 2차 — 기수·일정·모집 상태

- **SQL·객체:** `day09_public_offerings.sql`: `offerings.is_public`, 정책·`published_offerings`·열 GRANT. `day09_dev_offerings.sql`은 조건부 가상 일정 5개를 별도로 넣는 초안이다.
- **선행·위험:** 1차의 강좌 정책·열 필요. 부모 강좌 미공개, 일정 비공개·draft 차단과 모집 상태 표시를 분리한다. 예시 일정의 `open`은 접수 가능을 증명하지 않고 모집 시각 누락 문제를 해결하지 않는다.
- **검증:** 공개/비공개·draft·부모 강좌 변경·기간 미정·상태, 허용/금지 열과 직접 쓰기 차단을 격리 및 승인된 개발 API에서 각각 확인한다. 예시는 정확한 5건·가상 표기와 운영 분리를 확인한다.
- **실패·완료:** 부분 적용·뷰 누락·기존 데이터 충돌 시 다음 단계 중단. 완료는 정책/실제 공개 API와 관리자가 지정한 공개 여부가 일치하고, 실제 모집 기능은 준비 전 비활성인 상태다.

### 3차 — 관리자 인증·권한 관리

- **SQL·객체:** `day10_admin_management.sql`의 카탈로그·강좌/기수 저장 함수 3개와 service_role 열/EXECUTE GRANT. 관리자 인증 자체는 `src/lib/supabase/verified-user.ts`, `src/lib/admin/access.ts`, 관리자 서버 코드와 Supabase Auth 설정으로 처리하며 별도의 관리자 테이블 SQL은 이 초안에 없다.
- **선행·위험:** 1·2차 구조 선행. 실제 개발 관리자 계정·ID 허용목록·서버 비밀 키·접근 복구 정책은 별도 준비한다. 고권한 키는 RLS를 우회할 수 있다. 비밀값은 출력·Git 기록 금지.
- **검증:** 실제 개발 테스트 계정의 로그인·로그아웃·만료·권한 회수, 비관리자·무세션의 페이지/서버 액션/RPC 거부 및 서비스 역할의 승인된 함수만 호출하는 경로를 확인한다. 앱 인가와 SQL GRANT를 독립적으로 시험한다.
- **실패·완료:** 관리자 잠금·권한 불일치·키 노출 의심 시 호출 중지, 대상과 기존 권한 확인 후 별도 승인된 복구. 완료는 관리자/일반 사용자별 실제 요청 결과·운영자 지급/회수 절차 기록이다. 실제 계정 검증은 현재 미실시다.

### 4차 — 수강신청·정원·중복 방지

- **SQL·객체:** day11 신청/개인정보 테이블 → day12 요청 ID·복합 FK·중복 UNIQUE·신청 함수·관리자 기수 함수 교체 → day14 `received`/`reviewed`, 신청 처리 이력·검색/확인 함수.
- **선행·위험:** 1~3차 선행, day12 시 신청 테이블이 비어야 한다. 동시 마지막 자리, 이름/연락처 정규화, 요청 ID 재전송, 취소 후 자리 복구, 개인정보 보존·삭제와 모집 시각 문제는 각각 다르다. 현재 공개 신청 라우트/실제 저장 어댑터는 연결되지 않았다.
- **검증:** 먼저 가상 데이터의 격리 두 세션에서 잠금 순서·정원 경합·같은 요청/다른 내용·중복·응답 유실·이력 롤백·정원 축소를 검증하고, 별도 승인된 개발 실제 API에서 재시험한다. 데이터·권한은 열/행·익명/일반/관리자로 검증하고 개인정보를 결과·로그에 싣지 않는다.
- **실패·완료:** 중복·정원 불일치·결과 불명 시 쓰기를 추가로 활성화하지 않고 이력·데이터를 보존해 조사한다. 운영 데이터 삭제/역마이그레이션 금지. 완료는 기관 승인된 안내·기간/취소 정책 및 실제 개발 E2E와 직접 우회 차단의 증거다.

### 5차 — 문의 접수와 처리

- **SQL·객체:** `day15_inquiries.sql`의 세 테이블·인덱스와 `academy_submit_inquiry`, 관리자 검색·상세·상태 전환 함수 및 관련 GRANT/RLS.
- **선행·위험:** 서비스 역할 경로와 관리자 인증이 선행한다. 이름·이메일·본문, 문의 내용의 상세 조회·상태 이력, 발신자 확인과 실제 답변 경로·보존 기간을 기관이 정해야 한다. 현재 공개 문의 라우트는 시연이다.
- **검증:** 가상 문의로 요청 ID 반복·응답 유실, 마스킹 목록, 상세 접근 이력, 상태 전이와 기록 실패 롤백, 비인가 직접 호출·로그 노출을 검사한다. 실제 개발 API 검증은 별도 승인 이후다.
- **실패·완료:** 실제 데이터 조회나 삭제를 반복하지 말고 이력·대상 보존 후 승인자에게 보고한다. 완료는 기관이 정한 처리/답변 및 개인정보 절차와 실제 개발 권한·실패 검증이다.

### 6차 — 콘텐츠·파일·운영 설정·감사 이력

- **SQL·객체:** day16 콘텐츠/이력·공개 뷰, 선택적 day16 가상 콘텐츠 seed, day17 파일 메타데이터/이력·공개 뷰·함수, day18 브랜드 설정/이력·공개 뷰, day19 다섯 이력 인덱스·`audit_log_reads`·조회 함수. `academy-assets` 비공개 Storage 버킷·정책·객체는 별도다.
- **선행·위험:** day19는 4~6차의 신청·문의·콘텐츠·파일·브랜드 이력 모두가 선행돼야 한다. 공개 자료는 관리자의 명시적 공개가 필요하다. 파일 서명·크기 검사는 악성코드 검사와 같지 않고 DB 백업은 Storage 파일 복원을 보장하지 않는다.
- **검증:** 공개/비공개 전환·직접 URL·우회·목록/상세 권한·이력 실패 롤백, 비공개 버킷·가상 업로드/다운로드·공개 회수, 브랜드 승인값과 이력 범위, Storage/DB 복원 구분을 검사한다. 실제 개인 정보나 운영 파일을 검증에 쓰지 않는다.
- **실패·완료:** 파일 공개 노출·고아 객체·이력 불일치가 발생하면 추가 공개/업로드를 중단하고 승인된 복구 절차를 검토한다. 완료는 실제 개발 DB·Storage 권한 및 가상 파일 검증, 공개 승인·감사/보존 기준과 백업 계획의 일치다.

## 7. 예상 오류와 대응

| 예상/관찰 | 의미와 대응 |
| --- | --- |
| `42P06`/`42P07`, `42701`, `42710` | 스키마·관계·열·정책 등의 중복 가능. 재실행하지 말고 이력/객체·부분 적용을 비교 |
| `42P01`/`42883` | 선행 테이블·함수 없거나 이름/서명 불일치 가능. 의존 그래프와 실제 카탈로그 확인 |
| `23502`, `23505`, `23503`, `23514` | NOT NULL·중복·FK·CHECK 위반 가능. 가상/실데이터 및 동시 작업 상태 조사, 실제 데이터 임의 수정 금지 |
| `42501` | 스키마·테이블·열·함수 권한 부족 가능. 무분별한 GRANT 없이 역할/경로/RLS를 각각 확인 |
| 현재 `PGRST205` / `PGRST106` | 각각 공개 뷰 미발견 / API에 `academy` 스키마 비노출 관찰. RLS 전체 검증으로 해석하지 않음 |
| `unavailable` 또는 결과 미확인 | 모집 시간·상태·정원·중복 또는 응답 유실 등 가능. DB 이력과 동일 요청을 안전하게 대조하며 반복 새 신청/실패 단정 금지 |

실제 적용 중 오류 시 **추가 묶음을 중단**하고 오류·프로젝트·버전·커밋·적용 완료 여부를 보존한다. 롤백 여부를 추측하거나 `DROP`/권한 확대/데이터 삭제로 복구하지 않는다. 트랜잭션이 아직 롤백 가능하면 실행기 상태를 확인하고, 이미 커밋된 변경 또는 데이터는 검증된 백업·호환되는 후속 수정 등 복구 계획을 작성해 별도 승인받는다. DB 복원과 Storage 파일 복원은 별도다. [마이그레이션 안내](https://supabase.com/docs/guides/local-development/database-migrations), [백업 안내](https://supabase.com/docs/guides/platform/backups)

## 8. 승인·실행 체크리스트

1. [ ] 묶음별 정확한 SQL·의존 순서·기존 객체/이력·데이터·GRANT 차이와 정식 버전을 검토했다.
2. [ ] 개인정보·모집 시각·중복/취소·공개 범위·관리자·Storage 정책과 가상 데이터 사용을 결정했다.
3. [ ] 일회용 환경에서 재현·실패/복구 및 역할별 RLS/GRANT/API를 시험했고 실제 개발 환경과 차이를 기록했다.
4. [ ] 개발 DB 프로젝트 ID, 백업·복원 가능 여부, 변경 중지/부분 실패의 복구 방안과 담당자를 확인했다.
5. [ ] **실제 개발 DB 변경에 대해 SQL·범위·시점을 제시하고 별도 승인을 받았다.**
6. [ ] 적용 직후 이력·Git SQL·카탈로그·Security Advisor·실제 역할별 API 및 비공개/쓰기 차단을 검증했다.

현재 위 체크리스트의 실제 적용 승인과 사후 검증은 미완료다. 이번 단계에서 DB SQL을 적용하거나 데이터·권한·Storage·Auth 설정을 변경하지 않았다. 기존 `main`, 운영 DB·다른 Supabase 프로젝트 및 Vercel Production은 변경하지 않았다.
