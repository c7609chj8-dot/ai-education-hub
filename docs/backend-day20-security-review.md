# 백엔드 20일차: 보안 검수

검수일: 2026년 11월 8일 (한국 시간)
대상: `codex/backend-day19`를 기준으로 한 코드·SQL 초안 및 Supabase 개발 프로젝트 `uenvjqgylrevujdjpfed`
결론: **개발용 보안 보완과 제한된 검수를 수행했습니다. 실제 관리자 인증·API·운영 검수가 남아 있어 서비스 개시 승인 상태가 아닙니다.**

## 이번에 수정한 사항

1. 공통 Supabase 설정이 임의의 HTTPS 주소를 허용해 인증 비밀번호가 잘못 설정된 호스트로 전송될 가능성이 있었습니다. 현재 승인된 개발 프로젝트의 정확한 HTTPS 원본과 빈 경로만 허용하고, 다른 프로젝트·localhost·사용자 정보·경로·쿼리·프래그먼트가 있으면 닫힌 상태로 처리합니다. 이 제약은 인증뿐 아니라 공통 설정을 사용하는 공개·관리자 데이터 접근에도 적용됩니다. 운영 프로젝트를 사용하려면 별도의 환경 분리 설계와 검증이 필요합니다.
2. 강좌·기수 관리자 서비스가 다른 관리자 경로와 달리 고권한 클라이언트 생성 직전에 프로젝트 주소를 독립적으로 확인하지 않았습니다. 공통 설정 고정 외에 해당 경로에도 동일한 검사를 추가했습니다. 이는 환경 설정 오류에 대한 방어이며, 환경변수 자체를 공격자가 변경할 수 있다는 사실을 확인한 것은 아닙니다.
3. 강좌·기수 저장 중 연결이 끊기면 실제로 반영됐을 수 있는데도 실패로 단정하던 화면을 수정했습니다. 결과 미확인으로 안내하고 입력을 보존하며 같은 화면의 재저장을 잠급니다. 이는 서버 쪽 멱등성이나 동시 편집 충돌 방지가 아닙니다. 확인 전 새로고침이나 다른 기기에서 반복하지 않도록 운영 절차가 필요합니다.
4. 전체 경로에 `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`을 추가하고 `X-Powered-By`를 비활성화했습니다. 이는 완전한 CSP·HSTS·브라우저 보안 검수를 대신하지 않습니다.

## 실제 개발 DB 읽기 전용 점검

- 프로젝트 이름과 ID는 `ai-education-hub-dev` / `uenvjqgylrevujdjpfed`, 상태는 `ACTIVE_HEALTHY`로 조회됐습니다. 마이그레이션 이력은 `20261107100302_academy_course_foundation` 1건입니다.
- `academy.courses`, `academy.course_weeks`, `academy.offerings` 3개 테이블에 RLS가 활성화됐고, `anon`·`authenticated`의 테이블 SELECT/쓰기 및 개별 열 SELECT·INSERT·UPDATE·REFERENCES 권한을 카탈로그 함수로 확인한 결과 모두 없었습니다. 실제 사용자 토큰을 이용한 API 우회 시도는 수행하지 않았습니다.
- Security Advisor는 위 3개 테이블에 대한 **RLS 정책 없음 INFO 3건**을 보고했습니다. 현재 공개 역할에 권한이 없는 기초 스키마의 상태이므로 INFO만으로 데이터 노출을 단정하지 않습니다. 이후 공개 정책 초안 적용 시 각각 재검증해야 합니다. [관련 안내](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)
- 기존 `public.rls_auto_enable()`은 `SECURITY DEFINER`이며 `anon`과 `authenticated`에 EXECUTE가 있어 Advisor **WARN 2건**이 여전히 존재합니다. `ensure_rls` 이벤트 트리거는 활성 상태로 조회됐습니다. 함수·트리거와 권한은 변경하지 않았습니다. [익명 역할 경고](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable) · [인증 역할 경고](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)
- 8~19일차 SQL과 20일차 변경사항은 실제 개발 DB에 적용하지 않았습니다. 서비스 키나 사용자 데이터는 조회하지 않았습니다.

## 코드·격리 검증 결과

- 서버 관리자 인가는 검증된 Supabase `getUser()` 결과와 관리자 ID 허용목록을 사용하며 사용자 수정 가능 메타데이터에 의존하지 않습니다. 관리자 서비스 기능은 기본 비활성이며 각 요청에서 다시 검사합니다. 실제 계정의 세션 만료·회수와 역할 변경은 미검증입니다.
- 공개 신청·문의 컴포넌트와 서버 검증 코드는 실제 접수 API 또는 원격 저장 어댑터에 연결돼 있지 않습니다. 동의 안내·오용 방지·정원 및 중복 정책 검증 전에는 공개 접수를 열 수 없습니다.
- 격리 로컬 PostgreSQL에서 8~19일차 관련 초안을 조합해 이력 조회의 일반 역할 차단·범위·감사 기록 실패 시 차단을 확인했습니다. 강좌·기수 함수 권한은 별도 PGlite 검증을 수행했습니다. 실제 Supabase 권한 검증을 대신하지 않습니다.
- 가상 서비스·가상 계정과 별도 브라우저에서 관리자 외 요청 차단, 이력 조회, 비활성 기능, 응답 보안 헤더, 가상 서버 키의 HTML 미포함을 확인했습니다. 강좌와 기수의 저장 후 응답 유실을 각각 재현해 입력 보존·재저장 잠금을 확인했습니다.
- 관리·신청·문의·파일·이력 서비스 테스트, `test:security-config`, `test:security-management`, `test:security-actions`, TypeScript·ESLint·전체 빌드가 통과했습니다. 검사 범위는 실행한 테스트에 한정됩니다.
- 검사 시점에 Git 추적·스테이징된 파일 목록 196개 중 3MB 이하 파일에서 제한된 패턴의 비밀 키·개인키·JWT·AWS 키를 검사했고 일치 파일은 없었습니다. `.env.local`은 Git 추적 대상이 아니고 ignore 설정에 포함됩니다. 빌드된 `.next/static`의 JS/JSON/HTML 파일에서 서버 키 문자열·환경변수명 패턴을 검사했으며 일치가 없었습니다. 이 제한된 패턴 검사는 모든 비밀이나 Git 과거 이력의 노출 부재를 증명하지 않습니다.
- `npm audit --omit=dev`: 알려진 운영 의존성 취약점 0건. 전체 `npm audit`: 중간 등급 8건(직접 원인 `minimatch`의 [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249), 개발용 `typescript-eslint`/`eslint-config-next` 의존 체인). 자동 수정 제안은 현재 Next 설정과 다른 주요 버전을 제안하므로 이번에 자동 변경하지 않았습니다. 호환 가능한 수정 버전과 영향 범위는 별도로 검증해야 합니다.

## 운영 전 차단 항목과 한계

1. 기존 `rls_auto_enable()` 두 경고는 격리 검증과 사용자 승인 후 별도 보안 변경으로 다룹니다. 자동 RLS 트리거를 삭제하거나 속성을 임의 변경하지 않습니다.
2. 실제 개발 DB 적용 전 8~19일차 초안의 객체·정책·GRANT·마이그레이션 순서·롤백을 다시 검토하고 별도 승인을 받습니다. 실제 관리자 계정, 만료·회수 세션, Data API, RLS 및 직접 호출 차단은 실제 개발 환경에서 검증해야 합니다.
3. 로그인·신청·문의·공개 파일에 대한 요청 제한·악용 방지는 아직 구현·검증하지 않았습니다. 비공개 Storage 버킷 구성, 파일 출처·형식 안전성·악성코드 검사와 메타데이터 제거, 잔여 파일 정리도 필요합니다.
4. 개인정보 수집 근거·안내·보존·삭제·백업 정책 및 담당자 권한을 기관이 확정해야 합니다. 이력은 일부 행위가 빠지고 고권한 키 보유자의 위조를 방지하지 못합니다. [19일차 이력과 개인정보 처리 초안](backend-day19-activity-privacy.md)을 참고합니다.
5. 서버 전용 키는 프로젝트 전반의 고권한을 갖습니다. 환경별 분리·최소 접근·교체 및 로그의 개인정보·비밀 노출 검증이 필요합니다. 키가 없는 상태에서 제한된 함수 GRANT만으로 키의 권한이 제한된다고 주장할 수 없습니다.
6. CSP, HSTS, 실제 Vercel Preview/운영의 최종 헤더·쿠키·캐시, 브라우저 번들·로그의 실제 값 노출, 외부 침투 검사는 수행하지 않았습니다. 이미지 미리보기와 실제 운영 콘텐츠, 운영 보안 점검도 별도입니다.

운영 DB, 다른 Supabase 프로젝트, 기존 보안 마이그레이션 초안, `main`과 운영 배포는 변경하지 않았습니다.
