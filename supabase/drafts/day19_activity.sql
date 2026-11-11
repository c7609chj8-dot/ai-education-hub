-- 19일차 검토용 초안. 앞선 14~18일차 초안을 선행하며 실제 DB에 적용하지 않습니다.
-- 대상 ID와 담당자 ID도 개인정보가 될 수 있습니다. 내용을 복제하지 않습니다.
CREATE INDEX application_status_events_recent_idx ON academy.application_status_events(created_at DESC,id DESC);
CREATE INDEX inquiry_events_recent_idx ON academy.inquiry_events(created_at DESC,id DESC);
CREATE INDEX content_events_recent_idx ON academy.content_events(created_at DESC,id DESC);
CREATE INDEX asset_events_recent_idx ON academy.asset_events(created_at DESC,id DESC);
CREATE INDEX brand_events_recent_idx ON academy.brand_events(created_at DESC,id DESC);
CREATE TABLE academy.audit_log_reads (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 actor_id uuid NOT NULL,
 category text NOT NULL CHECK (category IN ('application','inquiry','content','asset','brand')),
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE academy.audit_log_reads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON academy.audit_log_reads FROM PUBLIC,anon,authenticated,service_role;
GRANT INSERT (actor_id,category) ON academy.audit_log_reads TO service_role;
-- 읽기 이력 INSERT와 결과 조회는 동일 트랜잭션입니다. 기록 실패시 결과를 반환하지 않습니다.
CREATE FUNCTION public.academy_admin_read_activity(p_category text,p_before_at timestamptz,p_before_id uuid,p_limit integer,p_actor uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE v_result jsonb;
BEGIN
 IF p_actor IS NULL OR p_category IS NULL OR p_category NOT IN ('application','inquiry','content','asset','brand') OR p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 21 OR ((p_before_at IS NULL) <> (p_before_id IS NULL)) THEN RETURN NULL; END IF;
 INSERT INTO academy.audit_log_reads(actor_id,category) VALUES(p_actor,p_category);
 WITH events AS (
  SELECT id,created_at,actor_id,application_id AS target_id,'status_changed'::text AS action,NULL::integer AS revision,from_status,to_status FROM academy.application_status_events WHERE p_category='application'
  UNION ALL SELECT id,created_at,actor_id,inquiry_id,kind,NULL::integer,from_status,to_status FROM academy.inquiry_events WHERE p_category='inquiry'
  UNION ALL SELECT id,created_at,actor_id,content_id,'saved'::text,revision,NULL::text,NULL::text FROM academy.content_events WHERE p_category='content'
  UNION ALL SELECT id,created_at,actor_id,asset_id,'saved'::text,revision,NULL::text,NULL::text FROM academy.asset_events WHERE p_category='asset'
  UNION ALL SELECT id,created_at,actor_id,NULL::uuid,'saved'::text,revision,NULL::text,NULL::text FROM academy.brand_events WHERE p_category='brand'
 ), selected AS (
  SELECT id,created_at,actor_id,target_id,action,revision,from_status,to_status FROM events
  WHERE p_before_at IS NULL OR (created_at,id)<(p_before_at,p_before_id)
  ORDER BY created_at DESC,id DESC LIMIT p_limit
 ) SELECT jsonb_build_object('items',coalesce(jsonb_agg(to_jsonb(selected) ORDER BY created_at DESC,id DESC),'[]'::jsonb)) INTO v_result FROM selected;
 RETURN v_result;
END;
$fn$;
REVOKE ALL ON FUNCTION public.academy_admin_read_activity(text,timestamptz,uuid,integer,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.academy_admin_read_activity(text,timestamptz,uuid,integer,uuid) TO service_role;
