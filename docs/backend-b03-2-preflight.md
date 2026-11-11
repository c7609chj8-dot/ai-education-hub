# B-03-2: 개발 DB 적용 전 재확인

대상은 `ai-education-hub-dev` / `uenvjqgylrevujdjpfed`이며, 스키마 적용 승인을 받았다. **실제 마이그레이션 실행은 보류했다.** 가상 강좌 데이터 등록은 승인 범위 밖이다.

## 2026-11-08 확인 결과

- 프로젝트 상태는 `ACTIVE_HEALTHY`, PostgreSQL 17.11이다.
- 적용 이력은 `20261107100302_academy_course_foundation`과 `20261108064422_restrict_rls_auto_enable_execute` 두 건이다. 이력을 재실행하지 않았다.
- `academy.courses`, `academy.course_weeks`는 모두 0건이고 `postgres` 소유, RLS 활성화 및 FORCE 비활성화 상태다. 두 테이블의 정책은 아직 없다.
- `courses.objectives`, `public.published_courses`, `public.published_course_weeks`는 존재하지 않는다. `anon`, `authenticated`, `service_role`의 academy 스키마 USAGE와 기존 세 테이블의 테이블·열 권한은 관찰되지 않았다.
- 예상 밖 academy 관계 객체, 함수, 연산자, 사용자 정의 도메인·열거형·범위 타입은 관찰되지 않았다. 기본 권한 대상은 기존의 `postgres`, `anon`, `authenticated`, `service_role`이다. 최종 적용 직전 전체 사전 조건은 다시 확인해야 한다.
- PR #26 HEAD는 `1157280b43111488c512f4a47fa5764dd715785e`였고, 후보 SQL의 정규화 SHA-256은 B-03-1에서 격리 검증한 `6077fd00eb2775815a174107152f389aa116fe8a69b33f6937f447130ec6a039`와 일치했다.
- `npm run test:public-course-migration`을 다시 실행해 공개·비공개 행과 열, 쓰기 거부, invoker 뷰, 충돌·재실행 방지 검사를 통과했다. 이는 격리된 PGlite 결과이며 실제 Supabase MCP 실행기 검증이 아니다. 이전 격리 PostgreSQL 17.11 시험 결과는 B-03-1 문서를 참조한다.
- Security Advisor는 `rls_enabled_no_policy` INFO 3건을 반환했다: `academy.courses`, `academy.course_weeks`, `academy.offerings`. 과거 `public.rls_auto_enable()` 경고 두 건은 이번 조회에 나타나지 않았다. 적용 후 Advisor 검사는 미실시다. [Advisor 설명](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)

## 적용 보류 사유와 다음 확인

후보 SQL의 빈 테이블 확인은 `SHARE ROW EXCLUSIVE` 잠금이 이후 DDL·정책·권한 변경이 끝날 때까지 같은 트랜잭션에서 유지되는 데 의존한다. [Supabase의 마이그레이션 주의 문서](https://supabase.com/kb/troubleshooting/partial-migrations-and-schema-inconsistencies-from-embedded-transactions-13ae82)는 일반적으로 마이그레이션 실행기의 내장 트랜잭션을 설명하지만, [Management API 마이그레이션 명세](https://supabase.com/docs/reference/api/v1-apply-a-migration)와 현재 MCP 도구 설명은 이 MCP 경로의 구체적인 실행 단위, 잠금 유지 및 이력 기록의 원자성을 명시하지 않는다. 로컬 PostgreSQL에서 트랜잭션을 직접 열어 검증한 결과만으로 원격 실행기를 입증할 수 없다.

따라서 Supabase의 해당 실행 경로에 대한 명시적 보증을 확인하거나, 별도로 허용된 격리 Supabase 환경에서 동일 경로의 트랜잭션·잠금 및 실패 후 이력을 검증한 뒤, 대상·SQL 해시·모든 사전 조건을 재확인해야 한다. 승인된 실제 개발 DB를 실행기 시험에 사용하지 않는다. 실행기 확인 전 `apply_migration`을 호출하지 않았다.

실제 적용·적용 후 보안 검증·마이그레이션 버전 동기화는 모두 미실시다. 실제 공개 API의 행·열 및 쓰기 차단, 일반 사용자 JWT와 비공개 행 검증 역시 미실시다. 승인 범위는 스키마뿐이므로 가상 데이터는 등록하지 않았다. 실제 적용 중 실패하면 추가 변경을 중단하고 오류, 이력 및 부분 적용 여부를 조사해 복구 계획을 먼저 보고한다.
