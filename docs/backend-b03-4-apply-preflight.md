# B-03-4 개발 DB 적용 사전 점검

점검일: 2026-11-09 (Asia/Seoul). 대상: `ai-education-hub-dev` / `uenvjqgylrevujdjpfed`. 사용자가 후보 스키마 1건의 조건부 적용을 승인했다. **세션 풀러 dry-run과 실제 마이그레이션은 아직 실행하지 않았다.**

- 개발 프로젝트는 `ACTIVE_HEALTHY`, 이력은 기초·보안 수정·공개 강좌 `20261107100302`, `20261108064422`, `20261108105949` 세 건이다.
- 강좌 5건·주차 60건·기수 0건이며, 강좌·주차 전체 행 해시는 이전 B-03-3 검수 시점과 같다. 기수 `is_public` 열과 `public.published_offerings` 뷰 및 기수 정책은 없다.
- 기초 세 테이블의 RLS는 활성화되고 소유자는 `postgres`다. 익명·인증 역할은 기존 강좌 정책에 필요한 SELECT 열과 `academy` USAGE를 보유하고, 기수에는 테이블/열 권한이 없다. 관찰된 기본 ACL 대상은 `postgres`, `anon`, `authenticated`, `service_role`이다.
- 후보 파일 정규화 SHA-256은 격리 검증본과 같은 `22819a03eb0d4444e89c60b6f74d5adf3de528947e534a590c84206151fc20c4`다. 로컬 migration 디렉터리에는 기존 이력과 이 후보 총 4개 파일이 있다. 이 수동 비교는 CLI dry-run 결과가 아니다.
- 격리 PGlite에서 공개/비공개 기수와 부모 강좌, RLS·뷰·권한·KST 시각 및 충돌 조건 시험, 신청 시각 검증 테스트를 다시 통과했다. 실제 Supabase Data API 및 실제 사용자 JWT는 미검증이다.
- Supabase CLI 3.0.0 문서상 호환되는 마이그레이션 SQL과 이력 INSERT는 단일 확장 프로토콜 배치로 처리된다. 후보에서 배치 분리 대상 SQL이나 명시적 트랜잭션 명령은 발견하지 못했다. 잠금 유지·정상 롤백에 관한 전제는 실제 실행 직전에 다시 확인한다. [CLI 동작 명세](https://github.com/supabase/cli/blob/v3.0.0/apps/cli/src/commands/db/push/SIDE_EFFECTS.md)
- 현재 작업 프로세스에는 세션 풀러 비밀번호 또는 pgpass가 확인되지 않았다. 비밀번호 없는 CLI 원격 연결은 임시 역할을 만들 수 있으므로 시도하지 않았다. 사용자는 PowerShell에서 직접 dry-run을 수행하는 방식을 선택했다.
- Security Advisor는 `academy.offerings`의 정책 없는 RLS INFO 1건, WARN 0건이다. 적용 후 결과는 아직 없다. 기본 빌드/Tailwind 문제는 기존 B-03-4 보고서에 미해결로 기록돼 있다.

후속으로 실제 세션 풀러 dry-run 출력에 오직 `20261108143123_public_offerings_catalog.sql`만 표시되는지 확인하고, 실행 전 대상·SQL 해시·행 수·이력·실행기의 트랜잭션을 다시 확인한다. 실행 실패·중복·결과 불명이면 재실행하거나 임의 복구하지 않고 실제 이력·객체·권한을 읽기 전용으로 조회해 계획을 보고한다. 예시 기수와 관리자 RPC는 승인 범위가 아니다.
