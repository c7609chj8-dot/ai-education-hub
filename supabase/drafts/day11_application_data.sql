-- 검토용 초안: 원격 DB에 실행하지 않습니다. 개인정보·동의 및 보유 정책을 확정해야 합니다.
-- 12일차의 원자적 정원/중복 처리 전에는 신청을 저장할 수 있는 공개 경로를 만들지 않습니다.

CREATE TABLE academy.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offering_id uuid NOT NULL REFERENCES academy.offerings(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'received' CHECK (status = 'received'),
  notice_version text NOT NULL CHECK (notice_version ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$'),
  acknowledged_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE academy.application_private (
  application_id uuid PRIMARY KEY REFERENCES academy.applications(id) ON DELETE RESTRICT,
  applicant_name text NOT NULL CHECK (length(btrim(applicant_name)) BETWEEN 1 AND 100),
  contact text NOT NULL CHECK (length(btrim(contact)) BETWEEN 1 AND 32)
);

CREATE INDEX applications_offering_id_idx ON academy.applications (offering_id);
ALTER TABLE academy.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE academy.application_private ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON academy.applications, academy.application_private FROM PUBLIC, anon, authenticated, service_role;
-- RLS 정책, 쓰기 함수, 역할별 부여와 이름·연락처 중복 정책은 이후 검토합니다.
