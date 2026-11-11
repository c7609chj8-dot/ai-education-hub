# 백엔드 6일차: 인증과 세션

작성일: 2026년 11월 7일

상태: **구현 및 격리 검증 완료 — 실제 Supabase 계정 로그인·로그아웃·만료 검증과 관리자 인가 대기**.

## 구현 범위

- `/admin/login`에서 이메일과 비밀번호를 서버 액션으로 Supabase Auth에 전달하고, 실패 시 계정 존재 여부를 드러내지 않는 안내를 표시합니다. 실제 계정 발급이나 비밀번호 변경은 수행하지 않았습니다.
- `/admin/session`은 요청마다 서버에서 `getUser()`로 Auth 서버에 사용자를 확인합니다. 확인 실패 또는 세션 만료 시 로그인 화면으로 이동합니다. 이 페이지는 로그인 여부만 보여 주며 관리자 권한을 부여하거나 운영 데이터를 조회하지 않습니다.
- 로그아웃은 현재 세션에 대해 서버에서 처리합니다. Next.js Proxy가 인증 경로의 토큰 쿠키 갱신을 담당하고, 인증 응답은 캐시하지 않도록 설정했습니다. 쿠키는 HttpOnly이며 운영 모드에서 Secure와 SameSite=Lax를 사용합니다.
- 기존 `/admin/demo`는 공개 예시 데이터만 사용하는 시연 화면으로 유지합니다. 실제 관리자 역할과 권한 검사는 별도로 구현해야 하며, 로그인 성공 자체를 관리자 권한으로 취급하지 않습니다.

## 환경 설정

개발 프로젝트의 공개 URL과 publishable 키를 Git에서 제외된 로컬 `.env.local`에만 설정했습니다. 값은 저장소에 기록하지 않습니다. 개발 서버가 이미 실행 중이었다면 환경 설정 반영에 재시작이 필요할 수 있습니다.

- `NEXT_PUBLIC_SUPABASE_URL`: 대상 Supabase 프로젝트 URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: 해당 프로젝트의 publishable 키

운영·Preview 연결은 환경별 프로젝트와 변수를 별도로 확정하고 검증해야 합니다. 이 작업에서는 Vercel 환경변수나 운영 DB를 변경하지 않았습니다. service_role 또는 secret 키는 사용하지 않습니다. 공개 값이 없거나 잘못되면 로그인은 비활성화됩니다.

## 검증과 남은 작업

격리된 가상 인증 서버와 헤드리스 브라우저에서 비로그인 접근 차단, 잘못된 암호 거부, 로그인, 로그아웃, 무효화·만료 세션 차단, HttpOnly·Secure·SameSite 쿠키와 인증 응답의 캐시 방지 헤더를 확인했습니다. 이 검증은 실제 Supabase 인증 또는 관리자 인가 검증을 대체하지 않습니다.

개발 프로젝트의 테스트 계정은 사용자가 대시보드에서 준비할 예정이며, 준비 후 실제 로그인·로그아웃·만료 및 쿠키 갱신을 검증해야 합니다. 계정 비밀번호는 저장소나 채팅에 기록하지 않습니다. 관리자 계정 소유자, 역할과 권한 회수·복구 방식이 아직 정해지지 않아 실제 운영 기능 접근은 7일차 인가 구현 및 검증 후 연결해야 합니다.

기존 `public.rls_auto_enable()`의 보안 경고 2건은 미해결 상태이며, 기존 DB 구조와 권한은 이번 작업에서 변경하지 않았습니다. 운영 환경은 수정하지 않았습니다.

참고: [Supabase 서버 측 인증](https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs), [Supabase SSR 고급 안내](https://supabase.com/docs/guides/auth/server-side/advanced-guide), [5일차 보안 검토](backend-day05-security.md).
