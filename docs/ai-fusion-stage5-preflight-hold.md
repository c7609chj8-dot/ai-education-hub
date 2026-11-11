# 5단계 사전점검 결과 — 백업 조건 미충족으로 A1·A2 실행 중단

- 확인일: 2026-11-11 19:44 한국시간.
- 승인 대상: ai-education-hub-dev / uenvjqgylrevujdjpfed에 A1·A2 비공개 등록만.
- 기준 PR #37: 271c95c3682f8decd409a10a5b226339e98dbe35 / codex/ai-fusion-branding.
- 판정: 필수 조건 2의 실제 최신 백업·SHA-256·복구 자료가 확보·검증되지 않았다. 사용자 조건 8에 따라 실제 쓰기를 중단했다.
- A1 미실행, A2 미실행. 부분 적용된 A1 스키마도 없다.

## 1. 필수 조건 점검

| 조건 | 결과 | 근거 |
| --- | --- | --- |
| 대상 프로젝트 ID 재확인 | 충족 | API와 대시보드 모두 uenvjqgylrevujdjpfed / ai-education-hub-dev |
| 최신 실제 DB 백업·SHA-256·복구 자료 | 미충족 | 관리형 백업 없음 표시. 실제 수동 백업 파일을 확보하지 못해 해시·복원 검증도 미실시 |
| 전체 Auth·Storage·역할 복원 한계 | 명시 | 모두 미검증. 기존 가상 fixture 복원 성공으로 대신하지 않음 |
| 읽기 전용 preflight 재실행 | 충족 | transaction_read_only=on |
| 기존 5개·60주차·비공개 기수1개 | 충족 | 건수·공개상태·데이터 지문 일치 |
| B-04·신규 객체·UUID/slug·보안 | 관찰 범위 정상, 전체 과거 보안 지문 대조 미완료 | 아래 항목별 결과 참조. 현재 권한 점검을 전체 보안 백업 검증으로 간주하지 않음 |
| 실행 SQL 해시 | 충족 | 4단계 검증 해시와 일치, generator --check 통과 |
| 미충족 시 중단 | 이행 | apply_migration 등 실제 쓰기 도구를 호출하지 않음 |

## 2. 백업 조사 결과

- 실제 프로젝트 Database > Backups > Scheduled backups 화면에서 “Free Plan does not include project backups.” 안내를 확인했다.
- 현재 화면에는 이 프로젝트에서 내려받아 검증할 수 있는 관리형 백업 목록이 없다.
- 작업공간에서 확보된 실제 개발 DB 수동 백업 파일·역할/스키마/데이터 덤프·백업 SHA-256 자료는 확인하지 못했다. 다른 곳에 백업이 없다고 단정하는 것은 아니다.
- 기존 docs/backend-day22-backup-recovery.md의 검증은 가상 로컬 PostgreSQL 클러스터를 대상으로 한 물리 백업 연습이다. 실제 개발 DB의 최신 백업이나 복원 검증이 아니다.
- Supabase 연결 도구에는 백업 다운로드 기능이 없다. 현재 PATH에서도 pg_dump/pg_restore/psql/Supabase CLI/Docker 명령을 확인하지 못했다. 기존 embedded PostgreSQL 서버 테스트 패키지를 실제 DB 백업 도구로 간주하지 않았다.
- 데이터 지문, SQL 소스와 migration 파일, 4단계 가상 DB 결과만으로 실제 백업 조건을 충족했다고 판단하지 않았다.
- 유료 업그레이드를 실행하지 않았다. 무료 수동 논리 백업도 대안이지만 파일 확보·무결성·복구 검증을 먼저 완료해야 한다.

대시보드의 main / PRODUCTION 표시는 해당 Supabase 프로젝트의 기본 브랜치 라벨이다. 대상 판단은 명시된 프로젝트 ID와 프로젝트명으로 했으며, GitHub main이나 Vercel Production을 수정한 것은 아니다.

## 3. 최신 DB 읽기 전용 결과

| 항목 | 결과 |
| --- | --- |
| 서버 / 상태 | PostgreSQL 17.11.0.018 / ACTIVE_HEALTHY |
| 강좌 / 주차 / 기수 | 5 / 60 / 1 |
| 기존 강좌 공개 | 5개 모두 published |
| 시험 기수 | 비공개 draft 유지, 공개 기수0 |
| 신규 3개 객체 | course_profiles / course_week_practices / ai_fusion_runs 모두 없음 |
| B-04 신청 객체 | applications / application_private 없음 |
| 신규 UUID 충돌 | courses·course_weeks·offerings와 78개 후보 UUID 비교, 0 |
| 신규 slug 충돌 | 6개 비교, 0 |
| 기존 owner / RLS | postgres / 활성 |
| API 직접 쓰기 | anon/authenticated/service_role 차단 |
| offering executor 멤버십 | API 역할의 멤버십 없음 |
| 공개 v2 wrapper ACL | postgres 소유·SECURITY INVOKER·authenticated만 승인 경로, anon/service_role 실행 차단 |
| RLS 정책 | 기존 공개/기수 executor 정책 7개 확인 |

데이터 지문은 기존 승인 기준과 모두 일치했다.

- courses: 063817c6a8d81945b8479a2e22f261bb
- course_weeks: b9866407785dc527d007f94a09888b76
- offerings: a6daeccd85e36a9c019f64e73420d548

이는 정렬된 교육정보 JSON의 변경 비교용 MD5이며, 실제 백업 파일 SHA-256과 다르다.
이전 시점의 전체 실제 스키마·권한 백업을 확보하지 못했으므로 모든 보안 객체의 과거 동일성/복원 가능성이 검증됐다고 보고하지 않는다.

## 4. 실제 실행 예정 SQL 해시 — 실행하지 않음

| 파일 | SHA-256 |
| --- | --- |
| ai_fusion_stage4_A1_schema.sql | 655CFD93B8D0C0E7090C2C201A6B294D0E2F5C0B06509E5A7B3A5216E91300F5 |
| ai_fusion_stage4_A2_register.sql | 737D574EA15BE5B20C8F5E02376D2DCE0A72C0365B555142B3036DEFBE6D4C95 |

- 두 파일 모두 4단계에서 PostgreSQL 17 격리 검증에 사용한 해시와 동일하다.
- 고정 매니페스트와 생성 SQL의 재현 검사도 통과했다.
- 실제 백업 파일을 확보하지 못했으므로 백업 파일 SHA-256 값은 없다. 위 SQL 해시를 백업 무결성 값으로 대신하지 않는다.

## 5. 실제 실행 결과

- A1: 실행하지 않음. 새 테이블 0개.
- A2: 실행하지 않음. 신규 강좌/주차/profile/practice 추가 0개.
- B/C 및 복구 D: 실행하지 않음.
- 기존 강좌·주차·기수·공개상태·RLS·RPC·GRANT·B-04 변경 없음.
- main 병합·Production 배포 없음.
- 실제 적용 후 11개·132주차 검사나 신규 권한 검증은 적용하지 않았으므로 수행했다고 보고하지 않는다.

## 6. 재개 조건

1. 동일 개발 프로젝트의 최신 실제 백업을 안전한 로컬 경로에 확보한다.
2. 역할/권한·스키마·데이터 및 필요한 마이그레이션 이력 복구 자료를 포함하고, 백업 파일 SHA-256과 생성 시각·대상을 기록한다.
3. 변경 대상 데이터·스키마·권한을 별도 격리 환경에서 복원·대조한다. 전체 Supabase Auth·Storage·역할 복원의 미검증 범위는 계속 명시한다.
4. 실제 스키마·권한의 비교 기준을 확보하고 최신 preflight·UUID/slug·SQL 해시 검사를 다시 수행한다.
5. 모든 필수 조건이 충족된 후 이미 승인된 A1·A2 범위 내에서만 재개한다. 백업 조건을 생략하는 추가 승인을 요청하지 않는다.
6. A1 성공 후 A2 실패 시 A1 스키마가 남는 점을 보고하고 임의 삭제하지 않는 원칙은 유지한다.
7. 신규 학과 홈페이지 공개 전환은 A1·A2 적용 완료 후에도 별도 승인 대상이다.

비밀번호·키·JWT·연결 문자열을 채팅이나 PR에 올리는 방법으로 백업 연결을 준비하지 않는다.

## 출처

- [실제 프로젝트 백업 화면](https://supabase.com/dashboard/project/uenvjqgylrevujdjpfed/database/backups/scheduled)
- [Supabase 백업 안내](https://supabase.com/docs/guides/platform/backups)
- [Supabase CLI 백업·복구 안내](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)
- PR #37의 4단계 해시·설계 자료와 실제 개발 DB READ ONLY 조회.
