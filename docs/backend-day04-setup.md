# 백엔드 4일차 개발 환경 준비 현황

작성일: 2026년 11월 7일

상태: **개발 DB 적용 및 메타데이터 검증 완료 — 공개 접근·관리자 인증과 재현 검증 대기**. 이 문서는 `codex/backend-day04` 작업 브랜치의 진행 기록입니다.

## 준비한 항목

- Supabase CLI `3.0.0`을 프로젝트 개발 의존성으로 정확한 버전으로 고정하고 npm 잠금 파일에 반영했습니다.
- `supabase init`으로 로컬용 `supabase/config.toml`을 생성했습니다. 새 public 테이블의 API 자동 노출은 끄고 아직 준비되지 않은 시드 실행도 비활성화했습니다. 원격 프로젝트 연결값이나 비밀키는 추가하지 않았습니다.
- `supabase/drafts/course_foundation.sql`에 개인정보가 없는 강좌·주차·기수의 비공개 기초 스키마를 **검토용 초안**으로 작성했습니다. 접근 정책은 기본 거부이며 신청·문의 테이블이나 실제 데이터는 포함하지 않습니다. 기수 상태 등 미확정 정책은 향후 수정할 수 있습니다.
- `supabase/drafts/course_foundation_check.sql`에 RLS 활성화, 공개 역할의 스키마 접근 제한, slug·주차 중복, 정원·날짜와 외래키 제약을 확인하는 테스트를 준비했습니다. 테스트 데이터는 트랜잭션 롤백으로 남기지 않습니다.
- 초안과 검수 SQL은 임시 메모리 기반 PostgreSQL 호환 엔진 PGlite 0.5.15에서 실행해 통과했습니다. **이는 실제 Supabase나 마이그레이션 재현 검증을 대신하지 않습니다.** PGlite는 검수용 임시 도구이며 프로젝트 의존성에 추가하지 않았습니다.
- 기존 프런트엔드의 타입 검사·ESLint·빌드가 통과했습니다. npm 감사 결과는 19일차와 같은 중간 등급 8건, 높음·심각 0건이었습니다.

## 개발 DB 적용 및 확인 결과

- 사용자가 승인한 개발 프로젝트 `ai-education-hub-dev` (`uenvjqgylrevujdjpfed`)에만 Supabase MCP의 마이그레이션 기능을 사용해 적용했습니다. 원격 기록은 `20261107100302_academy_course_foundation`이며 로컬 파일명도 동일한 버전입니다. 원격 기록에 보관된 SQL과 로컬 파일은 끝의 불필요한 빈 줄만 다르며 SHA-256은 다릅니다.
- 적용 전 `academy` 스키마와 마이그레이션 이력이 없음을 확인했습니다. 적용된 SQL은 GitHub 초안과 스키마·권한 구문이 동일하며 마이그레이션 실행기를 위해 명시적 BEGIN/COMMIT만 제외했습니다. 이전 CLI dry-run은 IPv6 미지원으로 실패했고 반복하지 않았습니다.
- 실제 개발 DB의 `academy.courses`, `academy.course_weeks`, `academy.offerings` 테이블 세 개와 각각의 RLS 활성화를 확인했습니다. 두 외래키, 세 기본키, slug·주차 고유 제약, 정원·날짜·문자열 등의 CHECK 제약이 유효 상태임을 카탈로그에서 확인했습니다. 테스트 데이터는 개발 DB에 입력하지 않았습니다.
- 실제 DB에서 anon과 authenticated의 academy 스키마 USAGE·CREATE 권한이 없고, 세 테이블의 SELECT·INSERT·UPDATE·DELETE·TRUNCATE·REFERENCES·TRIGGER·MAINTAIN 권한 48개 조합이 모두 거부됨을 유효 권한 함수로 확인했습니다. 실제 역할로 API 요청을 보내는 검사는 수행하지 않았습니다.
- 세 테이블에는 정책이 없으며 Supabase Advisor는 이에 대해 INFO 3건을 표시합니다. 현재 기본 거부 설계에 따른 상태로, 공개 조회와 관리자 처리는 후속 정책과 인증 구현 전까지 제공되지 않습니다. service_role과 postgres는 RLS를 우회할 수 있습니다.
- 기존 `public.rls_auto_enable()`의 anon과 authenticated 관련 보안 경고 2건은 그대로입니다. 적용 전후 함수 정의의 해시와 `ensure_rls` 이벤트 트리거 설정이 같음을 확인했습니다. 기존 public 기본 권한이나 다른 프로젝트를 변경하지 않았습니다. 실제 악용 가능성은 미검증입니다.
- Docker Linux 엔진은 사용할 수 없어 로컬 Supabase에서 마이그레이션 재현은 미검증입니다. PGlite에서의 제약조건과 역할 테스트는 실제 Supabase 재현·API 검증을 대신하지 않습니다. 앱·Vercel은 DB에 연결하지 않았고 신청·문의는 시연 상태입니다.

## 남은 작업

1. 기존 public 함수 보안 경고와 public 기본 권한의 영향을 별도 검토합니다. 관련 객체를 자동으로 수정하지 않습니다.
2. 개발 DB의 API 노출 설정과 실제 비관리자·관리자 요청을 역할·세션 구현 후 검수합니다. 공개 조회 정책과 개인정보 처리는 요구사항 확정 후 구현합니다.
3. 별도의 일회용 Supabase 환경에서 마이그레이션 재현 및 실패·복구 절차를 검증합니다. 운영 프로젝트와 기존 다른 프로젝트는 변경하지 않습니다.

참고: [Supabase 로컬 개발 안내](https://supabase.com/docs/guides/local-development/cli-workflows), [CLI v3 변경 사항](https://supabase.com/changelog/supabase-cli-v3), [3일차 데이터 모델](backend-day03-data-model.md).
