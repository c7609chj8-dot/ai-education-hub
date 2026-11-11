-- 14일차 검토용 초안. 원격 DB에 실행하지 않습니다. 8~12일차 초안이 선행됩니다.
-- `reviewed`도 정원을 차지하므로 12일차의 두 정원 집계가 두 상태를 모두 포함해야 합니다.
ALTER TABLE academy.applications DROP CONSTRAINT applications_status_check;
ALTER TABLE academy.applications ADD CONSTRAINT applications_status_check CHECK (status IN ('received','reviewed'));
CREATE INDEX applications_created_id_idx ON academy.applications (created_at DESC, id DESC);

CREATE TABLE academy.application_status_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES academy.applications(id) ON DELETE RESTRICT,
  actor_id uuid NOT NULL,
  from_status text NOT NULL CHECK (from_status = 'received'),
  to_status text NOT NULL CHECK (to_status = 'reviewed'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX application_status_events_application_idx ON academy.application_status_events (application_id, created_at DESC, id DESC);
ALTER TABLE academy.application_status_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON academy.application_status_events FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT (id, application_id, actor_id, from_status, to_status, created_at),
      INSERT (application_id, actor_id, from_status, to_status) ON academy.application_status_events TO service_role;
GRANT SELECT (created_at), UPDATE (status) ON academy.applications TO service_role;

-- 이름 또는 연락처 끝 네 자리로 검색하며 개인정보 전체는 반환하지 않습니다.
-- 관리자 확인은 서버 책임입니다. 공개 역할에는 함수 실행 권한을 부여하지 않습니다.
CREATE FUNCTION public.academy_admin_search_applications(
  p_search text, p_before_at timestamptz, p_before_id uuid, p_limit integer
) RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $function$
  WITH selected AS (
    SELECT a.id, a.offering_id, a.created_at, a.status, c.title AS course_title, o.start_date,
      CASE WHEN length(ap.applicant_name) <= 1 THEN '*'
           ELSE left(ap.applicant_name, 1) || repeat('*', least(length(ap.applicant_name)-1, 2)) END AS masked_name,
      right(ap.contact, 4) AS contact_last4,
      e.created_at AS last_change_at, e.actor_id AS last_actor_id
    FROM academy.applications a
    JOIN academy.application_private ap ON ap.application_id=a.id AND ap.offering_id=a.offering_id
    JOIN academy.offerings o ON o.id=a.offering_id
    JOIN academy.courses c ON c.id=o.course_id
    LEFT JOIN LATERAL (
      SELECT actor_id, created_at FROM academy.application_status_events
      WHERE application_id=a.id ORDER BY created_at DESC, id DESC LIMIT 1
    ) e ON true
    WHERE (p_search IS NULL OR length(btrim(p_search))<=100)
      AND (p_search IS NULL OR p_search !~ '[[:cntrl:]]')
      AND ((p_before_at IS NULL AND p_before_id IS NULL) OR
           (p_before_at IS NOT NULL AND p_before_id IS NOT NULL AND (a.created_at,a.id)<(p_before_at,p_before_id)))
      AND (p_search IS NULL OR btrim(p_search)='' OR
           strpos(lower(ap.applicant_name), lower(btrim(p_search)))>0 OR
           (btrim(p_search) ~ '^[0-9]{4}$' AND right(ap.contact,4)=btrim(p_search)))
    ORDER BY a.created_at DESC, a.id DESC
    LIMIT least(greatest(coalesce(p_limit,20),1),51)
  )
  SELECT jsonb_build_object('items',coalesce(jsonb_agg(to_jsonb(selected) ORDER BY created_at DESC,id DESC),'[]'::jsonb)) FROM selected;
$function$;

CREATE FUNCTION public.academy_admin_review_application(p_id uuid,p_actor_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $function$
DECLARE prior_status text; changed_at timestamptz;
BEGIN
  IF p_id IS NULL OR p_actor_id IS NULL THEN RETURN jsonb_build_object('result','unavailable'); END IF;
  SELECT status INTO prior_status FROM academy.applications WHERE id=p_id FOR UPDATE;
  IF NOT FOUND OR prior_status <> 'received' THEN RETURN jsonb_build_object('result','conflict'); END IF;
  UPDATE academy.applications SET status='reviewed' WHERE id=p_id;
  INSERT INTO academy.application_status_events (application_id, actor_id, from_status, to_status)
    VALUES (p_id, p_actor_id, prior_status, 'reviewed') RETURNING created_at INTO changed_at;
  RETURN jsonb_build_object('result','reviewed','changed_at',changed_at,'actor_id',p_actor_id);
END;
$function$;
REVOKE ALL ON FUNCTION public.academy_admin_search_applications(text,timestamptz,uuid,integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.academy_admin_review_application(uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.academy_admin_search_applications(text,timestamptz,uuid,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.academy_admin_review_application(uuid,uuid) TO service_role;
