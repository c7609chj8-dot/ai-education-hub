# 프론트엔드 최종 검수 및 백업 준비 결과

확인일: 2026-11-11 (한국시간). PR #37 `codex/ai-fusion-branding`.

## 결론

- 프론트엔드는 이번 검수 범위에서 차단 오류가 발견되지 않아 사용자 검수용 완료 상태로 판단한다.
- 검수한 코드: `34d07e1c671337b046bfdbe257d57498ffcd3b48`.
- [최종 검수 Preview](https://ai-education-2ympyxg7f-time-6148.vercel.app/)의 주요 화면과 시연 동작을 재점검했다.
- 실제 백업은 발견하지 못했다. 백업 SHA-256·최신 DB 일치·실제 백업 격리 복원은 미검증이다.
- PostgreSQL 17.11 백업 클라이언트 준비는 완료했지만, 이를 DB 백업 완료로 간주하지 않는다.
- 백업 게이트가 미충족이므로 A1/A2 적용 전 전체 preflight는 재실행하지 않았다. 실제 A1/A2·데이터 변경·공개 전환·main 병합·Production 배포도 하지 않았다.

## 프론트엔드 최종 점검

| 항목 | 실제 확인 결과 |
|---|---|
| 메인·브랜드 | AI융합대학, 정확한 슬로건, 두 로고 배치 유지 |
| PC·모바일 헤더 | 같은 코드의 앞선 1440/390/360 검수 통과, 이번에도 모바일 메뉴 열기·Escape 닫기·초점 복귀와 가로 넘침 없음 확인 |
| 메뉴 | 교육과정·일정·성과·교육정보 하위 공지/자료실/FAQ·협력 링크 확인 |
| 새 6개 상세 | 각 학과명·해당 slug 이미지·12주·실습 12개·초안 표시·학과별 일정 링크 확인 |
| 검색 | ‘음악’ 입력 시 AI 음악제작학과 1개 표시 |
| 일정 | 목록 전환 정상, 시연용 예시 일정 안내 및 새 demo ID 신청 링크 확인 |
| 신청 시연 | 빈 제출 오류 3개와 이름으로 초점 이동, 가상 입력 후 ‘시연 완료 · 실제 접수 아님’ 확인 |
| 소개·성과·공지·FAQ·문의·협력·자료실 | 브라우저 제목·H1·홈 링크·가로 넘침 없음 확인 |
| 기존 주소 | HTTP 검사에서 이전 5개 과정/신청 시연 주소·별칭 리디렉션 유지 |
| 실제 UUID 신청·관리자 API | HTTP 검사에서 실제 UUID 404, 비인증 관리자 API 401 확인 |

6개 상세의 canonical slug는 `ai-management`, `ai-music`, `ai-aerial-video`, `ai-multimedia`, `ai-programming`, `ai-advertising-video`를 유지한다. 총 72주차와 72개 과제는 검토용 초안이며, 교육시간·실제 모집 일정은 미확정이다. 실제 신청 전송/저장 기능은 추가하거나 활성화하지 않았다.

### 검사 근거와 한계

- 이번 실행: 최종 코드의 로컬 production-mode 빌드에서 `verify-ai-fusion-stage3-http.mjs`, `verify-ai-fusion-frontend-http.mjs` 통과.
- 이번 실행: `verify-admin-auth-gates.mjs`, `verify-application-validation.mjs`, `verify-application-submission.mjs` 격리 회귀 통과. 가상 Auth/제출 검사이며 실제 로그인·실제 정원 경합 테스트를 대신하지 않는다.
- TypeScript·변경 파일 ESLint·Webpack 빌드는 바로 앞 동일 프론트엔드 코드 검수에서 통과했다. 이번에는 프론트엔드 소스를 변경하지 않아 반복 빌드하지 않았다.
- 실제 관리자 로그인 후 DB 쓰기·실제 모바일 기기·스크린리더 전체 조작·실제 B-04 동시 신청은 이번에도 미검증이다.
- 로컬 증거: 작업 폴더 `프론트엔드 검수/최종 완료/departments.json`, `application-complete.png`, `home-360.png`. 원본 화면은 GitHub에 업로드하지 않았다.

## 기존 백업 읽기 전용 검색 결과

| 경로/범위 | 결과 |
|---|---|
| `C:\Users\USER\Documents\ai-education-hub-dev-backups` | 없음 |
| `C:\Users\pc\Documents\ai-education-hub-dev-backups` | 없음 |
| `C:\Users\pc\OneDrive\문서\ai-education-hub-dev-backups` | 없음 |
| 현재 사용자 `C:\Users\pc` 하위 | 같은 이름 폴더 발견 0개 |
| Documents·OneDrive·바탕화면 포함 파일 검색 | 실제 DB `.dump`·`.backup`·백업 SHA-256 자료 발견 0개. SQL 등 후보 79개는 저장소/다른 프로젝트의 소스이며 검증된 DB 백업으로 식별하지 못함 |
| `C:\Program Files\PostgreSQL\17\bin` | 없음 |
| 기존 embedded PostgreSQL | postgres/initdb 17.11 서버는 있음. pg_dump/pg_restore 클라이언트는 기존 패키지에 없음 |

실제 Windows 계정은 `pc`이다. Windows의 Documents 위치는 `C:\Users\pc\OneDrive\문서`, 바탕화면은 `C:\Users\pc\OneDrive\Desktop`으로 확인했다. 검색에는 이 경로가 포함됐다. AppData·node_modules·.git·.next·캐시·가상환경 및 외부 Junction/SymbolicLink 순회는 제외했다. 다른 PC·다른 사용자·현재 PC에 보이지 않는 클라우드 백업은 확인하지 못했다.

발견 파일 79개의 **전체 경로·생성 시각·수정 시각·바이트 크기**는 로컬 `백업 준비 검수/file-inventory.csv`와 JSON에 기록했다. 다른 프로젝트 경로를 포함하므로 해당 목록은 GitHub에 게시하지 않았다. 검색 오류 파일은 비어 있었다. 기존 파일을 수정·삭제하지 않았다.

## 새로 준비한 백업 도구

공식 PostgreSQL Windows 안내가 연결한 EDB의 PostgreSQL 17.11 x64 ZIP에서 클라이언트를 작업 폴더에 준비했다. 시스템 서비스·PATH·Program Files는 변경하지 않았다.

기준 경로: `C:\Users\pc\OneDrive\문서\ChatGPT\미래교육관\backup-tools\postgresql-17.11\bin`.

| 파일 | 크기(바이트) | 현재 PC 생성 시각(KST) | 실행 버전 |
|---|---:|---|---|
| pg_dump.exe | 613888 | 2026-11-11 20:44:39 | 17.11 |
| pg_restore.exe | 371200 | 2026-11-11 20:44:39 | 17.11 |
| pg_dumpall.exe | 194560 | 2026-11-11 20:44:39 | 17.11 |
| psql.exe | 635392 | 2026-11-11 20:44:39 | 17.11 |

- ZIP: 작업 폴더 `backup-tools/postgresql-17.11-windows-x64-binaries.zip`, 381531864바이트, 생성 2026-11-11 20:43:06 KST.
- ZIP SHA-256: `80379B2C04D51C30225532E0AE04509899141E9957ED096FE749D7FD9DF8F82F`.
- 개별 도구 SHA-256·버전·전체 경로: 로컬 `백업 준비 검수/tools-manifest.json`.
- 위 해시는 내려받은 도구/조사 자료의 해시다. **실제 개발 DB 백업 해시가 아니며**, 공급자 서명/별도 공표 체크섬과의 대조 완료도 의미하지 않는다.

## 실제 DB 및 승인 게이트

- Supabase 프로젝트 API로 `ai-education-hub-dev` / `uenvjqgylrevujdjpfed` / ACTIVE_HEALTHY / PostgreSQL `17.11.0.018` 확인.
- 이번에는 연결 비밀번호·접속 URL을 채팅으로 요청하지 않았다. 기존 pgpass/DB 접속 환경 설정도 찾지 못했다. 새 원격 덤프 명령은 실행하지 않았다.
- 이전 실제 DB 기준선 5강좌/60주차/비공개 기수1건을 이번에 다시 SQL로 집계한 것은 아니다. 과거 수치와 현재 검증 결과를 구분한다.
- 실제 백업이 없어 ‘최신 DB와 백업이 같다’는 판단을 할 수 없다. 실제 백업 격리 복원·스키마/소유권/역할/RLS/RPC/GRANT 복원 대조는 모두 미실행이다.
- 기존 `verify-backup-recovery.mjs`는 가상 로컬 DB 연습이다. 이를 실제 Supabase 백업 증거로 사용하거나 이번에 재실행해 게이트를 충족시키지 않았다.
- A1 SQL SHA-256 `655CFD93B8D0C0E7090C2C201A6B294D0E2F5C0B06509E5A7B3A5216E91300F5` 일치.
- A2 SQL SHA-256 `737D574EA15BE5B20C8F5E02376D2DCE0A72C0365B555142B3036DEFBE6D4C95` 일치.
- SQL 해시 일치와 백업 조건 충족은 다르다. 이번 사용자 지시는 실제 A1/A2 실행을 금지하므로, 향후 백업 조건이 충족되더라도 이번 작업에서 실행하지 않는다.

## 다음 작업

1. 다른 PC/OneDrive에서 기존 백업을 찾으면 원본을 보존한 복사본과 기존 매니페스트를 대조한다. 발견하지 못하면 [신규 수동 백업 절차](ai-fusion-manual-backup-procedure.md)에 따라 사용자 로컬 터미널에서 비밀번호를 입력해 실제 스냅샷 후보를 확보한다.
2. 파일 해시·대상·생성 시각·내용/권한 범위를 확인하고 PostgreSQL 17 격리 환경에서 실제 파일을 복원한다.
3. 원본/복원본의 행 수·데이터 지문·FK·주차·기수 UUID·RLS·GRANT·소유권·RPC v2와 마이그레이션 이력을 대조한다. 미검증 범위를 명시한다.
4. 위 조건이 충족된 후에만 최신 읽기 전용 preflight를 수행한다. 실제 Auth·Storage 파일·역할 로그인 자격증명·플랫폼 설정 전체 복원은 별도 범위다.
5. A1/A2 실행·공개 전환·병합·Production 배포는 이번 실행에 포함하지 않는다.

## 출처

- [PR #37](https://github.com/c7609chj8-dot/ai-education-hub/pull/37)
- [검수 Preview](https://ai-education-2ympyxg7f-time-6148.vercel.app/)
- [PostgreSQL Windows 공식 배포 안내](https://www.postgresql.org/download/windows/)
- [EDB 바이너리 배포](https://www.enterprisedb.com/download-postgresql-binaries)
- [Supabase 백업·복구 안내](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)
