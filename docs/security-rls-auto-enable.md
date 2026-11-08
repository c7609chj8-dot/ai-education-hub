# 개발 DB 자동 RLS 함수 실행 권한 제한

검증일: 2026년 11월 8일 (한국 시간)
대상: `ai-education-hub-dev` / `uenvjqgylrevujdjpfed`

## 변경과 영향

기존 `public.rls_auto_enable()` 이벤트 트리거 함수에서 `PUBLIC`, `anon`, `authenticated`의 `EXECUTE`를 회수했습니다. 함수 정의·소유자·`SECURITY DEFINER` 속성, `ensure_rls` 트리거와 기존 `academy` 테이블은 변경하지 않았습니다. Supabase MCP의 정식 마이그레이션 `20261108064422_restrict_rls_auto_enable_execute`로 개발 DB에 한 번 적용했습니다.

`PUBLIC`에서 회수하면 직접 명시되지 않은 다른 역할도 그 권한을 상속받지 못합니다. 실제 카탈로그에서 `service_role`과 `authenticator`의 함수 `EXECUTE`도 적용 전 `true`, 적용 후 `false`임을 확인했습니다. 격리 PostgreSQL에서 권한 회수 전에도 이 함수는 일반 함수로 직접 호출할 수 없었으며 회수 후 자동 RLS는 계속 작동했습니다. 이는 실제 API 요청이나 모든 외부 관리 도구의 호환성을 검증한 것은 아닙니다. 실제 서비스 역할 호출 및 외부 도구 의존성은 별도 확인해야 합니다.

기존 함수는 `public` 스키마의 테이블 생성에 반응합니다. 세 테이블에 대한 기존 RLS·ACL은 적용 전후 동일했으며, 개발 DB 카탈로그에서 함수 의존 객체는 `ensure_rls` 이벤트 트리거로 조회됐습니다. 동적 호출이나 외부 도구의 모든 의존성이 없다는 보장은 아닙니다.

## 전후 결과

| 검사 | 적용 전 | 적용 후 |
| --- | --- | --- |
| `PUBLIC`, `anon`, `authenticated` 실행 권한 | 있음 | 없음 |
| 함수 소유자·정의·속성 | `postgres`, `SECURITY DEFINER`, 정의 MD5 `846ec2fbff751d24b890656d63c3a9bf` | 동일 |
| `ensure_rls` | 활성, `ddl_command_end`, `CREATE TABLE`·`CREATE TABLE AS`·`SELECT INTO` | 동일 |
| Security Advisor WARN | 익명·인증 역할 관련 각 1건, 총 2건 | 두 경고 모두 조회되지 않음 |
| `academy` 세 테이블 | RLS 활성, 테이블 ACL `{postgres=arwdDxtm/postgres}` | 동일 |
| Security Advisor INFO | RLS 정책 없음 3건 | 3건 유지. INFO 자체가 노출을 뜻하지는 않음 |

개발 DB의 실제 자동 RLS 시험에서는 트랜잭션 안에서 일회용 `public` 테이블을 만들고 RLS 활성화를 확인한 뒤 롤백했습니다. 롤백 후 해당 테이블이 없음을 별도 쿼리 결과로 확인했습니다. 검증 시 `extensions.pgrst_ddl_watch()`도 생성 이벤트를 관찰함을 확인했으며, 그 함수의 `NOTIFY`는 같은 롤백 트랜잭션 안에 있었습니다.

## 격리 재현

`scripts/verify-rls-trigger-security.mjs`는 새 PGlite 메모리 DB만 사용합니다. 테스트 전용 함수 정의 사본은 `scripts/fixtures/rls_auto_enable.postgres17.sql.txt`에 있으며 **실제 DB에 적용하는 마이그레이션이 아닙니다**. 정의의 MD5가 실제 적용 전후 카탈로그 정의와 일치함을 확인했습니다.

PostgreSQL 17.5 기반 PGlite 0.4.5에서 함수 소유자가 DDL을 실행하는 경우와 비슈퍼유저 소유자·별도 DDL 역할의 두 경우를 확인했습니다. `CREATE TABLE`, `CREATE TABLE AS`, `SELECT INTO`에 대해 권한 회수 전후 RLS 활성화를 확인하고, 반복 회수가 함수 정의·트리거를 바꾸지 않는 점을 확인했습니다. `anon`, `authenticated`, `service_role`, `authenticator`, DDL 역할의 상속 실행 권한 변화와 회수 전 직접 호출 불가도 확인했습니다. 실제 개발 DB는 PostgreSQL 17.11이며, 격리 테스트는 실제 Supabase API·관리 도구 시험을 대신하지 않습니다.

격리 재실행에는 저장소 외부의 별도 디렉터리에 고정된 `@electric-sql/pglite@0.4.5` 설치가 필요합니다. 그 디렉터리를 `ACADEMY_RLS_TEST_MODULE_ROOT`에 지정하고 저장소 루트에서 `node scripts/verify-rls-trigger-security.mjs`를 실행합니다. 실제 DB 주소나 키를 전달하지 않습니다.

## 마이그레이션 동기화와 복구

개발 DB 이력의 문장과 파일의 끝 개행을 제외한 SQL은 같습니다. DB 문장 SHA-256은 `2ba591b2767c43a32731c8b74b5ffaa07c47a41d096eee6fb3672aad9278c49d`, 개행을 포함한 Git 파일 SHA-256은 `ea4df54f98cec7d64b7593c6f9b5ab03f572979a19b76d64502b112ec025df18`입니다. 개행 차이 때문에 바이트가 동일하다고 주장하지 않습니다.

문제가 확인되면 추가 변경을 멈추고 대상·권한·실제 사용처를 조사합니다. 변경 이전은 `PUBLIC`의 기본 실행 권한이 있던 상태이므로 복구가 꼭 필요한 경우 영향과 보안 경고의 재발을 검토하고 별도 승인 후 원래 ACL 복원 방안을 적용합니다. 이 PR은 자동 롤백이나 운영 DB 적용을 수행하지 않습니다.

적용 전 결과 파싱 오류는 DB 변경 전에 수정해 사전 조건을 다시 확인했습니다. 적용 후 PostgREST 트리거 함수의 스키마를 `public`으로 잘못 지정한 읽기 전용 조회가 `42883`으로 실패했으며, 카탈로그에서 실제 `extensions` 스키마를 확인했습니다. 두 오류로 인한 DB 변경은 없었습니다.

이 PR은 기존 일자별 브랜치와 독립적으로 `main`을 대상으로 하지만 자동 병합하지 않습니다. 기존 20~25일차의 보안 경고 기록은 당시의 역사적 검수 결과이며, 이 PR의 결과와 합쳐 검토해야 합니다. 기존 미추적 보안 초안 파일, 운영 DB, 다른 Supabase 프로젝트와 Vercel Production은 변경하지 않았습니다.
