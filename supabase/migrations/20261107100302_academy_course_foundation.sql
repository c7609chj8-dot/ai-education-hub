-- 강좌·주차·기수의 비공개 기초 스키마. 트랜잭션은 마이그레이션 실행기가 관리합니다.
-- 실제 개인정보, 예시 신청·문의, 시드 데이터는 포함하지 않습니다.
-- 공개 정책과 관리자 권한은 별도로 검토합니다.


CREATE SCHEMA academy;
REVOKE ALL ON SCHEMA academy FROM PUBLIC, anon, authenticated;

CREATE TABLE academy.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text NOT NULL CHECK (length(btrim(title)) > 0),
  category text NOT NULL CHECK (length(btrim(category)) > 0),
  summary text NOT NULL CHECK (length(btrim(summary)) > 0),
  audience text NOT NULL CHECK (length(btrim(audience)) > 0),
  result_artifact text NOT NULL CHECK (length(btrim(result_artifact)) > 0),
  duration_hours integer CHECK (duration_hours IS NULL OR duration_hours > 0),
  publication_state text NOT NULL DEFAULT 'draft'
    CHECK (publication_state IN ('draft', 'published', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE academy.course_weeks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES academy.courses(id) ON DELETE RESTRICT,
  week_number integer NOT NULL CHECK (week_number > 0),
  title text NOT NULL CHECK (length(btrim(title)) > 0),
  UNIQUE (course_id, week_number)
);

-- 상태명과 전이는 운영 정책 확정 전의 후보입니다.
CREATE TABLE academy.offerings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES academy.courses(id) ON DELETE RESTRICT,
  start_date date,
  end_date date,
  enrollment_opens_at timestamptz,
  enrollment_closes_at timestamptz,
  location text,
  capacity integer NOT NULL CHECK (capacity >= 0),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'open', 'closed', 'finished', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date),
  CHECK (enrollment_closes_at IS NULL OR enrollment_opens_at IS NULL OR enrollment_closes_at >= enrollment_opens_at)
);

CREATE INDEX offerings_course_id_idx ON academy.offerings (course_id);

ALTER TABLE academy.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE academy.course_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE academy.offerings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA academy FROM PUBLIC, anon, authenticated;
