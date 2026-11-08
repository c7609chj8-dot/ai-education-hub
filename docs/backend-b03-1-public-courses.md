# B-03-1: 공개 강좌 마이그레이션 준비

기준: `codex/integration-stage-b`, PR #25 / `198320d2676834c9c94b93c33b4457ea51d3089d`

대상: `ai-education-hub-dev` / `uenvjqgylrevujdjpfed` (PostgreSQL 17.11)

**상태: 격리 검증과 적용 계획 준비. 실제 개발 DB에는 적용하지 않았고, 적용에는 별도 승인이 필요하다.** 아래의 로컬 마이그레이션 버전은 아직 실제 DB 이력이 아니다. 운영 DB·다른 프로젝트·main·Vercel Production은 변경하지 않았다.

## 1. 현재 개발 DB의 읽기 전용 확인

- 기존 이력은 `20261107100302_academy_course_foundation`, `20261108064422_restrict_rls_auto_enable_execute` 두 건이다. 둘 다 다시 실행하지 않았다.
- `academy.courses`와 `academy.course_weeks`는 `postgres` 소유, RLS 활성화·FORCE RLS 비활성화, 정책 0개다. 각각 0건이며 `anon`·`authenticated`·`service_role`은 현재 `academy` USAGE와 두 테이블의 SELECT/INSERT/UPDATE/DELETE 및 열 SELECT/INSERT/UPDATE 권한이 없다.
- `courses.objectives`, `public.published_courses`, `public.published_course_weeks`, 같은 이름의 공개 정책은 아직 없다. 예상 밖의 `academy` 관계 객체·함수·사용자 정의 타입·연산자와 예상 밖의 `public` 기본 뷰 권한 대상은 조회되지 않았다. 이는 조회 시점의 결과이며 적용 직전 재확인해야 한다.
- 공개 키 GET은 두 뷰에서 각각 `404 PGRST205`, `academy.courses`의 API 스키마 직접 조회에서 `406 PGRST106`이었다. 실제 authenticated 계정, SQL 적용 후 API, 모든 역할/외부 도구는 미검증이다.
- `postgres`의 기존 `public` 테이블/뷰 기본 ACL에는 `anon`, `authenticated`, `service_role`에 TRUNCATE·REFERENCES·TRIGGER·MAINTAIN 권한이 포함된다. 기본 ACL 자체는 변경하지 않는다. 새로 만드는 두 뷰에 한해서만 불필요한 권한을 회수한다.
- Security Advisor의 기존 자동 RLS 함수 WARN 2건은 조회되지 않고 기초 테이블의 정책 없음 INFO 3건이 남아 있다. INFO만으로 노출 또는 완전한 보안 상태를 판정하지 않는다.

## 2. 정식 마이그레이션 후보와 예시 데이터

| 항목 | 파일 | 정규화 SHA-256 | 범위 |
| --- | --- | --- | --- |
| 스키마 | `supabase/migrations/20261108105949_public_course_catalog.sql` | `6077fd00eb2775815a174107152f389aa116fe8a69b33f6937f447130ec6a039` | CLI 3.0.0 `migration new`로 로컬 생성. 실제 적용 전 후보 |
| 가상 데이터 | `supabase/drafts/day08_dev_examples.sql` | `3b847d7ffa324f84ffa57d9df68f3c076192a2791f416e21f210f1a7aa23bb76` | 기존 개발 전용 seed, 스키마 마이그레이션과 별도 |

해시는 UTF-8 텍스트의 CRLF를 LF로 바꾸고 양끝 공백을 제거한 뒤 계산했다. 파일 바이트 해시와 다를 수 있다. seed는 개발용 가상 강좌 5개와 강좌마다 12주, 합계 60주를 넣는다. 기존 테이블의 잠금·공백 검사를 통과해야 하며 두 번째 실행은 거부된다. 실제 운영 정보나 개인정보로 사용하지 않는다.

### 스키마 변경 객체와 권한

| 종류 | 준비된 변경 |
| --- | --- |
| 기존 열 | `academy.courses.objectives text[] NOT NULL DEFAULT '{}'` 추가 |
| 스키마 | `academy` USAGE를 `anon`, `authenticated`에 부여 |
| 강좌 열 SELECT | `id`, `slug`, `title`, `category`, `summary`, `audience`, `result_artifact`, `duration_hours`, `objectives`, `publication_state`만 두 역할에 부여. `created_at`은 미부여 |
| 주차 열 SELECT | `course_id`, `week_number`, `title`만 두 역할에 부여. 주차 자체 `id`는 미부여 |
| 정책 | `courses_select_published`: 공개 강좌만. `course_weeks_select_published`: 공개 강좌에 속한 주차만 SELECT |
| 뷰 | `public.published_courses`, `public.published_course_weeks`; 두 뷰 모두 `security_invoker=true` |
| 뷰 권한 | 새 두 뷰에서 `PUBLIC`, `anon`, `authenticated`, `service_role`의 기존/기본 권한을 제거하고 `anon`, `authenticated`에만 SELECT 부여 |

INSERT·UPDATE·DELETE 권한은 부여하지 않는다. `publication_state`는 정책 평가에 필요한 기초 열이므로 직접 스키마 접근이 가능해질 경우 공개 행에 한해 조회될 수 있다. 두 뷰는 `publication_state`를 반환하지 않는다. `academy`를 Data API에 노출하면 뷰 외에 기초 테이블의 허용 열도 RLS에 따라 직접 접근 가능해질 수 있으므로, 스키마 노출·열 GRANT·정책·뷰를 함께 검증한다. 현재 406은 미래의 비노출 보장이 아니다. [Supabase API 보안](https://supabase.com/docs/guides/api/securing-your-api), [PostgreSQL 보안 호출자 뷰](https://www.postgresql.org/docs/17/sql-createview.html)

### 8일차 초안 대비 변경

원래의 공개 정책·뷰·열 SELECT 설계는 유지했다. 추가된 것은 다음 두 가지다.

1. 익명 PL/pgSQL 사전 검사에서 기초 테이블·소유자·RLS/FORCE 상태, 기존 정책·동명 열/뷰/타입, 예상 밖 `academy` 객체/함수/타입/연산자, 대상 역할의 예상 밖 스키마·테이블·열 권한, 예상 밖 기본 뷰 권한 대상 및 빈 강좌/주차 테이블을 검사한다. 기존 권한·데이터가 다르면 수정하지 않고 오류로 중단한다. 빈 테이블 검사 전 두 테이블을 `SHARE ROW EXCLUSIVE`로 잠가 **같은 마이그레이션 트랜잭션 내** 동시 쓰기를 막는다.
2. 기존 `public` 기본 ACL의 영향을 줄이기 위해 새 두 뷰에 대한 REVOKE 대상에 `service_role`을 추가했다. 이는 두 새 뷰에만 해당하고 기존 public 객체나 기본 권한 전체를 변경하지 않는다. `service_role`이 두 뷰를 통해 조회해야 하는 후속 사용처는 아직 검증되지 않았다.

이 검사는 예측 가능한 충돌과 권한 변화 일부를 막는 장치이지 모든 동시 권한 변경, 외부 의존성, Data API 설정 변화를 자동으로 막지는 못한다. 적용 직전 DDL·GRANT 변경이 없는 작업 시간을 확보하고 검사 결과와 실행 역할을 다시 확인한다.

## 3. 격리 테스트 결과

| 검사 | 결과·한계 |
| --- | --- |
| `npm run test:public-course-migration` | PGlite PostgreSQL 17.5: 공개 5강좌·60주, draft/archived 강좌와 연결 주차 비노출, 허용/금지 열, `anon`·`authenticated` INSERT/UPDATE/DELETE 거부, `security_invoker` 및 기반 열 권한 제거 시 뷰 조회 거부 통과 |
| 기본 권한 | 개발 DB에서 관찰한 `public` 기본 ACL을 격리 DB에 모의하고 새 뷰에서 `service_role` 등 불필요 권한 제거를 확인. 실제 DB의 기본 ACL을 바꾸지 않음 |
| 충돌·재실행 | 예기치 않은 열/테이블 권한, 스키마 USAGE, 다른 객체·타입·기본 ACL 대상, 기존 뷰, RLS 비활성/FORCE, 비어 있지 않은 테이블에서 중단. seed·마이그레이션 반복 실행 거부 확인 |
| `npm run test:public-course-postgres` | 새 localhost PostgreSQL 17.11: 스키마 트랜잭션 중 다른 쓰기 대기, 예시 seed 두 동시 실행 중 정확히 하나만 성공, 5강좌·60주 및 역할별 조회·DELETE 거부 확인. 서버 중지와 임시 폴더 제거 확인 |
| `npm run test:public-course-service` | 네트워크 없는 가짜 클라이언트로 빈 목록, 존재하지 않는 강좌, 잘못된 행, API 오류 및 명시적 시연 모드 검증. API 오류를 예시로 조용히 대체하지 않음 |
| HTTP 404 | 환경변수·원격 DB 설정이 없는 로컬 시연 빌드에서 강좌 목록·기존 상세 200, 없는 상세 404 확인. 실제 Supabase 연결 후 404는 미검증 |
| 회귀·빌드 | 기존 `test:course-access`, `test:schedule-access`, TypeScript, 경고 0건 ESLint, Next.js 빌드 통과 |

익명·authenticated 검사는 격리 PostgreSQL에서 `SET ROLE`을 사용했다. **실제 개발 Supabase의 일반 사용자 JWT·Data API·관리자 계정은 검사하지 않았다.** 관리자 ID나 세션을 만들지 않은 역할에서도 공개 조회가 가능함을 격리 SQL에서 확인한 것이며, 실제 로그인 사용자의 API 계약은 승인 후 검증해야 한다.

로컬 PostgreSQL 검사는 Windows x64 전용이며 저장소 외부의 `embedded-postgres@17.11.0-beta.19`, `pg@8.23.1` 설치 폴더를 `DAY12_PG_MODULE_ROOT`로 지정해야 한다. 테스트는 새 임시 DB·localhost만 사용하고 원격 DB URL을 받지 않는다.

## 4. 승인 후 적용·검증 순서 제안

1. 실제 적용 전 현재 Git 커밋·위 SQL 및 seed의 해시, 프로젝트 ID·상태, 두 기존 마이그레이션 이력, 대상 열/정책/뷰/타입, 기본 ACL·역할 상속·테이블 행 수를 읽기 전용으로 다시 확인한다. 기존 데이터가 하나라도 있거나 권한/객체가 다르면 중단한다.
2. 스키마와 예시 데이터의 적용 범위에 대한 **명시적 승인**을 받는다. 다른 DB나 운영 프로젝트는 선택하지 않는다. 기존 두 마이그레이션과 오래된 미추적 보안 초안을 실행하지 않는다.
3. Supabase MCP의 정식 마이그레이션 기능으로 스키마 후보 SQL만 적용한다. 로컬 파일에는 CLI가 만든 `20261108105949`가 있으나 MCP가 기록하는 실제 버전이 다를 수 있다. **실제 이력과 SQL을 확인한 뒤 Git 파일명·테스트의 파일 경로·이 문서의 버전 설명을 실제 버전에 맞춰 동기화**하고 검사를 다시 실행한다. 다르다고 기존 마이그레이션을 재실행하지 않는다.
4. 잠금과 권한 적용이 하나의 트랜잭션으로 처리되는 실행 경로인지 적용 전에 확인한다. 스키마 파일에 별도의 `BEGIN`/`COMMIT`을 삽입하지 않는다. Supabase는 마이그레이션 내부 트랜잭션 제어가 실행기의 원자성을 깨뜨릴 수 있다고 안내한다. MCP 실행 경로의 원자성과 중단 동작은 실제 적용 전 최종 확인해야 한다. [Supabase 트랜잭션 주의](https://supabase.com/kb/troubleshooting/partial-migrations-and-schema-inconsistencies-from-embedded-transactions), [Management API 마이그레이션](https://supabase.com/docs/reference/api/v1-apply-a-migration)
5. 스키마 적용 직후 열·뷰·`security_invoker`·정책·스키마/테이블/열/뷰 권한, 실제 이력과 Advisor를 확인한다. 예시 데이터 적용이 별도로 승인된 경우에만 **직전** 강좌·주차가 비었는지 재확인하고 기존 개발용 seed를 별도의 단일 트랜잭션으로 실행한다. seed는 정식 스키마 마이그레이션에 넣지 않는다.
6. 적용 후 익명·실제 일반 인증 사용자로 공개 5개·60주, 비공개/허용 외 열·쓰기 거부, 빈 결과·오류·404를 실제 Data API와 화면에서 확인한다. 실제 비공개 강좌의 API 차단을 시험하기 위한 가상 비공개 행 생성·정리는 별도의 승인된 테스트 계획이 필요하다. 공개 예시만으로 비공개 API 차단을 입증하지 않는다. 미준비 계정이나 API는 미검증으로 남긴다.

## 5. 실패·복구 및 재실행 금지

- 사전 조건·잠금·마이그레이션·seed 또는 권한 검사에 실패하면 추가 SQL과 다음 단계를 중단한다. 오류와 이력·현재 객체를 읽기 전용으로 확인하고 실행기 트랜잭션이 롤백됐는지 추정하지 않는다. 부분 적용 가능성을 조사한다.
- 이미 반영된 정책·뷰·열·권한을 임의 DROP/REVOKE/복원하지 않는다. 데이터가 생겼다면 보존·백업·영향과 이전 코드 호환성을 검토해 별도 승인된 복구안을 마련한다. 프런트 배포 롤백만으로 DB가 되돌아가지 않는다.
- 스키마가 성공했지만 seed가 실패하면 스키마를 재실행하지 않는다. seed의 빈 테이블 검사, 실제 행 수와 트랜잭션 상태를 먼저 확인한다. 중복·불명확한 결과에서 무작정 반복하지 않는다.
- 자동 복구 SQL이나 기본 권한의 일괄 변경은 준비·실행하지 않았다. 실제 적용 및 가상 데이터 등록은 각각 범위를 명확히 확인한 승인 전까지 보류다.
