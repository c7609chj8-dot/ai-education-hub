# 신규 수동 백업·격리 복원 절차 — 미실행 준비안

이 문서는 실제 백업/복원 성공 보고서가 아니다. 현재 실제 백업 파일을 찾지 못했고 DB 연결 자격증명도 설정되지 않아 아래 원격 명령은 실행하지 않았다. 기존 파일 삭제·덮어쓰기·실제 DB 쓰기·A1/A2 실행은 포함하지 않는다.

## 1. 대상과 범위

- 대상은 `ai-education-hub-dev` / `uenvjqgylrevujdjpfed`로 고정한다.
- 새 백업 폴더 후보는 실제 계정의 `C:\Users\pc\Documents\ai-education-hub-dev-backups`다. 원래 예시의 `USER`를 그대로 사용하지 않는다. 기존 폴더가 있으면 보존하고 새 시각/고유 이름의 하위 폴더를 만든다.
- 백업은 개인정보·관리자 자료를 포함할 수 있다. GitHub·공개 웹 폴더·PR·채팅에 덤프/로그/자격증명을 올리지 않는다. 로컬 제한 폴더와 암호화 저장소를 사용한다. 도구 ZIP이 있는 OneDrive 작업 폴더를 실제 DB 덤프의 기본 저장소로 사용하지 않는다.
- 단순한 강좌 JSON, 소스 migration, A1/A2 SQL 해시, 가상 복원 결과는 실제 백업을 대체하지 않는다.

## 2. 안전한 로컬 접속

1. Supabase Dashboard에서 프로젝트명/ID를 확인하고 Connect의 Direct 또는 Session pooler 정보를 **사용자 본인 로컬 터미널에만** 입력한다. Transaction pooler는 덤프 대상으로 사용하지 않는다.
2. Direct가 IPv6 제약으로 접속되지 않으면 같은 프로젝트의 Session pooler(통상 5432)를 사용한다. 호스트를 추측하지 않고 Connect 화면의 값을 사용한다.
3. 비밀번호를 URL·PowerShell 명령·환경변수·쉘 기록에 넣지 않는다. 준비된 `psql.exe`, `pg_dump.exe`, `pg_dumpall.exe`의 `-W` 옵션을 사용하면 각 명령이 터미널에서 비밀번호를 숨겨 입력받는다. 채팅/스크린샷/세션 녹화를 통해 입력하지 않는다.
4. 반복 접속이 필요하면 로컬 전용 `PGPASSFILE`도 가능하지만, 사용자 전용 ACL을 설정한 동기화되지 않는 파일로 관리한다. Windows는 파일 권한을 자동 검사하지 않으므로 접근제한을 직접 확인한다. 이번 작업에서는 해당 파일을 만들지 않았다.
5. TLS는 `verify-full`과 프로젝트의 공식 CA 파일로 구성한다. 인증서 오류를 우회하거나 보안 수준을 낮추지 않는다.

아래는 **사용자가 별도 로컬 PowerShell에서 검토 후 실행할 예시**다. 원격 쓰기를 기본 차단하고 비밀번호는 `-W` 프롬프트로만 입력한다.

```powershell
$pgBin = 'C:\Users\pc\OneDrive\문서\ChatGPT\미래교육관\backup-tools\postgresql-17.11\bin'
$env:PGHOST = Read-Host '프로젝트 Connect의 DB 호스트(비밀번호 제외)'
$env:PGPORT = '5432'
$env:PGDATABASE = 'postgres'
$env:PGUSER = Read-Host '프로젝트 Connect의 DB 사용자명'
$env:PGSSLMODE = 'verify-full'
$env:PGSSLROOTCERT = Read-Host '공식 CA 인증서의 로컬 전체 경로'
$env:PGOPTIONS = '-c default_transaction_read_only=on -c lock_timeout=10000'
```

Direct 사용자명은 일반적으로 `postgres`, Session pooler는 `postgres.uenvjqgylrevujdjpfed`다. 사용자가 Dashboard의 해당 프로젝트와 다시 대조해야 한다. API publishable/service 키는 DB 비밀번호를 대신하지 않는다. 기존 비밀번호를 모르면 이 단계에서 중단한다. 비밀번호 초기화나 역할 권한 확대를 자동으로 진행하지 않는다.

## 3. 실제 스냅샷 후보 생성

우선 연결 대상·서버 버전·읽기 전용 여부와 백업 시작 시각을 기록한다. 실제 schema/owner/RLS/ACL/RPC 정의 및 기준 데이터 지문도 같은 시점의 비교 자료로 안전하게 확보한다. 여러 파일/역할 덤프를 취합할 때는 시점 차이가 있으므로 전후 변경 여부를 확인한다.

다음은 원본을 변경하지 않는 **전체 DB custom archive와 역할 후보**의 예시다. 실제 Supabase 관리 스키마 권한 때문에 실패할 수 있으며, 성공/복원 범위는 파일 생성 뒤 별도로 검증해야 한다.

```powershell
$backupRoot = 'C:\Users\pc\Documents\ai-education-hub-dev-backups'
$backupRun = Join-Path $backupRoot ((Get-Date -Format 'yyyyMMdd-HHmmss') + '-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $backupRun -ErrorAction Stop | Out-Null
$archive = Join-Path $backupRun 'database.dump.partial'
& "$pgBin\pg_dump.exe" -W --format=custom --file=$archive
if ($LASTEXITCODE -ne 0) { throw '백업 실패: 부분 파일을 보존하고 원인을 확인합니다.' }
$rolesFile = Join-Path $backupRun 'roles.sql.partial'
& "$pgBin\pg_dumpall.exe" -W --roles-only --no-role-passwords --file=$rolesFile
if ($LASTEXITCODE -ne 0) { throw '역할 후보 백업 실패: 백업 조건 미충족입니다.' }
& "$pgBin\pg_restore.exe" --list $archive > (Join-Path $backupRun 'archive-list.txt')
if ($LASTEXITCODE -ne 0) { throw '아카이브 목록 검사 실패' }
```

- `.partial`은 복원 검증 전 후보라는 뜻이다. 정상 종료나 `pg_restore --list`만으로 복원 가능 판정을 하지 않는다.
- 기본 덤프의 ownership/ACL을 보존한다. `--no-owner`, `--no-acl`, 오류 무시로 통과시키지 않는다. 역할 비밀번호는 위 후보에 포함되지 않는다.
- 실제 migration 이력(`supabase_migrations`), 필요한 확장·관리 스키마 및 사용자 정의 Auth/Storage 변경이 포함되는지 확인한다. 누락이 있으면 완전한 후보로 인정하지 않는다.
- 전체 pg_dump가 Supabase 내부 객체 권한 등으로 실패하면 오류를 숨기거나 원격 GRANT를 변경하지 않는다. Supabase 공식 CLI의 필터링된 roles/schema/data 및 migration 이력 백업 경로를 검토한다. CLI 경로에는 Docker 등 추가 준비가 필요하며 현재 PC에는 준비되지 않았다. 필터링해 제외한 범위를 반드시 명시한다.
- 상위 폴더를 이미 사용하고 있더라도 기존 파일을 수정/삭제하지 않는다. 이 예시는 새 실행 폴더에만 쓴다.

## 4. SHA-256 및 최신성

- 생성된 실제 덤프·역할 후보·스키마/권한 비교 자료 각각의 크기·생성 시각·SHA-256을 기록한다.
- `Get-FileHash -Algorithm SHA256 -LiteralPath <실제파일>`로 해시를 생성하고, 별도 보관한 매니페스트와 **다시 계산한 값**을 대조한다. 해시 생성 자체는 과거 백업과의 일치/신뢰성을 입증하지 않는다.
- 원본 프로젝트 ID·백업 시각·서버/도구 버전·덤프 옵션·포함/제외 범위·종료 코드·기준 행 수/지문을 함께 기록한다. 백업 후 DB가 바뀌면 최신성과 적용 조건을 다시 평가한다.
- 도구 ZIP·소스 SQL·조사 CSV의 해시는 DB 백업 해시로 보고하지 않는다.

## 5. 실제 파일 격리 복원

1. 새 PostgreSQL 17 클러스터를 빈 데이터 폴더·고유 localhost 포트로 준비한다. 호스트는 `127.0.0.1`에만 바인딩하고 기존 Supabase 연결 환경변수를 별도 터미널에서 제거한다. 원격 복원 접속 문자열을 받는 스크립트를 사용하지 않는다.
2. `pg_restore --file` 또는 SQL 텍스트 검토로 대상 객체와 외부 부작용을 확인한다. 복원은 SQL 코드를 실행하므로 덤프 출처와 대상을 먼저 확정한다.
3. 역할·확장·Auth 참조 등 실제 의존성을 복원한다. 일반 PostgreSQL 17에 없는 Supabase 전용 객체가 필요하면 해당 복원은 실패로 기록하고 폐기 가능한 로컬 Supabase 환경을 준비한다. 가상 `auth.users`/`auth.uid`로 대체해 전체 복원이 성공했다고 판정하지 않는다.
4. `pg_restore --exit-on-error --single-transaction`으로 **새 로컬 DB에만** 복원한다. owner/ACL을 제거하지 않는다. 역할/확장 선행 단계는 별도 트랜잭션이므로 실패해도 앞선 객체가 남을 수 있다. 원본에는 어떤 복원 명령도 실행하지 않는다.
5. 5강좌/60주차/비공개 기수1건은 과거 기준선이다. 실제 백업의 최신 기준선과 맞는지 확인하고, 행별 지문·UUID/FK·공개 상태·시퀀스·정책·소유권·테이블/열 GRANT·default ACL·역할 멤버십·RPC v2 정의와 실행 권한을 대조한다.
6. anon/authenticated/service_role의 공개 조회·비인가 조회/쓰기 차단을 로컬에서 검사한다. 관리자 RPC 회귀는 복원본의 실제 객체를 대상으로 한다. 개인정보가 포함된 출력은 기록하지 않는다.
7. 자동 정리로 원본/기존 백업을 삭제하지 않는다. 이번 지시에서 기존 파일 삭제는 금지다. 임시 복원 서버는 검증 후 정상 종료하고 보존 경로와 결과를 기록한다.

## 6. 미검증 범위와 다음 게이트

전체 Auth 계정/세션/OAuth/SMTP/JWT 설정, Storage 실제 파일, 전역 로그인 자격증명, Vault/암호화 키, Edge Functions·프로젝트 설정은 별도 검증 범위다. SQL/역할 덤프와 로컬 restore만으로 전체 Supabase 서비스 복원을 보장하지 않는다.

실제 파일의 무결성·복원·기준선 비교가 통과한 뒤 A1/A2의 기존 읽기 전용 preflight를 다시 실행한다. UUID/slug 충돌·새 객체·B-04·보안 drift·SQL 해시를 점검하고, 하나라도 불일치하면 중단한다. **이번 요청은 A1/A2 실행을 승인하지 않으므로 preflight가 통과해도 실제 실행하지 않는다.**

## 출처

- [PostgreSQL 17 pg_dump](https://www.postgresql.org/docs/17/app-pgdump.html)
- [PostgreSQL Windows 비밀번호 파일](https://www.postgresql.org/docs/17/libpq-pgpass.html)
- [Supabase 공식 백업·복구 절차](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)
