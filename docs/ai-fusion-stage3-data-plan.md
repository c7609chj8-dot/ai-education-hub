# 3단계 데이터 정합성·DB 전환 설계와 4단계 작업계획

기준: PR #37 d867912 / codex/ai-fusion-branding. 2026-11-11.
이번 단계는 교육과정 초안·시연 코드·격리 검증이다. 실제 DB SQL 후보의 작성·적용을 완료했다고 간주하지 않는다.

## 1. 시연 기수 ID 분리

원인: 앞선 개편에서 sample-life 등 기존 5개 기수의 ID는 유지하면서 course 참조만 신규 학과로 바꿨다. 따라서 같은 신청 주소가 다른 과목을 뜻하게 됐다. 실제 DB UUID의 중복 문제가 아닌 mock 참조 의미의 문제다.

| 신규 학과 | 신규 시연 기수 ID | 상세 slug |
| --- | --- | --- |
| AI 경영관리학과 | demo-ai-management-01 | ai-management |
| AI 음악제작학과 | demo-ai-music-01 | ai-music |
| AI 항공영상제작학과 | demo-ai-aerial-video-01 | ai-aerial-video |
| AI 멀티미디어학과 | demo-ai-multimedia-01 | ai-multimedia |
| AI 프로그래밍학과 | demo-ai-programming-01 | ai-programming |
| AI 광고영상제작과 | demo-ai-advertising-video-01 | ai-advertising-video |

- 신규 목록·일정·관리자 시연은 위 6개만 사용한다. 실제 기수 UUID와 구분되는 문자열 ID다.
- 기존 sample-life → life-chatgpt, sample-work → ai-work, sample-ebook → ai-ebook, sample-instructor → ai-instructor, sample-business → ai-business를 원래 연결로 복원한다.
- 기존 5개 신청 주소는 legacySampleOfferings에서만 찾고 이전 교육과정 시연 안내를 표시한다. 새 학과 신청 폼의 선택 목록에 이전 과정명을 섞지 않는다.
- PR #37에서 만들어졌던 sample-advertising은 demo-ai-advertising-video-01로 호환 리디렉션한다. 새로운 ID를 기존 데이터로 가장하지 않는다.
- 실제 offering UUID·알 수 없는 ID·prototype 키는 이 정적 시연 페이지에서 404 처리한다. 실제 접수는 B-04 경로 설계와 검수 전까지 연결하지 않는다.
- 신규 6개와 기존 5개의 ID는 총 11개로 중복이 없다. 광고영상 호환 주소를 포함한 정적 경로는 총 12개다.
- 기존 시연 상태·일정·정원 숫자는 예시로 유지한다. 마감·예정 기수에서는 시연 폼을 열지 않는 기존 동작을 보존한다. 모든 학과에서 실제 접수를 받는다고 표시하지 않는다.

## 2. slug 차이와 결정

| 학과 | 이미 작동하는 slug | 이전 권장 slug | 이번 처리 |
| --- | --- | --- | --- |
| AI 음악제작학과 | ai-music | ai-music-production | 기존 ai-music 유지 |
| AI 광고영상제작과 | ai-advertising-video | ai-ad-video | 기존 ai-advertising-video 유지 |

- 다른 4개는 권장안과 일치한다.
- 권장 명칭은 필수 규격이 아니므로 작동 중인 주소를 바꿀 실익이 작다. 현재 slug를 정식 전환 후보 키로 유지한다.
- 학과 상세·히어로·카드·검색·시연 관리자 courseId·일정 연결은 동일한 기존 slug/시연 courseId를 사용한다.
- 권장 slug의 별도 alias 경로는 이번에 만들지 않는다. 해당 미사용 주소도 작동한다고 보고하지 않는다.
- 추후 변경이 필요하면 대상 slug 중복 확인 → 새 canonical 경로 승인 → 옛 주소에서 308 리디렉션 → 검색·공유·관리자 연결 일괄 수정 및 회귀 검사 순으로 진행한다.
- 외부 서비스의 기존 링크 전체를 열람할 수는 없다. 이 단계는 저장소 내부 연결과 기존 주소 응답을 검증한다.

## 3. 개발 DB 보호 기준선

READ ONLY 재확인 대상: ai-education-hub-dev / uenvjqgylrevujdjpfed.

- courses 5개, course_weeks 60개, offerings 1개.
- 기존 5개 모두 published. 비공개 시험 기수는 life-chatgpt 참조, draft / is_public=false. 공개 기수 0개.
- 신규 현재 slug 6개와 충돌 없음. 브랜드·신청 테이블은 이번 작업 범위 밖이다.
- courses.id는 UUID PK, slug는 UNIQUE다.
- course_weeks는 (course_id,week_number) UNIQUE 및 courses FK ON DELETE RESTRICT.
- offerings.course_id는 courses FK ON DELETE RESTRICT.
- 기존 강좌·주차·기수 ID 및 FK는 변경·삭제하지 않는다.

## 4. 신규 6개·72주차 데이터 구조

| 초안 데이터 | 기존 DB 전환 후보 |
| --- | --- |
| 학과 slug | academy.courses.slug, 기존 URL 그대로 유지 |
| 새 course ID | 코드 문자열을 UUID로 재사용하지 않고 별도 UUID 생성·버전별 매니페스트 고정 |
| 학과명·분야 | title / category |
| 소개·교육대상 | summary / audience |
| 교육목표 3~5개 | objectives text[] |
| 결과물 대표명 | result_artifact |
| 교육시간 미확정 | duration_hours NULL |
| 공개 상태 | 처음에는 draft |
| 주차 1~12와 주제 | academy.course_weeks의 course_id / week_number / title, 총 72행 |
| 주차별 실습과제·핵심 내용·도구·장비·프로젝트 | 아래 상세 메타데이터 구조 승인 필요 |

- 총 레코드는 추가 후 courses=11, course_weeks=132, offerings=1이다. 신규 레코드 6/72와 전체 건수를 혼동하지 않는다.
- 현재 course_weeks에는 실습과제 칼럼이 없고, courses에도 도구·장비·프로젝트 전용 필드가 없다. 주제 72개만 넣고 전체 상세 DB 전환이 완료됐다고 보고하면 안 된다.
- 권장 상세 구조 후보:
  - academy.course_profiles: course_id UUID PK/FK, core_topics text[], final_project text, deliverables text[], software text[], equipment text[], review_state, revision.
  - academy.course_week_practices: course_id UUID, week_number integer, practice text, PK(course_id,week_number), 기존 course_weeks의 동일 UNIQUE 키를 참조하는 복합 FK.
  - 소개·대상·목표·시간은 기존 courses 필드를 재사용한다. 같은 내용을 두 테이블에 중복 저장하지 않는다.
- 위 신규 테이블/뷰/조회 계약은 4단계 검토 후보다. 이번에는 생성하지 않는다.
- 신규 상세 데이터의 RLS는 기본 차단부터 설계하고 부모 공개상태와 검토 상태를 반영한 제한된 읽기 경로를 검토한다. 기존 RLS·RPC·GRANT를 완화하지 않는다.
- 현 단계의 상세 초안은 mock에서만 표시한다. Supabase 결과에 코드의 초안을 자동 혼합해 실제 DB 등록 정보처럼 보이게 하지 않는다.

## 5. 공개 전환·복구안

1. 데이터 추가 승인: 신규 6개·72주차와 승인된 상세 메타데이터를 draft로 추가한다. 기존 5개·60주차·기수 1개를 유지한다.
2. 비공개 검수: 목표·72개 과제·도구·학위/소속 표현·시간 미확정 표시를 확인한다.
3. 공개 전환 별도 승인: 신규 6개를 published로 전환하고 기존 5개의 공개 유지 또는 archived 전환을 승인 범위대로 처리한다.
4. 기존 5개 공개 유지 시 공개 목록은 11개일 수 있다. 기존 5개를 archived로 전환한 경우 신규 공개는 6개·72주차다.
5. 기존 강좌 비공개 시 옛 상세 URL이 공개 뷰에서 사라진다. 교육과정 종료/전환 안내 등 URL 정책을 승인받고 구현하기 전까지 무조건 비공개 전환하지 않는다.
6. 기존 비공개 시험 기수의 course_id·상태·공개여부는 그대로 둔다. 새 학과 기수 생성이나 실제 신청 접수는 별도 승인·B-04 검수 대상이다.
7. 공개 전환 실패 시 한 트랜잭션을 롤백하고 기존 상태를 복구한다. 커밋 후 복구는 사전 매니페스트의 기존 공개상태를 복원하고 신규는 draft로 돌리는 방식을 우선한다.
8. 신규 데이터 삭제는 원복의 기본 수단으로 삼지 않는다. 향후 기수·신청 참조가 생겼다면 FK로 연결된 데이터를 삭제해서는 안 된다.

## 6. 4단계 SQL 설계·격리 테스트 작업지시서

| 순서 | 작업·후보 파일 | 검증·완료 기준 |
| --- | --- | --- |
| 1 | docs/ai-fusion-db-preflight.md 후보 | 실제 프로젝트·5/60/1·마이그레이션·제약·RLS·실행자·스키마 권한 재확인. 비밀정보 없는 스냅샷·매니페스트 작성 |
| 2 | supabase/drafts/ai_fusion_course_data.sql 후보 | 고정 매니페스트의 6개/72건만 추가. 기존 ID/FK/행/공개상태 보존. 예상과 다른 기존 slug나 내용은 중단 |
| 3 | 상세 메타데이터 DDL/조회 후보 | 위 2개 테이블 또는 대체안 비교·승인. 자동 RLS 트리거와 소유권·최소 권한 검토. RPC v2 권한 변경 금지 |
| 4 | 공개 전환 별도 SQL 후보 | 추가와 공개 해제를 분리. 기존 기수 비공개 유지. 공개 목록 6/72 또는 승인한 정책 건수 확인 |
| 5 | rollback 후보 | 트랜잭션 실패 복구, 공개상태 복원, 신규 참조 존재 시 삭제 차단, 되돌릴 수 없는 정리 거부 |
| 6 | scripts/verify-ai-fusion-postgres.mjs 후보 | 실제 PostgreSQL 17 격리 환경에서 재실행·충돌·부분 실패·기존 행/FK/ACL/RLS·새 상세 필드·관리자 v2 회귀 확인 |
| 7 | 4단계 결과 보고 | 실행 SQL·해시·영향 건수·공개상태·복구 절차를 제시한 후 실제 개발 DB 적용 별도 승인 요청 |

- 재실행 정책: slug만 같다고 ON CONFLICT DO NOTHING으로 넘어가지 않는다. 매니페스트 소유 UUID·버전·필드·12주차 내용이 일치할 때만 이미 적용된 것으로 판정하고 불일치 시 중단하는 안을 검토한다.
- 실행 도중 마지막 주차 삽입 실패·중복 slug·FK 오류가 나면 전체 6/72 추가가 롤백되는지 확인한다.
- 기존 관리자 v2는 신청 테이블 존재 시 차단하는 보호 가드가 있다. 브랜드 데이터 SQL에서 신청 테이블을 만들거나 이 가드를 해제하지 않는다.
- B-04 동시 신청·정원 변경과 공개상태 변경의 통합 검수는 B-04의 정원 트랜잭션 검증과 구분한다.

## 7. 이번 격리 검증의 의미와 한계

- verify-ai-fusion-stage3.mjs는 6개·72주차/과제·이미지·ID·구 경로·별칭·잘못된 UUID 거절을 검사한다.
- PGlite의 폐기 가능한 DB에 기존 시드와 가상 기수 1개를 만들고 신규 6/72 추가 모델, 기존 행/FK 보존, draft 비공개, 공개 전환 및 롤백, 부분 삽입 실패 롤백을 검사한다.
- 이 테스트는 실제 개발 DB를 사용하지 않는다. 실제 기존 기수 UUID를 복제하거나 수정하지 않는다.
- 미래 상세 테이블의 권한, 실서버 자동 RLS 트리거·비슈퍼유저 실행 권한, 실제 PostgreSQL 동시성, SQL 후보의 멱등성·호스팅 적용 성공을 증명하지 않는다.
- 이번에는 실제 마이그레이션 후보 SQL 파일을 새로 작성·적용하지 않는다. 4단계에서 SQL과 실제 PostgreSQL 격리 검증을 준비한다.

## 승인 필요 사항

- 교육과정 내용은 검토용 초안으로만 승인된 범위다. 교육시간·모집·수강료·강사·장비·공식 소속/학위 정보는 별도 확인한다.
- 4단계 SQL/DDL 설계와 격리 테스트 진행 승인.
- 이후 실제 개발 DB 대상·실행 SQL·6/72 및 상세 필드·기존 공개상태 변경 범위·복구안에 대한 별도 승인.
- main 병합·Production 배포는 그 이후에도 최종 별도 승인이다.

출처: PR #35·#36·#37의 소스, 기존 Supabase 스키마 READ ONLY 조회, 사용자 승인 작업지시서.
