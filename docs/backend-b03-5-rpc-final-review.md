# B-03-5 관리자 권한 단일화 및 적용 검토

검토일 2026-11-09. 대상은 `ai-education-hub-dev` / `uenvjqgylrevujdjpfed`뿐이다. **실제 DB 적용이나 관리자 등록·회수는 수행하지 않았다.** 현재 파일은 검토 가능한 정식 마이그레이션 후보이며 실제 적용 승인이나 호스팅 환경 검증 완료를 의미하지 않는다.

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
