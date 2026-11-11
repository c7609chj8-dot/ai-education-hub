-- B-04 day 1 schema candidate. Run only inside a disposable database transaction.
-- Applying this candidate activates the existing v2 application-integration guard.
-- A reviewed v2 transaction integration is required before hosted application.
-- Name/phone comparison and cancellation policies below are test assumptions.

CREATE TABLE academy.application_notices (
  version text PRIMARY KEY CHECK (version ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$'),
  body text NOT NULL CHECK (length(btrim(body)) > 0),
  retention_statement text NOT NULL CHECK (length(btrim(retention_statement)) > 0),
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE academy.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offering_id uuid NOT NULL REFERENCES academy.offerings(id) ON DELETE RESTRICT,
  request_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'received'
    CHECK (status IN ('received', 'reviewed', 'cancelled')),
  notice_version text NOT NULL REFERENCES academy.application_notices(version) ON DELETE RESTRICT,
  acknowledged_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz,
  seat_released_at timestamptz,
  retention_due_at timestamptz,
  UNIQUE (id, offering_id),
  UNIQUE (offering_id, request_id),
  CHECK ((status = 'cancelled') = (cancelled_at IS NOT NULL)),
  CHECK (cancelled_at IS NULL OR cancelled_at >= created_at),
  CHECK (seat_released_at IS NULL OR
    (cancelled_at IS NOT NULL AND seat_released_at >= cancelled_at)),
  CHECK (retention_due_at IS NULL OR retention_due_at >= created_at)
);

CREATE TABLE academy.application_private (
  application_id uuid PRIMARY KEY,
  offering_id uuid NOT NULL,
  applicant_name text NOT NULL CHECK (
    length(applicant_name) BETWEEN 1 AND 100 AND
    applicant_name = btrim(applicant_name) AND
    applicant_name !~ '[[:cntrl:]]'
  ),
  contact text NOT NULL CHECK (contact ~ '^[0-9]{9,15}$'),
  FOREIGN KEY (application_id, offering_id)
    REFERENCES academy.applications(id, offering_id) ON DELETE RESTRICT,
  UNIQUE (offering_id, applicant_name, contact)
);

CREATE TABLE academy.application_status_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES academy.applications(id) ON DELETE RESTRICT,
  event_type text NOT NULL CHECK (event_type IN ('received', 'reviewed', 'cancelled', 'seat_released')),
  from_status text CHECK (from_status IN ('received', 'reviewed', 'cancelled')),
  to_status text NOT NULL CHECK (to_status IN ('received', 'reviewed', 'cancelled')),
  actor_kind text NOT NULL CHECK (actor_kind IN ('system', 'admin')),
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((actor_kind = 'admin') = (actor_id IS NOT NULL)),
  CHECK ((event_type = 'received') = (from_status IS NULL)),
  CHECK (
    (event_type = 'received' AND from_status IS NULL AND to_status = 'received' AND actor_kind = 'system') OR
    (event_type = 'reviewed' AND from_status = 'received' AND to_status = 'reviewed' AND actor_kind = 'admin') OR
    (event_type = 'cancelled' AND from_status IN ('received', 'reviewed') AND to_status = 'cancelled' AND actor_kind = 'admin') OR
    (event_type = 'seat_released' AND from_status = 'cancelled' AND to_status = 'cancelled' AND actor_kind = 'admin')
  )
);

CREATE INDEX b04_application_seat_holders_idx ON academy.applications(offering_id)
  WHERE seat_released_at IS NULL;
CREATE INDEX b04_application_created_idx ON academy.applications(created_at DESC, id DESC);
CREATE INDEX b04_application_events_idx ON academy.application_status_events(application_id, created_at, id);

ALTER TABLE academy.application_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE academy.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE academy.application_private ENABLE ROW LEVEL SECURITY;
ALTER TABLE academy.application_status_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON academy.application_notices, academy.applications,
  academy.application_private, academy.application_status_events
  FROM PUBLIC, anon, authenticated, service_role, academy_offering_executor;

-- No policies, role memberships, RPCs, seeds, or grants are added by this draft.
-- The transaction owner alone can populate fictional fixtures for isolated tests.
