# B-03-3 후속: 공개 주차 뷰 오류·접근 검수

점검 일자: 2026-11-08. 대상: `ai-education-hub-dev` / `uenvjqgylrevujdjpfed`. 스키마·권한·데이터를 변경하지 않았다.

## HTTP 500의 원인

`public.published_course_weeks`는 `academy.course_weeks`와 `academy.courses`를 JOIN하고 공개 강좌에 속한 주차를 반환하는 `security_invoker=true` 뷰다. 실제 `information_schema.views`에서 이 뷰의 `is_updatable`과 `is_insertable_into`는 모두 `NO`였다.

익명 Data API의 실제 응답을 확인했다. 모든 요청에서 SQLSTATE는 `55000`, HTTP 상태는 500이다.

| 요청 | PostgreSQL 메시지 |
| --- | --- |
| POST | `cannot insert into view "published_course_weeks"` |
| PATCH | `cannot update view "published_course_weeks"` |
| DELETE | `cannot delete from view "published_course_weeks"` |

세 응답의 상세 메시지는 `Views that do not select from a single table or view are not automatically updatable.`였다. 빈 POST는 필수 NOT NULL 열을 생략했고, PATCH·DELETE는 같은 `course_id`에 대해 `eq`와 `neq`를 함께 적용한 모순 조건을 사용했다. 존재하는 행을 바꿀 수 없는 요청으로 오류를 재현했다.

PostgreSQL은 여러 테이블을 JOIN한 이 뷰를 자동 갱신할 수 없다고 보고했고, PostgREST의 오류 매핑은 SQLSTATE `55*`를 HTTP 500으로 전달한다. 이는 실제로 관찰된 **뷰 구조 오류**이며, 권한 부족 오류 `42501`과 구분해야 한다. 비교 요청으로 익명 `published_courses` 빈 POST는 HTTP 401 / `42501`, `permission denied for view published_courses`였다. [PostgreSQL 뷰 자동 갱신 조건](https://www.postgresql.org/docs/17/sql-createview.html), [PostgREST 오류 매핑](https://docs.postgrest.org/en/stable/references/errors.html)

조회는 정상이다. 쓰기 시 잘못된 500 응답이 모니터링 잡음 또는 클라이언트 오류 처리 혼란을 유발할 수 있다. 읽기 전용 뷰를 갱신 가능하도록 만들거나 권한을 넓힐 필요는 확인되지 않았다. 향후 API 계층에서 비허용 HTTP 메서드를 명확히 차단하는 방안은 별도 영향 검토 대상이며 이번에는 구현하지 않았다.

## 접근 및 데이터 검증

- 실제 익명 Data API GET은 강좌 5건·주차 60건 모두 HTTP 200이었다.
- DB 카탈로그에서 `anon`과 `authenticated`는 두 뷰에 SELECT, 기초 테이블에는 허용 열의 SELECT만 있다. 두 뷰와 두 기초 테이블 모두 두 역할의 INSERT·UPDATE·DELETE 테이블 권한 및 INSERT·UPDATE 열 권한은 없다.
- 실제 익명 시험 쓰기 요청 4건(주차 POST·PATCH·DELETE, 강좌 POST)은 모두 오류로 끝났다. 이 결과는 시험한 요청의 관찰이며, 실제 인증 JWT를 사용한 모든 쓰기 시도의 검증은 아니다.
- 시험 전후 강좌·주차의 모든 행을 정렬한 JSON 집계의 SHA-256을 각각 비교해 두 해시가 그대로임을 확인했다. 최종 강좌 5건·주차 60건이었다.
- `npm run test:public-course-migration`의 격리 PGlite에서 공개/비공개 강좌, 비공개 강좌의 주차 차단, 허용·비허용 열, anon/authenticated 역할을 검증했다. 실제 개발 DB에 비공개 시험 행은 만들지 않았다. 실제 비공개 데이터의 API 차단은 미검증이다.
- `auth.users`는 조회 시점 0건이었고 실제 일반 사용자 JWT가 준비되지 않아 실제 로그인 사용자 API 검증은 미실시다. 사용자별 정보·비밀값은 조회하거나 기록하지 않았다.
- Security Advisor는 WARN 0건, `academy.offerings`의 정책 없는 RLS INFO 1건을 반환했다. 이는 전체 보안 검증 완료를 의미하지 않는다. [Advisor 설명](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)

## 프로젝트 검사와 후속 조건

- `npx tsc --noEmit`: 통과.
- `npm run lint -- --max-warnings=0`: 통과.
- 기본 `npm run build`: 실패. Turbopack이 `src/app/globals.css.css` 처리 중 Node 자식 프로세스가 연결 전에 종료됐다고 보고했다. 샌드박스 및 권한을 확대한 환경에서 동일했다. 원인은 미확정이다.
- 대체 `npx next build --webpack`: 권한을 확대한 환경에서 통과했다. 샌드박스에서는 기존 빌드 출력 디렉터리 생성이 EPERM으로 중단됐다. Webpack 통과는 기본 Turbopack 빌드 통과를 뜻하지 않는다.

B-03-4의 계획 및 독립적인 개발은 시작할 수 있다. 다만 기본 빌드 실패 조사, 실제 사용자 JWT와 비공개 행 API 검증, 운영 전 전체 검수는 별도 완료 조건이다. 실제 DB의 비공개 행 시험이 필요하면 가상 행 생성·검증·정리 범위를 먼저 보고하고 별도 승인받는다. main 병합과 운영 배포는 하지 않았다.
