# 백엔드 5일차: RLS·접근 권한·키 관리

작성일: 2026년 11월 7일

상태: **부분 완료 — 격리 환경 검증 및 운영 설계. 실제 Supabase 적용과 관리자 인증 검증 대기.**

## 현재 범위

4일차의 `academy` 초안은 아직 원격 DB에 존재하지 않습니다. 사용자가 요청한 읽기 전용 검토 범위를 유지하므로 원격 SQL 적용, 설정 변경, 키 생성 및 앱 연결은 하지 않았습니다. 아래 검증은 가상 데이터만 사용한 일회용 PGlite에서 이뤄졌으며 실제 Supabase, Data API, 인증·세션 또는 배포 환경 검증이 아닙니다.

| 역할 | 현재 초안에서 의도한 접근 | 격리 검증 |
| --- | --- | --- |
| anon | `academy` 스키마와 세 테이블 직접 접근 차단 | 실제 SELECT 거부 확인 |
| authenticated | 로그인만으로 관리자 권한 없음; 직접 접근 차단 | 실제 SELECT 거부 확인 |
| RLS | 세 테이블 활성화, 정책이 없어 일반 역할 기본 거부 | 테스트에서만 임시 SELECT 권한을 준 뒤에도 세 테이블에서 0행 확인 |
| service_role | BYPASSRLS이지만 별도 스키마·테이블 권한도 필요 | 테스트용 역할에 권한을 임시로 주자 세 테이블의 가상 행 조회 확인 |
| 관리자 | 계정·역할·세션 검증 방식 미구현 | 실제 관리자 허용/비관리자 차단은 6~7일차 이후 실제 인증 환경에서 검증 필요 |

`supabase/drafts/day05_access_check.sql`은 가상 행과 임시 GRANT를 사용하므로 **일회용 테스트 DB 전용**입니다. 트랜잭션 ROLLBACK을 포함하지만 원격 DB에 실행하지 않습니다. 실제 앱에서 이 테스트의 임시 GRANT를 적용하라는 뜻이 아닙니다. 4일차 검사와 함께 PGlite에서 실행했고 테스트 후 가상 행이 남지 않는지 확인했습니다. 이 검증은 SELECT 중심이며 쓰기 정책, API, 세션 및 향후 공개 정책의 안전성을 보증하지 않습니다.

## 접근·키 관리 원칙

- `academy`는 현재 로컬 API 노출 목록에 없고 기본 접근이 차단된 설계입니다. 로컬 설정만으로 원격 노출 설정을 증명할 수 없습니다. 공개 강좌 조회는 공개 범위·열·행 및 연결 방법을 확정해 별도로 구현합니다.
- anon과 authenticated는 관리자 역할이 아닙니다. 익명 로그인 사용자가 authenticated 역할을 가질 수 있으므로 서버에서 신뢰 가능한 세션과 별도 관리자 역할을 확인합니다. 사용자 수정 가능한 `user_metadata`를 인가 근거로 사용하지 않습니다.
- 새 연동은 공개 클라이언트의 publishable 키와 서버 비밀 키를 구분합니다. 브라우저의 공개 키는 접근 허가가 아니며 RLS와 객체 권한을 함께 검사합니다. 비밀 키와 기존 service_role 키는 저장소·클라이언트·로그·`NEXT_PUBLIC_` 환경변수에 넣지 않습니다. 비밀 키의 RLS 우회와 서버 측 인가를 별도 검증합니다.
- 개발·Preview와 운영은 각각의 Supabase 프로젝트와 자격증명을 사용합니다. Preview가 운영 DB에 쓰지 못하도록 환경별 연결과 실제 요청을 검수하고, 키 발급·교체·회수 담당자와 절차를 운영 전 확정합니다. 이번 작업에서 값 조회·저장·설정은 하지 않았습니다.
- 뷰, SECURITY DEFINER 함수 및 향후 테이블 추가 시 실행 권한, API 노출, RLS 우회 및 기본 권한을 각각 검토합니다. RLS는 TRUNCATE 같은 테이블 권한을 통제하지 않습니다.

## 남은 작업과 검수

1. 4일차에서 확인된 기존 `public.rls_auto_enable()`의 anon/authenticated 관련 경고 2건 및 public 기본 테이블 권한의 실제 영향을 검토합니다. 이벤트 트리거 함수에 대한 경고가 실제 RPC 악용을 뜻하는지 확인되지 않았습니다. Supabase 관리 역할 권한을 일괄 변경하지 않습니다.
2. 개발 프로젝트에 대한 적용 범위를 확정한 뒤 스키마·버전 관리 마이그레이션을 적용하고, 실제 Supabase에서 RLS·테이블·함수 권한과 Data API 노출 설정을 확인합니다. 기존 프로젝트와 운영 환경은 건드리지 않습니다.
3. 관리자 인증 구현 후 정상 관리자, 비관리자, 만료·로그아웃 세션, 타인 데이터 및 서버 우회 요청을 실제 API와 DB에서 검증합니다. 요청마다 서버에서 인증과 역할을 확인합니다.
4. 공개 읽기 정책 구현 시 비공개 강좌·주차·기수의 직접 식별자 접근과 관계 데이터 노출도 검증하고, 신청·문의 개인정보에는 별도의 최소 권한을 적용합니다.

참고: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Data API 보안](https://supabase.com/docs/guides/api/securing-your-api), [API 키 안내](https://supabase.com/docs/guides/getting-started/api-keys), [Data API 자동 노출 변경](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically).
