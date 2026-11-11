# 4단계 SQL·상세 메타데이터·공개 전환·복구 설계

이번 승인 범위는 후보 작성과 격리 검증이다. 실제 DB 적용·공개 전환·권한 확대는 승인되지 않았다.

## 파일과 단계

| 작업 | 후보 | 효과 |
| --- | --- | --- |
| 점검 | ai_fusion_stage4_preflight.sql | 실제 대상의 읽기 전용 건수·지문 비교 |
| A1 | ai_fusion_stage4_A1_schema.sql | 신규 메타데이터 2개 테이블과 비공개 통제 테이블 생성 |
| A2 | ai_fusion_stage4_A2_register.sql | 새 UUID의 6개 강좌·72주차·6개 profile·72개 실습과제 비공개 등록 |
| B | ai_fusion_stage4_B_publish.sql | 신규 6개만 published로 전환. 교육과정 review_state는 draft 유지 |
| C 기본 | ai_fusion_stage4_C_keep.sql | 기존 5개의 published 상태 유지 여부 확인. 수정 없음 |
| C 선택 | ai_fusion_stage4_C_archive.sql | URL 호환 검수 기록이 있고 B 이후일 때만 기존 5개 archived 후보 |
| D | ai_fusion_stage4_D_recover.sql | 기존 5개 원래 공개 상태 복원, 새 6개 draft 복귀. 등록 데이터는 삭제하지 않음 |

모든 SQL은 supabase/drafts에 있으며 정식 migrations 폴더에 넣지 않았다.
생성 근거는 stage-3 mock, source commit e0435679와 ai_fusion_stage4_manifest.json이다.
scripts/generate-ai-fusion-stage4.mjs --check가 소스/생성 후보의 일치를 검사한다. 실행해도 DB에 연결하지 않는다.

## 신규 식별자

| slug | 신규 UUID |
| --- | --- |
| ai-management | 95e0c83e-257f-562b-8ab7-9361dbf2d9a7 |
| ai-music | a6614259-a8cf-5b0b-a40c-686e3cb73169 |
| ai-aerial-video | d6748b74-32a8-5d06-a3a8-02240eef5cd2 |
| ai-multimedia | 2c8fbd28-95a7-55a8-a0e9-9046810430d7 |
| ai-programming | 9b9a5a7a-f639-5003-b2f1-6aa23dc30d51 |
| ai-advertising-video | 3ec3790d-4579-564d-ab49-ded60d6c601d |

- 고정 namespace의 UUID v5를 사용해 강좌 6개와 주차 72개의 ID를 재현한다. 기존 DB UUID를 재사용하지 않는다.
- 기존의 작동 중인 slug를 유지한다. 권장안과 다른 음악·광고영상 slug를 이 SQL에서 바꾸지 않는다.
- 기존 시연 기수 ID와 실제 UUID는 별개다. 실제 offerings 행을 생성·변경하지 않는다.

## 상세 정보 저장 구조 비교

| 안 | 장점 | 한계 | 선택 |
| --- | --- | --- | --- |
| 기존 courses/course_weeks 칼럼 확장 | 조인 감소 | 기존 테이블 DDL·조회 계약 변경, 필드가 늘어남 | 이번 후보에서 채택하지 않음 |
| courses의 JSON 덩어리 | 빠른 추가 | 기존 RLS 아래의 새 데이터 노출과 구조 검증을 별도 검토해야 함 | 채택하지 않음 |
| profile·practice 별도 테이블 | 기존 ID/FK/조회 계약 보존, 상세 접근 기본 차단 | 추가 조회 계약 필요 | 후보 채택 |

### 기존 테이블 재사용

- courses: 제목·slug·분야·소개·교육대상·대표 결과물·objectives 배열, duration_hours NULL, 초기 publication_state=draft.
- course_weeks: 새 고정 UUID·course_id·week_number 1~12·제목. 총 72행.
- 기존 5개·60주차의 행과 ID, offerings 1건의 UUID·FK·상태는 그대로 둔다.

### academy.course_profiles

- course_id UUID PK/FK → courses.id, ON DELETE RESTRICT.
- core_topics text[], final_project text, deliverables text[], software text[], equipment text[].
- review_state=draft / reviewed, revision 양의 정수.
- 배열은 비어 있거나 NULL/빈 문자열 요소를 포함할 수 없다.
- 이번 6개는 draft / revision=1이다. B 공개 전환은 review_state를 reviewed로 바꾸지 않는다.
- 검토 상태 수정·개정 승인·버전 갱신용 RPC는 이번에 만들지 않았다. 향후 승인된 개정 매니페스트와 통제 상태 갱신 설계가 필요하다. 수동 편집 후 덮어쓰기하는 방식은 허용하지 않는다.

### academy.course_week_practices

- PK(course_id,week_number), week_number 1~12, 비어 있지 않은 practice.
- 기존 course_weeks의 UNIQUE(course_id,week_number)에 복합 FK, ON DELETE RESTRICT.
- 목표·소개를 중복 저장하지 않고, 주차 주제와 실제 과제의 1:1 대응을 유지한다.

### private_education.ai_fusion_runs

- 배치 키·스키마 지문·기존 보안 지문·기준 데이터 스냅샷·예상 현재 스냅샷·매니페스트·단계·작업 이력.
- 역할/원본 데이터 변경을 자동 보정하지 않는다. 예상 값과 다르면 중단한다.
- 이력은 작업명·시각·SQL 실행자 postgres를 기록한다. 인증된 관리자 개인의 감사 이력을 구현한 것은 아니다.
- 원본 교육정보 복사본은 이 비공개 테이블에만 저장한다. 신청자·Auth 사용자 정보는 포함하지 않는다.

## 보안 경계

- 새 3개 테이블 owner=postgres, RLS 활성, 허용 정책 없음.
- PUBLIC·anon·authenticated·service_role·academy_offering_executor의 권한을 새 테이블에서만 REVOKE한다.
- 신규 테이블에 양의 GRANT·공개 뷰·정책·SECURITY DEFINER 함수·새 실행 역할을 만들지 않는다.
- 기존 테이블·기존 RLS·기존 GRANT·RPC v2·Auth schema·기본 ACL을 변경하지 않는다.
- 새 상세 데이터는 B로 강좌가 공개돼도 API 역할에서 읽을 수 없다. SELECT 가능한 것은 기존 공개 뷰의 승인된 기본 필드와 주차 제목이다.
- 상세 메타데이터의 공개 조회·관리자 편집 연결은 별도 최소 권한/조회 계약 검토와 승인 대상이다. 현재 Next.js의 Supabase 경로에 mock 상세를 섞지 않는다.
- current_user=postgres, READ COMMITTED 조건을 요구한다. B-04 신청 테이블을 감지하면 통합 재검토 없이 진행하지 않는다.

## 중복·충돌·동시 실행

- A1은 한 번만 실행한다. 동일 이름의 객체가 있으면 채택하거나 덮어쓰지 않고 중단한다. 재실행이 안전하게 거부되는 것은 의도된 동작이다.
- A2는 매니페스트와 스냅샷이 정확히 같을 때만 no-op 재실행한다. 일부 행이나 slug가 같다는 이유로 건너뛰지 않는다.
- 새 UUID/slug 충돌·구 스냅샷 변경·메타데이터 ACL/RLS/DDL 변경·기존 RPC/보안 변경은 중단한다.
- advisory transaction lock과 core/metadata SHARE ROW EXCLUSIVE 테이블 잠금으로 배치 실행을 직렬화한다. 기존 관리자 v2는 수정하지 않는다.
- 관리자 기수 변경이 먼저 커밋되면 후보가 잠금을 기다린 후 스냅샷 불일치를 감지한다. 관리자 변경을 되돌리거나 덮어쓰지 않는다.
- lock_timeout=5s / statement_timeout=30s이다. 잠금을 오래 잡을 수 있는 실행은 중단하고 운영자가 재검토한다.

## A/B/C/D 건수와 공개 상태

| 상태 | 전체 강좌/주차/기수 | 공개 강좌/주차/기수 | 상세 API |
| --- | --- | --- | --- |
| 현재 | 5/60/1 | 5/60/0 | 신규 데이터 없음 |
| A1+A2 후 | 11/132/1 | 5/60/0 | 차단 |
| B+C 유지 | 11/132/1 | 11/132/0 | 차단 |
| B+C 비공개 후보 | 11/132/1 | 6/72/0 | 차단 |
| D 복구 | 11/132/1 | 5/60/0 | 차단 |

- C 기본안은 유지다. 현재 옛 강좌 상세는 DB 공개 뷰에 의존하므로 archived로 바꾸면 404 가능성이 있다.
- C_archive는 academy.ai_fusion_legacy_url_policy 설정에 검수 증거 참조가 없으면 거부한다. 이는 권한 부여나 URL 구현 검증 장치가 아니라 검토자가 남기는 전제 기록이다.
- 격리 테스트의 fixture-only-reviewed-policy는 가상 값이다. 실제 사이트 URL 호환 기능은 이번에 구현하지 않았다.
- 실제 C_archive는 URL 종료/이관 안내 구현·검수와 별도 승인 전까지 실행 불가다.
- B도 신규 상세 조회 계약·초안 안내의 DB 기반 화면 검수 및 별도 공개 승인이 필요하다. SQL 동작 통과만으로 제품 공개 준비 완료라고 판정하지 않는다.

## 실패 및 복구

| 시점 | 자동 롤백 범위 | 별도 처리 |
| --- | --- | --- |
| A1 내부 실패 | 새 3개 테이블·통제 행 포함 A1 전체 롤백 | 기존 데이터 유지 |
| A1 성공, A2 실패 | A2 신규 6/72·profile/practice 삽입 전체 롤백 | A1의 닫힌 스키마·schema_only 통제 행은 남음 |
| B/C/D 내부 실패 | 해당 파일의 상태 변경과 통제 이력 전체 롤백 | 이전 커밋은 유지 |
| B/C 커밋 후 공개 취소 | 자동 원복 아님 | 승인된 D로 공개 상태 복구 |
| 신규 참조/수동 수정/보안 변화 후 | 후보가 거부 | 최신 상태 분석·추가 승인 필요 |

- SQL은 BEGIN/COMMIT을 포함한다. 오류 후 같은 연결을 사용할 때는 ROLLBACK이 필요하다. 미래 실행기는 ON_ERROR_STOP과 실패 시 연결 종료/롤백을 보장해야 한다.
- D는 신규 강좌·주차·메타데이터를 삭제하지 않는다. 등록 취소로 행을 완전히 제거하는 SQL은 제공하지 않는다.
- 기존 5개 원래 공개상태를 저장된 기준선으로 복원하고 신규 6개를 draft로 되돌린다.
- 실제 사용자 신청·신규 기수 참조·정책 변경이 생겼다면 D를 강행하지 않는다. 데이터 보존과 업무 영향 검토가 먼저다.

## 후보 SHA-256

- A1: 655CFD93B8D0C0E7090C2C201A6B294D0E2F5C0B06509E5A7B3A5216E91300F5
- A2: 737D574EA15BE5B20C8F5E02376D2DCE0A72C0365B555142B3036DEFBE6D4C95
- B: 854AD6E480CA07A6BE511C2B1DCC6FC08C8E537CD2ADB46DD2C946054276511F
- C_keep: 4C23BC3393899D3C6555E305A755D3B90639B402E89A5972DEDC481DAC959B8B
- C_archive: 8870F980548F9CAF99420C3D4F6582E06CC044A47EFD74BB76AEAC9CD3294093
- D: 8C3779712BCDFA58E8EED27F08629D571143DD386A3B5E210FD306BEF647E5C7
- manifest: 9FF046C4A79A865FC2F8FD046E85FAA2F9717DE93541B36EAD9043EF88DF0C9F
