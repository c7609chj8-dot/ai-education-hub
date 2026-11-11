# AI융합대학 4단계 완료 보고 — SQL 후보·격리 검증

기준: 2026-11-11, PR #37 / codex/ai-fusion-branding, 시작 HEAD e0435679d7a795b294fe32e5d1f3483e4b5e4c1a.
결론: SQL 후보와 복구 설계를 작성하고 PGlite 및 실제 PostgreSQL 17.11 격리 검증을 통과했다. 실제 개발/운영 DB 변경 승인은 여전히 필요하다.

## 제출 자료

1. 실제 적용 전 점검: ai-fusion-stage4-preflight.md와 읽기 전용 preflight.sql.
2. 비공개 등록: A1_schema.sql / A2_register.sql / 고정 manifest.json.
3. 상세 메타데이터 설계: ai-fusion-stage4-design.md의 구조 비교·FK·검토 상태·접근 경계.
4. 공개 전환: B_publish.sql / C_keep.sql / 조건부 C_archive.sql.
5. 복구: D_recover.sql, 자동 롤백 범위와 커밋 후 비파괴 복구안.
6. 격리 검사: 아래 실제 결과, verify-ai-fusion-stage4-{cases,pglite,postgres}.mjs.
7. 기존 영향: 기존 소스·SQL·RLS·GRANT·RPC 불변, 기존 행/FK 보존 및 관리자 v2 회귀.
8. 승인 항목: 아래 A1/A2 실제 적용 범위와 B/C 제외 사항.
9. 5단계 절차: ai-fusion-stage5-apply-plan.md.

## 실제 PostgreSQL과 PGlite 구분

| 항목 | PGlite | 실제 PostgreSQL |
| --- | --- | --- |
| 엔진 | 기존 @electric-sql/pglite 인메모리 | PostgreSQL 17.11 독립 로컬 프로세스 |
| 실행 | 폐기 가능한 모델 DB | 임시 디렉터리, 임의 localhost 포트, 실제 pg 연결 |
| 실행자 | 모델 postgres | 비슈퍼유저 postgres, CREATEROLE/BYPASSRLS, auth USAGE 재부여 권한 없음 |
| 보안 모델 | 기존 v2 fixture | 기존 v2 fixture + 별도 auth 소유자 + 활성 ensure_rls 이벤트 트리거 |
| 동시성 | 두 독립 연결의 잠금/경합 증명으로 사용하지 않음 | 독립 first/second 연결과 관찰 연결로 대기 상태 확인 |
| 결과 | 통과 | 통과, 프로세스 중지 및 임시 데이터 디렉터리 삭제 확인 |

- Native 의존성은 작업 폴더 밖에 기존 설치된 embedded-postgres 17.11.0-beta.19와 pg 8.23.1을 재사용했다. 프로젝트 의존성을 추가하지 않았다.
- 실제 실행 연결 2개와 주 검증 연결은 비슈퍼유저 postgres다. 관찰 연결만 폐기 가능한 클러스터의 관리자 권한으로 pg_stat_activity 잠금 상태를 확인한다.
- 로컬 PostgreSQL 17.11은 Supabase 17.11.0.018의 모든 확장·서비스·운영체제·DDL 감시 트리거와 동일한 환경은 아니다.

## 검증 결과

| 검사 | 결과 |
| --- | --- |
| 실제 개발 DB 읽기 전용 점검 | 5강좌·60주차·비공개 기수1·마이그레이션5, 신규 객체 없음, 원본 지문 일치 |
| A1 중복 실행 | 기존 객체를 채택하지 않고 안전하게 거부, 데이터 변화 없음 |
| A1 부분 DDL 실패 | 새 profile 테이블까지 포함 전체 롤백 |
| 알려지지 않은 기본 ACL 수혜자 | 새 테이블의 예상 밖 권한을 감지해 A1 전체 롤백 |
| 신규 UUID/기존 slug 충돌 | 중단, 기존 5/60/1 불변 |
| 마지막 실습과제 제약 실패 | A2의 6/72/profile/practice 전체 롤백 |
| A2 정상 추가·재실행 | 전체 11/132/1, 정확한 재실행에 추가 생성/공개상태 초기화 없음 |
| 상세 저장/조회 | 6개 profile·72개 practice·objectives·시간 NULL·review_state=draft를 소유자 SELECT로 전체 대조 |
| 초기 공개 읽기 | anon/authenticated 공개 뷰에서 기존 5/60만 조회, 공개 기수0 |
| 메타데이터 기본 차단 | anon/authenticated/service_role/기존 offering executor의 SELECT·DELETE 거절 |
| SQL 실행 역할 | API·service·offering executor의 후보 실행 거절 |
| 메타데이터 ACL/RLS 변경 | 후보가 drift를 감지해 중단 |
| 기존 RPC 권한·역할 멤버십·뷰 정의 변경 | 기존 보안 drift를 감지해 중단 |
| 빈/NULL 메타데이터 배열 | DB 제약으로 거절 |
| REPEATABLE READ | 오래된 스냅샷 위험 때문에 거절, READ COMMITTED만 허용 |
| B-04 테이블 발생 | 후보가 거절, 기존 v2의 신청 통합 차단 가드도 그대로 거절 |
| 기존 관리자 v2 | 기존 권한·정의 유지, 강좌11개 조회 및 기수 등록/수정 회귀 통과 |
| B 공개 / C_keep | 공개 11강좌·132주차·기수0, 상세 API 차단 유지 |
| C_archive 전제 없음 | URL 호환 검수 참조 없으면 거절 |
| C_archive 가상 전제 있음 | 공개 6/72/0, 원본 행/기수 참조 유지 |
| D 복구 및 재실행 | 공개 5/60/0, 전체11/132/1, 신규 데이터 삭제 없이 이전 상태 복구 |
| 수정 내용·신규 참조 발생 후 복구 | 덮어쓰지 않고 중단 |
| Native 동시 A2 2건 | 잠금 대기 확인, 결과 한 배치 6/72만 생성 |
| Native 관리자 기수 변경과 A2 경합 | 잠금 대기 후 변경 감지·중단, 관리자 값을 덮어쓰지 않음 |
| 생성 SQL 재현 | generator --check 통과 |
| TypeScript / ESLint | 통과 |
| Native 정리 | PostgreSQL 종료·postmaster.pid 제거·안전 경로 확인 후 임시 디렉터리 삭제 |

부정 테스트의 GRANT·DDL·기수 수정·삭제는 모두 localhost 가상 fixture에서만 수행했다. 실제 DB와 후보 SQL은 기존 권한/기수 삭제를 수행하지 않는다.

## 재현 명령

- node scripts/generate-ai-fusion-stage4.mjs --check
- node scripts/verify-ai-fusion-stage4-pglite.mjs
- AI_FUSION_PG_MODULE_ROOT에 격리 의존성 디렉터리를 지정한 뒤 node scripts/verify-ai-fusion-stage4-postgres.mjs
- Native 실행기는 원격 접속 문자열을 받지 않고 생성한 localhost 임시 클러스터에만 연결한다.

## 검수 중 해결한 항목

- PL/pgSQL JSON 변수와 테이블 alias의 모호성을 변수명 분리로 수정한 뒤 두 엔진에서 재검사했다.
- 최초 Native 잠금 관찰 실패는 SQL 실행 권한이 아닌 통계 관찰 연결의 가시성 문제였다. 관찰 연결만 가상 클러스터 관리자로 분리했고 SQL 실행자는 비슈퍼유저로 유지한 상태에서 동시성 검사를 통과했다.
- 기존 보안 권한을 풀어서 통과시키지 않았다.

## 기존 기능 영향

- 기존 브랜드·로고·슬로건·학과/신청 화면·시연 ID·slug·B-04 파일을 변경하지 않았다.
- 기존 migrations 및 관리자 v2 정의·기존 RLS·기존 GRANT·전역 기본 ACL을 변경하지 않는다.
- 새 객체는 course_profiles / course_week_practices / ai_fusion_runs뿐이다. 새 공개 뷰·RPC·역할·양의 GRANT는 없다.
- B-04 신청 테이블이 실제 DB에 생기면 현재 후보는 중단하고 새 통합 검토를 요구한다.
- B-04 2일차·실제 마지막 좌석 접수 검증 완료를 이 결과로 대신하지 않는다.
- 화면을 수정하지 않은 오프라인 후보 작업이므로 이번 단계에서 시각 검수를 반복하지 않았다. 신규 상세의 실제 Supabase UI 연동 완료를 주장하지 않는다.

## 남은 위험·승인 범위

- 신규 상세 API는 기본 차단 상태다. 전체 공개 서비스 전환에는 별도 조회/정책/화면 계약 검토가 필요하다.
- C_archive의 실제 URL 호환은 구현되지 않았다. 테스트용 참조 문자열은 운영 검수 증거가 아니다. 실제 실행 대상에서 제외한다.
- 공개 전환은 교육과정 확정을 뜻하지 않는다. review_state는 draft이며 교육시간·모집·강사·학위/인가 정보는 미확정이다.
- 복구는 과거 스냅샷과 일치할 때만 허용한다. 실제 신규 신청/기수·정상 관리자 편집이 생기면 승인된 최신 복구안이 필요하다.
- Supabase 고유 확장·모든 이벤트 트리거·실환경 연결 단절까지 검증하지 않았다.
- SQL A1과 A2는 별도 트랜잭션이다. A2 실패 시 A1의 차단된 스키마가 남는다는 점을 승인 범위에 포함한다.
- 실제 적용 전 A1/A2 해시·대상 DB·신규 행/테이블·권한 경계·백업/복구 한계를 다시 확인한다.

권장 승인 요청은 ai-education-hub-dev에 A1/A2의 비공개 등록만 적용하는 범위다.
B/C 공개 전환·기존 공개 해제·신규 조회 권한·기수 생성·실제 신청·main·Production은 제외한다.

## 출처

- PR #37 및 docs/ai-fusion-stage3-data-plan.md
- 기존 5개 migrations / 관리자 v2 회귀 fixture
- 실제 개발 DB READ ONLY 조회 및 폐기 가능한 PostgreSQL 17.11 실행 결과
