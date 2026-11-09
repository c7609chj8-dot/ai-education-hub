# B-03-5 관리자 권한 단일화 및 적용 검토

검토일 2026-11-09. 대상은 `ai-education-hub-dev` / `uenvjqgylrevujdjpfed`뿐이다. **관리자 RPC v2 마이그레이션은 개발 DB에 적용됐으며, 초기 관리자 등록·회수는 수행하지 않았다.** 아래의 적용 전 계획과 점검 항목은 당시 기록이며, 최신 검증 결과는 바로 아래와 문서 마지막 절을 따른다.

## 현재 적용 상태

- 사용자가 조건부 승인한 후 Session Pooler 경로로 `20261108183527_b03_5_admin_membership_and_offerings_v2`를 적용했다. 실제 개발 DB의 이력에서 동일 버전·이름과 38개 기록 문장을 확인했다. Git 후보 파일의 버전과 일치한다.
- `private_education.offering_admins`는 RLS가 켜져 있고 관리자 행은 0개다. 기존 강좌 5개·주차 60개·기수 0개와 개발 Auth 테스트 사용자 1명, `ensure_rls` 이벤트 트리거 활성 상태가 유지된다.
- 새 전용 역할은 NOLOGIN·NOINHERIT·NOBYPASSRLS이며 anon·authenticated·service_role·authenticator는 해당 역할의 멤버가 아니다. 관리자 목록 직접 SELECT·쓰기와 기수 직접 쓰기는 이 API 역할들에 허용되지 않는다. 전용 역할만 필요한 기수 열 쓰기와 전용 RLS 정책을 받는다.
- 내부 SECURITY DEFINER 3개 중 관리자 여부 함수는 BYPASSRLS의 `postgres` 소유이고 기수 함수 2개는 전용 역할 소유다. `search_path`는 비어 있고 공개 래퍼 3개는 SECURITY INVOKER다. 신규 함수 6개 모두 PUBLIC·anon에는 EXECUTE가 없고 authenticated에는 부여돼 있다. 내부 함수 본문 3개의 MD5는 해당 로컬 SQL 본문과 일치했다. 이는 SQL 파일 전체와 DB 이력이 바이트 단위로 같다는 뜻은 아니다.
- 실제 익명 Data API에서 공개 강좌 5건·주차 60건을 조회했고 `academy_is_admin_v2`는 HTTP 401 / SQLSTATE `42501`로 거부됐다. 비공개 스키마에 대한 직접 Data API 조회는 HTTP 406 / `PGRST106`으로 거부됐다. 실제 일반 사용자 JWT와 관리자 등록 후 JWT의 접근·저장·회수 검사는 미실시다.
- Security Advisor에 기존 유출 비밀번호 보호 비활성화 WARN 1건과 `private_education.offering_admins`의 RLS 정책 없음 INFO 1건이 있다. 후자는 클라이언트 접근을 허용하는 정책을 두지 않은 현재 설계의 결과이며, RLS 우회가 가능한 소유자의 함수는 별도 고권한 경계로 계속 관리해야 한다. [RLS INFO 안내](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [비밀번호 보호 안내](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
- 초기 관리자 한 명의 등록은 별도 승인 전이다. 신규 서버 코드는 관리자 목록이 비어 있으면 접근을 거부하므로 기존 관리자 서버를 먼저 전환하지 않는다. 전체 백업 복구·실제 Auth 세션 회수·전체 호스팅 기능은 여전히 미검증이다.

## 단일 기준과 회수

- 서버 `getAdminIdentity()`는 동일 클라이언트에서 Supabase Auth `getUser()`로 인증을 확인한 뒤 `public.academy_is_admin_v2()`를 호출한다. 이 함수와 직접 기수 RPC는 모두 `private_education.offering_admins`의 `auth.uid()` 확인을 사용한다. `ACADEMY_ADMIN_USER_IDS`는 더 이상 관리자 판단에 사용하지 않으며, DB 확인이 실패하거나 RPC가 없으면 서버는 거부한다. 이메일·사용자 메타데이터는 인가 기준이 아니다.
- 관리자 행을 삭제하고 트랜잭션이 커밋된 **이후 시작되는** 서버 권한 검사와 직접 RPC는 같은 JWT로도 거부된다. 이미 시작된 DB 문장·서버 요청은 기존 스냅샷으로 완료될 수 있고, 다른 서비스 키 기반 기능의 진행 중 요청도 취소되지 않는다. 필요한 강한 회수 보장은 별도 잠금·요청 중단 설계가 필요하다.
- 관리 권한 회수와 로그인 세션 종료는 다르다. 회수 후에도 유효 JWT는 일반 사용자 인증에 쓸 수 있다. 필요 시 별도 승인된 관리 절차로 Auth 세션/refresh token을 회수하되 기존 access JWT는 만료까지 남을 수 있다. 민감 작업에서 세션 폐기 직후까지 강제하려면 `session_id`와 `auth.sessions` 검증 등 별도 설계·부하 검증이 필요하다. [Supabase 세션 문서](https://supabase.com/docs/guides/auth/sessions)
- 관리자 목록은 `private_education.offering_admins`이고 RLS가 활성화된다. `anon`, `authenticated`, `service_role`, 전용 executor의 직접 INSERT·UPDATE·DELETE를 허용하지 않으며 관리자 목록을 수정하는 API도 만들지 않는다. DB 소유자 등 고권한 운영자는 변경할 수 있다. 실제 소유자·상속·Data API 노출·감사 설정은 적용 후 별도 확인이 필요하다.

## 호스팅 제약과 대안

실제 개발 DB는 PostgreSQL 17.11이며 `postgres`는 CREATEROLE/BYPASSRLS이지만 슈퍼유저가 아니다. 실제 `auth` 스키마의 `postgres`는 USAGE만 있고 **USAGE WITH GRANT OPTION이 없다.** 따라서 PR #30 이전 초안의 `GRANT USAGE ON SCHEMA auth TO academy_offering_executor`는 호스팅 계정으로 수행할 수 없다.

대신 `private_education.is_admin_v2()`는 `postgres` 소유의 `SECURITY DEFINER`로 오직 현재 요청의 `auth.uid()`와 관리자 목록 존재 여부만 boolean으로 반환한다. 인자·동적 SQL·쓰기 기능이 없고 `search_path=''`이며, 호출 권한은 인증 사용자와 기수 executor로 제한한다. 공개 `public.academy_is_admin_v2()`는 `SECURITY INVOKER`다. 기수 helper도 같은 내부 검사를 호출한다.

**트레이드오프:** 이 boolean 함수의 소유자 `postgres`는 BYPASSRLS를 가진 강한 역할이다. 본문을 최소화했지만 권한 위험이 없어지는 것은 아니므로 함수 소유자·본문·EXECUTE와 예상 밖 기본 ACL을 재확인하고 변경을 엄격히 제한해야 한다. 기존 `auth` 스키마와 `auth.uid()`는 변경하지 않는다. [Supabase 함수 보안 문서](https://supabase.com/docs/guides/database/functions)

기수 helper 소유자인 `academy_offering_executor`는 NOLOGIN·NOBYPASSRLS이며 필요한 열 권한과 전용 RLS만 갖는다. `anon`·`authenticated`·`service_role`은 executor 멤버가 아니며 테이블 직접 쓰기를 받지 않는다. 신청 테이블 존재 시 저장을 중단한다. 실제 신청 수 기준 정원 초과·축소와 신청/기수 동시성은 **미구현**이다. 같은 모든 필드의 중복 저장은 advisory transaction lock으로 직렬화한다.

## 검증 결과와 한계

- 격리 PostgreSQL 17.11에서 비슈퍼유저 `postgres`의 CREATEROLE/BYPASSRLS, 별도 `auth` 소유자 및 비위임 USAGE를 재현했다. 새 역할 생성, 함수 소유권 이전, 권한 및 `ensure_rls` 동작, 관리자 가상 등록·수정·조회, 일반 사용자·익명 거부, 권한 회수 후 거부, 직접 쓰기 차단, 유효성·중복·동시성 테스트가 통과했다.
- 충돌 역할을 임시 생성한 뒤 마이그레이션이 중단되도록 하고 명시적 ROLLBACK 후 역할·신규 스키마가 남지 않는지 확인했다. 정상 후보도 명시적 트랜잭션으로 실행했다. 이 결과는 CLI 원격 실행의 원자성을 증명하지 않는다.
- 격리 서버에서 event trigger 생성은 PostgreSQL 슈퍼유저가 해야 하므로, 트리거 **함수** 소유자는 `postgres`로 맞췄지만 트리거 객체 소유자는 격리 슈퍼유저다. 실제 DB의 트리거 객체 소유자는 `postgres`다. 호스팅 전체 권한·확장·서비스 구성을 동일하게 복제했다고 주장하지 않는다.
- 격리 `auth.uid()`는 가상 claim을 사용한다. JWT 서명 검증기나 PostgREST를 실행하지 않았다. 실제 일반 사용자 JWT의 직접 RPC 거부, 실제 관리자 JWT로 v2 조회·저장·회수, 호스팅 DDL 실행 및 Security Advisor 적용 후 검사는 **미검증**이다.
- 실제 로그인된 사용자는 새 코드 테스트 서버에서 DB RPC 부재로 안전하게 거부됐다. 기존 홈페이지 서버는 그대로 유지돼 같은 세션의 관리자 콘솔이 열렸다. PC·모바일에서 기존 콘솔과 새 로그인 화면을 보았으며 새 코드의 허용된 관리자 콘솔은 DB 미적용으로 미검증이다.
- 2026-11-09 읽기 전용 재조회: 대상 프로젝트는 `ai-education-hub-dev`이며 기존 이력 4건, 강좌 5개·주차 60개·기수 0개다. 신규 역할·스키마·후보 public 함수와 신청 테이블은 없고 `ensure_rls`는 활성화 상태다. 지정된 개발 Auth 사용자 ID 한 건이 존재하지만 관리자 권한을 등록한 것은 아니다.
- 실제 `postgres`는 `auth` USAGE와 `auth.uid()` EXECUTE는 있지만 USAGE GRANT OPTION은 없다. 현재 `anon`·`authenticated`·`service_role`의 기수 테이블 INSERT·UPDATE·DELETE는 테이블 권한 조회상 없고, `service_role`은 `academy` USAGE도 없다. 이는 적용 전 상태이며 새 함수 적용 후의 열 단위·상속 권한과 실제 API 호출은 재검증해야 한다.
- Data API 노출 설정은 `pgrst.db_schemas` SQL 조회로 판정하지 못했다. 사용자는 대시보드에서 `public`이 표시되고 `private_education`은 없다고 확인해 주었다. 이는 **사용자 확인**이며 도구로 독립 확인한 결과는 아니다. 적용 직전에 다시 확인한다.
- Security Advisor 읽기 전용 재조회 결과 `auth_leaked_password_protection` 비활성 WARN 1건이 남아 있다. 설정을 변경하지 않았다. [조치 안내](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)

## 초기 관리자 및 회수 절차 — 승인 전 계획

1. 초기 관리자 등록, 추가·회수 대상과 실행 담당자는 각각 승인받는다. 이메일·비밀번호·JWT·DB 비밀번호를 채팅·Git·로그에 기록하지 않는다.
2. 대상 ID가 해당 개발 프로젝트의 실제 `auth.users.id`인지 읽기 전용으로 검증한다. 개발 DB 관리 연결의 매개변수화된 트랜잭션에서 특정 ID 한 건만 INSERT하고 영향 행 수를 확인한 뒤 커밋한다. 예상과 다르면 롤백한다. 초기 ID는 migration에 하드코딩하지 않는다.
3. 추가는 본인 확인과 승인 기록 후 동일 절차를 쓴다. 회수는 같은 고권한 연결에서 ID 한 건만 삭제하고 커밋 후 같은 사용자 세션의 서버 API와 직접 RPC가 거부되는지 확인한다. 필요 시 별도 승인으로 Auth 세션 회수를 수행한다. 계정 삭제나 비밀번호 변경은 자동 실행하지 않는다.
4. 관리자 목록이 비었거나 확인 RPC가 없는 동안 새 서버는 관리자 접근을 거부한다. 따라서 기존 기능을 보호하려면 전환 구간의 관리자 작업을 중지한 뒤 DB 후보 적용·검증, 승인된 초기 관리자 등록·검증, 새 코드의 Preview 확인 순서로 진행해야 한다. 서버만 먼저 전환하지 않는다.

## 마이그레이션·dry-run·복구 계획

- v1은 `supabase/drafts/b03_5_insecure_v1_do_not_apply.sql`의 과거 검토 기록이며 적용 대상이 아니다. v2 후보는 CLI 3.0.0의 `migration new`로 만든 `supabase/migrations/20261108183527_b03_5_admin_membership_and_offerings_v2.sql`이다. 초기 관리자 데이터는 포함하지 않는다.
- 적용 전 프로젝트 ID, 정확한 4개 이력, 강좌·주차·기수와 해시, 역할·함수·스키마 부재, RLS·ACL·기본 권한·인증 역할 멤버십·트리거·Data API 노출을 재확인한다. 예외가 있으면 중단한다.
- CLI 3.0.0의 `db push --help`에서 `--remote`, `--dry-run`, `--skip-vault`를 확인했다. IPv4 **Session Pooler** 주소는 대시보드 Connect에서 확인하고 비밀번호는 명령 인자·로그에 넣지 않는다. 이전 직접 CLI 연결은 IPv6 오류가 있었다.
- **사용자 보고, 2026-11-09:** Session Pooler dry-run에서 신규 `20261108183527_b03_5_admin_membership_and_offerings_v2.sql` 한 건만 표시되고 `Finished supabase db push`가 출력됐으며 실제 SQL 적용은 하지 않았다고 밝혔다. 출력 원문·실행 플래그·연결 호스트와 TLS 인증서 검증 결과는 이 검토자가 독립 관찰하지 못했다. 해당 메시지만으로 dry-run 여부를 단독 판정하지 않는다.
- 같은 날 읽기 전용 DB 이력에서 기존 4건만 존재하고 후보의 버전·역할·스키마가 없음을 확인했다. 현재 로컬 후보 SHA-256은 `4fe473787ce8e2a6d312b455554a0ffe1936761755b2e78660512758ec628928`이다. 사용자가 실행한 당시 파일 바이트와 호스팅 연결을 독립적으로 입증한 결과는 아니다. 적용 직전 파일·대상·미적용 목록을 다시 확인한다.
- 원자성: 격리 PostgreSQL에서 명시적 트랜잭션의 정상 실행과 충돌 시 ROLLBACK을 검증했다. [CLI v3.0.0 실행 문서](https://github.com/supabase/cli/blob/v3.0.0/apps/cli/src/commands/db/push/SIDE_EFFECTS.md)는 호환 SQL과 이력 INSERT를 한 확장 프로토콜 배치에 넣지만 `CREATE INDEX CONCURRENTLY`, `REINDEX CONCURRENTLY`, `VACUUM`, `ALTER SYSTEM`, `CLUSTER`가 있으면 경계를 분리해 원자성을 잃는다고 설명한다. 후보에서 이런 문장과 트랜잭션 분리 지시·명시적 `LOCK TABLE`은 검색되지 않았다. 문서와 격리 테스트는 실제 호스팅 실행·연결 장애·이력 기록의 원자성을 실증하지 않는다. dry-run도 SQL을 실행하지 않으므로 이를 입증하지 않는다. 실행기 버전·호스트·트랜잭션 처리 근거를 적용 전에 재확인하고 보장할 수 없으면 중단한다.
- 승인 1: 위 v2 스키마 마이그레이션 1건을 지정된 개발 DB에만 적용한다. 기존 4건 재실행·관리자 행 등록·데이터 삭제는 범위 밖이다. 승인 2: 적용과 이력·보안 검사 후, 지정된 개발 Auth UID 1건을 관리자 목록에 등록한다. 두 작업은 별도 요청과 승인으로 처리하며 이 계획이나 dry-run은 승인이 아니다.
- 오류·타임아웃 시 추가 실행을 즉시 중단한다. 마이그레이션 이력·역할·함수·정책·데이터를 읽기 전용 조회해 부분 적용 여부를 판별한다. 재실행·이력 repair·일괄 DROP은 하지 않는다. 필요 시 신규 객체의 의존관계와 관리자 접근 중단 영향을 확인하고 표적 복구/정방향 수정안을 별도 승인받는다.
- 적용 후에는 테이블/RLS/역할 멤버십·함수 소유자·search_path·모든 유효 GRANT·Data API 노출과 Security Advisor를 확인한다. 관리자 bootstrap 후 실제 관리자·별도 일반 사용자·익명 JWT, 회수 후 기존 JWT 및 직접 쓰기 차단을 검증하고 강좌 5개·60주·공개 조회를 비교한다.
- 함수가 Data API에서 보이지 않으면 노출 스키마와 PostgREST 스키마 캐시를 먼저 확인한다. 원인 불명 상태에서 반복 적용하거나 캐시 설정을 임의 변경하지 않는다.

## 조건부 승인 사전 점검 — 백업 미확인으로 적용 보류

- 2026-11-09 사용자는 개발 DB에 v2 마이그레이션 1건만 조건부 승인했으며, 백업·복구 가능성과 단일 트랜잭션 경로가 확인되지 않으면 중단하라고 지시했다. 초기 관리자 등록은 승인하지 않았다.
- 읽기 전용으로 대상 프로젝트 ID, 기존 이력 4건, 강좌 5건·주차 60건·기수 0건, 신규 역할·스키마·후보 공개 함수 부재를 확인했다. 후보의 SHA-256은 위 검증 해시와 같으며 Git 추적 파일과 작업 파일의 blob도 일치한다.
- 현재 개발 프로젝트 대시보드는 Free 요금제이고 Database Backups에 `Free Plan does not include project backups`가 표시된다. 프로젝트 개요의 마지막 백업은 `No backups`다. 별도의 수동 백업 존재와 현재 상태 복구 가능성은 확인하지 못했다. 백업 생성이나 복원은 실행하지 않았다.
- 호스팅 PostgreSQL에서 `postgres`의 CREATEROLE·BYPASSRLS와 auth USAGE, 기존 RLS, API 역할의 직접 기수 쓰기 권한 부재, 기본 함수 ACL 및 이벤트 트리거 활성화를 읽기 전용으로 재확인했다. 새 역할 생성·소유권 이전·함수 실행 및 CLI 단일 트랜잭션의 실제 호스팅 실행은 여전히 미검증이다.
- 현재 실행 환경에는 Session Pooler용 pgpass 또는 DB 비밀번호 환경변수가 확인되지 않아 추가 원격 CLI dry-run을 실행하지 않았다. 이전 1건 dry-run은 사용자 보고다. CLI 버전 조회 시 이 실행 환경의 사용자 폴더 telemetry 쓰기 권한 오류가 발생했다. DB 연결 또는 마이그레이션 실행 오류는 아니다.
- 따라서 **SQL을 적용하지 않고 중단했다.** 복구 가능한 최신 백업의 범위와 복원 절차를 확인한 뒤, 세션 풀러 연결·대상 목록·실행기 원자성을 적용 직전에 재검증해야 한다. 기존 후보 및 관리자 등록에 대한 승인 범위는 합쳐지지 않는다. [백업 안내](https://supabase.com/docs/guides/platform/backups), [CLI 백업·복원 안내](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)

## 개발 DB 수동 백업 및 선택 복원 — 2026-11-09

- 사용자가 비밀번호를 PowerShell에 직접 입력해 개발 DB의 PostgreSQL 아카이브와 역할 정의를 로컬 보호 폴더에 생성했다. 백업 파일·Auth 데이터·역할 정의와 비밀정보는 Git에 포함하지 않는다. 역할 덤프는 `--no-role-passwords`로 생성돼 역할 비밀번호를 복구하지 못한다. DB 백업은 Storage 파일 본문 및 Supabase 프로젝트 설정을 포함하지 않는다.
- 백업 직후 확인된 대상: 강좌 5개·주차 60개·기수 0개, 마이그레이션 4건, Auth 사용자 1명, Storage 객체 0개. 아카이브 목록에 해당 강좌·마이그레이션·Auth 사용자 데이터 항목이 포함된 것을 확인했지만, 목록만으로 전체 데이터 복원 가능성을 증명하지 않는다.
- `SHA256SUMS.txt`의 네 파일 모두 독립 재계산한 SHA-256과 일치했고 `pg_restore --list`가 성공했다. 복원 시험 후에도 같은 해시가 유지됐다. 같은 폴더의 해시 목록은 오류 발견에 유용하지만 독립된 서명이나 변조 방지 보관을 대신하지 않는다.
- 실제 백업에서 `academy`와 `supabase_migrations`를 로컬 PostgreSQL 17.11에 선택 복원하고 관련 `public` 조회 뷰 세 개와 ACL을 복원했다. 임시 역할은 로컬에서 새로 만든 가상 역할이며 실제 역할 덤프를 복원한 것은 아니다. 강좌 5개·각각 12주·기수 0개, 이력 4건의 버전, 테이블 세 개의 RLS와 정책 세 개를 확인했다. 익명 역할의 뷰 조회는 강좌 5개·주차 60개·기수 0개였고 뷰 세 개의 `security_invoker`를 확인했다. 세 API 역할의 강좌 테이블·열 유효 권한을 복원 당시 개발 DB 카탈로그와 대조했다.
- 전체 아카이브 복원, 실제 역할 정의·상속, Auth 계정·비밀번호·세션, `ensure_rls` 이벤트 트리거, Storage 파일·설정과 Supabase 호스팅 환경의 복구는 **미검증**이다. 이 선택 복원 성공만으로 전체 프로젝트 복구 가능이나 운영 복원 준비 완료를 주장하지 않는다. 스키마와 데이터 사이에 의존하는 관리형 확장·설정은 별도 복구 계획이 필요하다.
- 초기 시험에서는 Windows 설치본에 서버 초기화 파일이 없었고, 별도 배포본에서 추가 라이브러리를 준비한 뒤 로컬 프로세스 대기 방식을 수정했다. 시험용 PostgreSQL과 임시 데이터는 종료·정리했으며 백업 원본과 원격 DB는 수정하지 않았다. 관리자 RPC 적용과 초기 관리자 등록은 계속 보류한다.

## 재승인 전 점검 — 2026-11-09

- 요청의 SQL 실행 금지에 따라 이번 점검에서는 개발 DB에 조회 SQL도 직접 실행하지 않았다. Supabase 프로젝트·이력·테이블 관리 도구에서 개발 프로젝트 정상 상태, 기존 마이그레이션 4건, 강좌 5개·주차 60개·기수 0개와 세 테이블의 RLS 활성화를 확인했다. 역할 멤버십·함수 실행 권한·기존 Auth 사용자의 최신 상태는 이번에 독립 재조회하지 못했다.
- 보호된 로컬 백업의 매니페스트 네 파일은 비어 있지 않고 SHA-256이 모두 일치했으며 아카이브 목록을 다시 읽었다. 같은 저장소에 보관된 해시는 재해나 악의적 변조에 대비한 별도 보관본이 아니다. 로컬 선택 복원은 이전 절에 기록한 범위만 성공했다. Auth·역할 비밀번호·역할 상속·이벤트 트리거·Storage 파일과 호스팅 전체 복원은 계속 미검증이다.
- 후보 SQL의 SHA-256은 검증된 `4fe473787ce8e2a6d312b455554a0ffe1936761755b2e78660512758ec628928`이며 Git 추적 파일과 일치한다. 신규 SQL 1건 dry-run은 이전 사용자 보고가 있으나 적용 직전 재확인이 필요하다. CLI 3.0.0은 로컬에서 확인했다.
- 기존 개발 DB의 역할·기본 ACL·함수·이벤트 트리거는 앞선 읽기 전용 점검과 격리 실험을 근거로 검토했으며, 최신 역할·GRANT 상태와 실제 호스팅 DDL·실제 JWT·연결 장애 시 원자성은 미검증이다. 이를 통과한 것으로 가정하지 않는다.
- 적용 직전에는 대상·이력·객체·권한·현재 데이터 및 백업 최신성, 단일 후보 dry-run, 인증서 검증과 트랜잭션 경로를 확인한다. 이상 시 변경하지 않는다. 실패·연결 끊김은 성공이나 롤백으로 추정하지 않고 추가 실행을 중단하고 이력·객체·권한을 읽기 전용으로 확인한 후 복구안을 별도로 승인받는다.
- 실제 개발 DB 마이그레이션과 초기 관리자 등록은 별도 승인이다. 기존 서버를 먼저 교체하면 관리자 접근이 거부되므로 DB 적용·검증과 별도 승인된 관리자 등록 전에는 새 서버로 전환하지 않는다.

## 사용자 보고 최종 dry-run 및 재승인 요청 준비 — 2026-11-09

- 사용자는 Supabase CLI 3.0.0의 개발 프로젝트 Session Pooler dry-run에서 `DRY RUN`과 후보 `20261108183527_b03_5_admin_membership_and_offerings_v2.sql` 한 건, `Finished supabase db push`를 확인했으며 DB 변경은 없다고 보고했다. 검토자는 터미널 실행과 출력 원문을 직접 관찰하지 못했다. 이 보고는 실제 SQL 실행 성공이나 호스팅 원자성을 증명하지 않는다.
- 이후 관리 도구로 대상 프로젝트와 마이그레이션 이력 4건, 강좌 5개·주차 60개·기수 0개, 기존 세 테이블의 RLS 활성화를 재확인했다. 로컬 후보 SHA-256은 검증된 값과 같고 Git 추적본과 일치한다. 기존 백업의 네 파일 해시와 아카이브 목록은 다시 확인했으며, 복원 성공은 위 선택 복원 범위로 한정된다.
- 현재 Security Advisor에는 유출 비밀번호 보호 비활성화 WARN 1건이 남는다. 기존 역할 멤버십·열 권한·Auth 사용자에 대한 이번 점검의 직접 SQL 재조회, 호스팅 DDL 적용, 초기 관리자 등록 및 실제 사용자 JWT 검사는 수행하지 않았다.
- 적용 승인 대상은 개발 프로젝트에 v2 스키마 마이그레이션 한 건을 적용하는 작업뿐이다. 적용 직전에 대상·마이그레이션 목록·해시·백업·최신 권한과 트랜잭션 경로를 다시 확인하고 조건 불일치 시 실행하지 않는다. 실제 오류·타임아웃 시 재실행하지 않고 상태를 읽기 전용으로 조사한다. 기존 관리자 서버 전환 및 초기 관리자 한 명의 등록에는 이 승인을 사용하지 않는다.
