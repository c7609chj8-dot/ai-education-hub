# B-03-2: IPv4 세션 풀러 적용 경로 검토

대상은 개발 프로젝트 `uenvjqgylrevujdjpfed`와 PR #26의 공개 강좌 마이그레이션이다. 2026-11-08 현재 원격 CLI dry-run과 스키마 적용은 하지 않았다. 실제 데이터 등록은 이 작업의 범위가 아니다.

## 확인된 실행 방식과 근거

- 설치된 Supabase CLI는 3.0.0이다. `db push --help`에서 `--remote`, `--dry-run`, `--skip-vault`를 확인했다. 이 버전은 기본값이 로컬이며, 원격 대상은 명시해야 한다.
- [Supabase 연결 안내](https://supabase.com/docs/guides/database/connecting-to-postgres)에 따르면 공유 Session Pooler는 IPv4와 5432 포트를 사용하고, 호스트는 프로젝트 대시보드의 Connect에서 확인해야 한다. 리전만으로 풀러 호스트를 추측하지 않는다.
- [CLI 3.0.0 db push 동작 명세](https://github.com/supabase/cli/blob/v3.0.0/apps/cli/src/commands/db/push/SIDE_EFFECTS.md)는 호환 SQL 및 마이그레이션 이력 INSERT가 마지막 Sync까지 하나의 확장 프로토콜 배치로 처리된다고 설명한다. 명세의 분리 실행 대상 명령과 트랜잭션 비활성화 지시문은 후보 SQL에서 발견하지 못했다. 이 근거는 CLI 경로에 대한 것이며 MCP 경로의 보증을 뜻하지 않는다.
- 동일 명세에 따르면 `--dry-run`은 적용 계획을 표시하고 적용하지 않는다. SQL이 실제 DB에서 실행 가능한지 자체적으로 증명하지 않는다. `--skip-vault`를 지정하고 seed·roles 옵션은 지정하지 않는다. CLI가 다른 마이그레이션도 실행 대상으로 표시하면 중단한다.
- 풀러의 주소 및 비밀번호는 아직 준비 여부가 확인되지 않았다. 비밀번호 없는 원격 프로젝트 연결 시 CLI가 [임시 로그인 역할을 생성할 수 있으므로](https://supabase.com/kb/troubleshooting/permission-denied-when-deleting-the-cli_login_postgres-role-808bae) 이를 시도하지 않았다. 비밀은 출력·저장소 기록·명령줄 인자에 넣지 않는다. 명시적 풀러 URL에 비밀번호를 넣지 않고, CLI가 지원하는 세션 한정 libpq 비밀번호 방식 또는 접근 통제된 pgpass 파일을 사용한다.

## 읽기 전용 사전 점검

- 개발 DB는 정상 상태, 마이그레이션 이력은 `20261107100302`와 `20261108064422` 두 건이다. 현재 로컬 migration 디렉터리에는 기존 두 파일과 후보 파일이 있다. 이는 dry-run 결과가 아니다.
- 강좌와 주차는 각 0건이며, 기초 세 테이블은 `postgres` 소유이고 RLS가 켜져 있다. 강좌·주차의 기존 공개 정책, `objectives` 열 및 공개 뷰는 없다. `anon`, `authenticated`, `service_role`의 기초 세 테이블에 대한 테이블·열 권한은 확인되지 않았다.
- 후보 SQL 정규화 SHA-256은 `6077fd00eb2775815a174107152f389aa116fe8a69b33f6937f447130ec6a039`이며 이전 격리 검증본과 같다. 이전의 격리 검증은 실제 CLI 풀러 연결을 검증하지 않는다.
- Security Advisor는 정책 없는 RLS INFO 3건을 보고했다. 적용 후 검사는 미실시다.

## 남은 단계

1. 사용자에게서 안전한 자격 증명 준비 방법을 확인하고, 프로젝트 Connect 화면의 세션 풀러 호스트를 확인한다. `postgres.uenvjqgylrevujdjpfed`, 5432, TLS 검증을 사용하고 비밀번호는 프로세스 환경 또는 안전한 pgpass에만 둔다.
2. CLI 3.0.0에서 `db push --remote=<비밀번호 없는 세션 풀러 URL> --dry-run --skip-vault`를 실행한다. 실제 출력이 정확히 `20261108105949_public_course_catalog.sql` 한 건인지 확인하고, 기존 이력·대상·로컬 해시·스키마를 재확인한다.
3. dry-run이 정확히 한 건이고 실행 경로와 영향이 확인되면 사용자에게 명령과 적용 계획을 보고하고 새 적용 승인을 받는다. 승인 전에는 `--dry-run`을 제거하지 않는다.
4. 승인 후 스키마만 적용하고 이력·RLS·권한·뷰·Security Advisor와 실제 API를 검증한다. 비공개 행이나 일반 사용자 JWT가 준비되지 않았다면 해당 검사는 미검증으로 남긴다. 적용 중 오류 또는 응답 불명 시 추가 변경을 멈추고 이력과 객체를 읽기 전용으로 조사한다. 임의 재실행·이력 repair 또는 객체 삭제는 하지 않는다.

현재 연결 경로의 실제 접속, CLI dry-run의 대상 1건, 원격 CLI의 실행 결과는 모두 **미검증**이다. 가상 강좌는 등록하지 않았으며, main 병합과 운영 배포도 하지 않았다.
