# 4단계 실제 적용 전 DB 점검 보고서

- 기준일: 2026-11-11, 한국시간. 저장소 PR #37, 시작 HEAD e0435679d7a795b294fe32e5d1f3483e4b5e4c1a.
- 대상: ai-education-hub-dev / uenvjqgylrevujdjpfed. 운영 DB와 다른 프로젝트에는 연결하지 않았다.
- 이 보고서의 실제 DB 검사는 BEGIN READ ONLY와 SELECT만 사용했다. 신규 데이터·테이블·권한·공개상태 변경은 없다.
- 재실행 가능한 읽기 전용 점검 SQL: supabase/drafts/ai_fusion_stage4_preflight.sql.

## 실제 확인

| 항목 | 결과 |
| --- | --- |
| PostgreSQL | 17.11 (Supabase 프로젝트 버전 17.11.0.018) |
| 연결 실행자 | postgres, SUPERUSER=false, BYPASSRLS=true, CREATEROLE=true |
| 기존 강좌 / 주차 / 기수 | 5 / 60 / 1 |
| 기존 강좌 공개 상태 | 5개 모두 published |
| 시험 기수 | life-chatgpt 참조, draft, is_public=false |
| 공개 기수 | 0 |
| 적용 마이그레이션 | 5 |
| 신규 slug 6개 충돌 | 0 |
| 신규 profiles / practices / runs | 모두 없음 |
| B-04 applications / application_private | 없음 |
| 기존 테이블 owner / RLS | courses, course_weeks, offerings 모두 postgres / 활성 |
| public 읽기 뷰 | 기존 security_invoker 뷰 3개 유지 |
| 관리자 v2 | 공개 wrapper 3개 존재. 기존 신청 테이블 감지 차단 가드 유지 |
| schema CREATE | postgres가 academy·private_education에서 가능 |
| auth schema | postgres는 USAGE만 보유. 새 역할에 USAGE를 넘길 수 있는 권한은 전제하지 않음 |
| 기본 권한 | public·storage 기본 ACL 존재. 후보는 이 전역 설정을 변경하지 않음 |
| 이벤트 트리거 | ensure_rls 포함 기존 트리거 활성. 후보가 이를 끄지 않음 |

## 교육 데이터 기준선 지문

다음 값은 개인정보나 키가 아닌 변경 비교용 MD5다. 인증 수단이나 위변조 방지 서명이 아니다.

| 테이블 | row 전체를 UUID 순서로 정렬한 JSON 지문 |
| --- | --- |
| courses | 063817c6a8d81945b8479a2e22f261bb |
| course_weeks | b9866407785dc527d007f94a09888b76 |
| offerings | a6daeccd85e36a9c019f64e73420d548 |

- 작업 시작과 종료의 읽기 전용 조회에서 모두 일치했다.
- 실제 기존 UUID·기수 위치 등의 전체 행을 저장소에 복사하지 않았다.
- 향후 실제 A1 적용 시 같은 DB 안의 비공개 통제 테이블에 현재 교육정보 스냅샷을 기록한다. Auth 사용자·신청자·JWT·비밀 키는 읽거나 저장하지 않는다.
- 실제 적용 직전 지문·건수·공개상태가 달라지면 중단하고 변경 내용을 재검토한다. 현재 보고서를 오래된 승인 근거로 계속 사용하지 않는다.

## 적용 판단

- SQL 후보 및 격리 검증을 위한 기준선은 확인했다.
- 실제 적용 승인은 아직 없다. A1·A2를 실행하지 않았다.
- A1은 기존 5/60/1, 강좌별 1~12주차, 기존 owner/RLS, API 쓰기 권한 차단을 재검사한다.
- A1 이후에는 기존 데이터·기존 보안 정의·신규 스키마/ACL/RLS의 지문과 비교하며 예상 밖 변경 시 덮어쓰지 않고 중단한다.
- Supabase 고유 DDL 감시·확장 트리거 전체를 로컬에서 완전히 복제한 것은 아니다. 이 차이는 실제 적용 전 승인 자료에 포함한다.
