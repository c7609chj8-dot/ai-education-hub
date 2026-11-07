# 백엔드 4일차 개발 환경 준비 현황

작성일: 2026년 11월 7일

상태: **부분 완료 — 개발 DB 확인, 보안 검토 및 Supabase 마이그레이션 검증 대기**. 이 문서는 `codex/backend-day04` 작업 브랜치의 진행 기록입니다.

## 준비한 항목

- Supabase CLI `3.0.0`을 프로젝트 개발 의존성으로 정확한 버전으로 고정하고 npm 잠금 파일에 반영했습니다.
- `supabase init`으로 로컬용 `supabase/config.toml`을 생성했습니다. 새 public 테이블의 API 자동 노출은 끄고 아직 준비되지 않은 시드 실행도 비활성화했습니다. 원격 프로젝트 연결값이나 비밀키는 추가하지 않았습니다.
- `supabase/drafts/course_foundation.sql`에 개인정보가 없는 강좌·주차·기수의 비공개 기초 스키마를 **검토용 초안**으로 작성했습니다. 접근 정책은 기본 거부이며 신청·문의 테이블이나 실제 데이터는 포함하지 않습니다. 기수 상태 등 미확정 정책은 향후 수정할 수 있습니다.
- `supabase/drafts/course_foundation_check.sql`에 RLS 활성화, 공개 역할의 스키마 접근 제한, slug·주차 중복, 정원·날짜와 외래키 제약을 확인하는 테스트를 준비했습니다. 테스트 데이터는 트랜잭션 롤백으로 남기지 않습니다.
- 초안과 검수 SQL은 임시 메모리 기반 PostgreSQL 호환 엔진 PGlite 0.5.15에서 실행해 통과했습니다. **이는 실제 Supabase나 마이그레이션 재현 검증을 대신하지 않습니다.** PGlite는 검수용 임시 도구이며 프로젝트 의존성에 추가하지 않았습니다.
- 기존 프런트엔드의 타입 검사·ESLint·빌드가 통과했습니다. npm 감사 결과는 19일차와 같은 중간 등급 8건, 높음·심각 0건이었습니다.

## 현재 개발 환경과 확인 사항

1. 개발 전용 `ai-education-hub-dev` 프로젝트가 `time` 조직에 존재하며 정상 상태입니다. PostgreSQL 17, 리전은 `ap-northeast-1`입니다. 신규 프로젝트를 만들지 않았습니다.
2. 2026년 11월 7일 읽기 전용 점검 기준 개발 DB에 `academy` 스키마와 기록된 마이그레이션은 없습니다. 마이그레이션 기록이 없다는 사실만으로 다른 DDL의 실행 이력이 전혀 없었다고 단정할 수는 없습니다.
3. 기존 `public.rls_auto_enable()`에 대해 anon과 authenticated 역할의 SECURITY DEFINER 함수 실행 권한 경고가 각각 1건 있습니다. 실제 악용 가능성은 확인하지 않았습니다. 별도로 public 스키마의 일부 기본 테이블 권한에는 RLS가 통제하지 않는 TRUNCATE 등이 포함됩니다. 권한은 생성자별로 다르며 API를 통한 실제 실행 가능성은 별도 확인이 필요합니다.
4. Docker Desktop의 Linux 엔진에 연결되지 않아 로컬 Supabase와 실제 Supabase에서 초안을 실행하지 못했습니다. 위 SQL 검수는 PGlite에서만 수행했습니다.
5. 실제 DB에는 SQL을 적용하지 않았고 `supabase/migrations`에도 적용 가능한 마이그레이션을 만들지 않았습니다. 앱과 Vercel에도 개발 DB를 연결하지 않았습니다. 공개 사이트의 신청과 문의는 시연 상태입니다.

## 적용 전 계획

1. 기존 public 함수의 용도와 종속성을 확인하고, 공개 실행 권한과 기본 테이블 권한을 어떻게 처리할지 검토합니다. Supabase 관리 역할의 기본 권한을 일괄 변경하지 않습니다.
2. 적용 직전 개발 프로젝트 ID, 스키마 존재 여부, 마이그레이션 기록, 대상 설정과 복구 방법을 다시 확인합니다. 초안은 `CREATE SCHEMA academy`를 사용하므로 재실행 시 실패합니다. 기존 스키마에 무조건 적용하거나 `IF NOT EXISTS`로 대체하지 않습니다.
3. 사용자 승인과 안전한 실제 Supabase 검증 환경이 준비되면 버전이 지정된 마이그레이션을 만들고 개발 환경에만 적용합니다. 롤백 테스트 SQL은 INSERT를 포함하므로 테스트용 DB에서만 실행합니다.
4. RLS, 세 테이블에 대한 anon/authenticated의 모든 테이블 권한, 중복 적용 및 마이그레이션 이력을 검증합니다. 초안에는 공개 읽기 정책이 없으므로 앱의 공개 데이터 조회는 별도 설계가 필요합니다. service_role과 postgres는 RLS 우회 역할입니다.
5. 운영 프로젝트와 다른 기존 프로젝트는 변경하지 않습니다. 신청·문의 개인정보 구조, 관리자 역할, 공개 읽기 정책은 요구사항이 확정된 후 별도로 구현합니다.

참고: [Supabase 로컬 개발 안내](https://supabase.com/docs/guides/local-development/cli-workflows), [CLI v3 변경 사항](https://supabase.com/changelog/supabase-cli-v3), [3일차 데이터 모델](backend-day03-data-model.md).
