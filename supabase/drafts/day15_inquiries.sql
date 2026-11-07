-- 15일차 검토용 초안. 원격 DB에 적용하지 않습니다.
-- 실제 개인정보·안내·보존 및 오용 방지 정책 확정 전에는 사용하지 않습니다.
CREATE TABLE academy.inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL UNIQUE,
  category text NOT NULL CHECK (category IN ('course','partnership','other')),
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received','in_progress','completed')),
  notice_version text NOT NULL CHECK (notice_version ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE academy.inquiry_private (
  inquiry_id uuid PRIMARY KEY REFERENCES academy.inquiries(id) ON DELETE RESTRICT,
  sender_name text NOT NULL CHECK (length(btrim(sender_name)) BETWEEN 1 AND 100),
  sender_email text NOT NULL CHECK (length(btrim(sender_email)) BETWEEN 3 AND 254),
  message text NOT NULL CHECK (length(btrim(message)) BETWEEN 1 AND 2000)
);
CREATE TABLE academy.inquiry_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id uuid NOT NULL REFERENCES academy.inquiries(id) ON DELETE RESTRICT,
  actor_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('viewed','status_changed')),
  from_status text,
  to_status text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((kind='viewed' AND from_status IS NULL AND to_status IS NULL) OR
         (kind='status_changed' AND from_status IS NOT NULL AND to_status IS NOT NULL AND ((from_status='received' AND to_status='in_progress') OR
                                     (from_status='in_progress' AND to_status='completed'))))
);
CREATE INDEX inquiries_created_id_idx ON academy.inquiries(created_at DESC,id DESC);
CREATE INDEX inquiry_events_inquiry_id_idx ON academy.inquiry_events(inquiry_id,created_at DESC,id DESC);
ALTER TABLE academy.inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE academy.inquiry_private ENABLE ROW LEVEL SECURITY;
ALTER TABLE academy.inquiry_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON academy.inquiries, academy.inquiry_private, academy.inquiry_events FROM PUBLIC, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA academy TO service_role;
GRANT SELECT (id,request_id,category,status,notice_version,created_at),
      INSERT (request_id,category,notice_version), UPDATE (status) ON academy.inquiries TO service_role;
GRANT SELECT (inquiry_id,sender_name,sender_email,message), INSERT (inquiry_id,sender_name,sender_email,message)
      ON academy.inquiry_private TO service_role;
GRANT SELECT (id,inquiry_id,actor_id,kind,from_status,to_status,created_at),
      INSERT (inquiry_id,actor_id,kind,from_status,to_status) ON academy.inquiry_events TO service_role;

-- 동의 버전의 유효성·요청 제한과 오용 방지는 호출 서버가 확인해야 합니다.
CREATE FUNCTION public.academy_submit_inquiry(p_request_id uuid,p_category text,p_name text,p_email text,p_message text,p_notice_version text)
RETURNS text LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $function$
DECLARE v_id uuid; v_existing uuid; v_category text; v_notice text; v_name text; v_email text; v_message text;
BEGIN
  IF p_request_id IS NULL OR p_category IS NULL OR p_category NOT IN ('course','partnership','other') OR
     p_name IS NULL OR p_email IS NULL OR p_message IS NULL OR p_notice_version IS NULL OR
     p_notice_version !~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$' OR
     length(btrim(p_name)) NOT BETWEEN 1 AND 100 OR p_name ~ '[[:cntrl:]]' OR
     length(btrim(p_email)) NOT BETWEEN 3 AND 254 OR btrim(p_email) !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' OR
     length(btrim(p_message)) NOT BETWEEN 1 AND 2000 OR
     replace(replace(replace(p_message,chr(10),''),chr(13),''),chr(9),'') ~ '[[:cntrl:]]' THEN RETURN 'unavailable'; END IF;
  INSERT INTO academy.inquiries(request_id,category,notice_version) VALUES(p_request_id,p_category,p_notice_version)
    ON CONFLICT (request_id) DO NOTHING RETURNING id INTO v_id;
  IF v_id IS NULL THEN
    SELECT i.id,i.category,i.notice_version,p.sender_name,p.sender_email,p.message
      INTO v_existing,v_category,v_notice,v_name,v_email,v_message
      FROM academy.inquiries i JOIN academy.inquiry_private p ON p.inquiry_id=i.id WHERE i.request_id=p_request_id;
    IF FOUND AND v_category=p_category AND v_notice=p_notice_version AND v_name=btrim(p_name) AND
       v_email=btrim(p_email) AND v_message=btrim(p_message) THEN RETURN 'accepted'; END IF;
    RETURN 'unavailable';
  END IF;
  INSERT INTO academy.inquiry_private(inquiry_id,sender_name,sender_email,message)
    VALUES(v_id,btrim(p_name),btrim(p_email),btrim(p_message));
  RETURN 'accepted';
END;
$function$;

-- 목록에는 마스킹된 이름만 반환합니다. 검색어는 이름에 한정합니다.
CREATE FUNCTION public.academy_admin_search_inquiries(p_search text,p_before_at timestamptz,p_before_id uuid,p_limit integer)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $function$
  WITH selected AS (
    SELECT i.id,i.category,i.status,i.created_at,
      CASE WHEN length(p.sender_name)<=1 THEN '*' ELSE left(p.sender_name,1)||repeat('*',least(length(p.sender_name)-1,2)) END AS masked_name,
      e.created_at AS last_change_at,e.actor_id AS last_actor_id
    FROM academy.inquiries i JOIN academy.inquiry_private p ON p.inquiry_id=i.id
    LEFT JOIN LATERAL (SELECT created_at,actor_id FROM academy.inquiry_events WHERE inquiry_id=i.id AND kind='status_changed'
                       ORDER BY created_at DESC,id DESC LIMIT 1) e ON true
    WHERE (p_search IS NULL OR length(btrim(p_search))<=100) AND (p_search IS NULL OR p_search !~ '[[:cntrl:]]')
      AND ((p_before_at IS NULL AND p_before_id IS NULL) OR
           (p_before_at IS NOT NULL AND p_before_id IS NOT NULL AND (i.created_at,i.id)<(p_before_at,p_before_id)))
      AND (p_search IS NULL OR btrim(p_search)='' OR strpos(lower(p.sender_name),lower(btrim(p_search)))>0)
    ORDER BY i.created_at DESC,i.id DESC LIMIT least(greatest(coalesce(p_limit,20),1),51)
  ) SELECT jsonb_build_object('items',coalesce(jsonb_agg(to_jsonb(selected) ORDER BY created_at DESC,id DESC),'[]'::jsonb)) FROM selected;
$function$;

-- 상세 제공과 접근 이력을 하나의 트랜잭션으로 처리합니다.
CREATE FUNCTION public.academy_admin_read_inquiry(p_id uuid,p_actor_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $function$
DECLARE v_result jsonb;
BEGIN
  IF p_id IS NULL OR p_actor_id IS NULL THEN RETURN NULL; END IF;
  SELECT jsonb_build_object('id',i.id,'category',i.category,'status',i.status,'created_at',i.created_at,
    'name',p.sender_name,'email',p.sender_email,'message',p.message) INTO v_result
    FROM academy.inquiries i JOIN academy.inquiry_private p ON p.inquiry_id=i.id WHERE i.id=p_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  INSERT INTO academy.inquiry_events(inquiry_id,actor_id,kind) VALUES(p_id,p_actor_id,'viewed');
  RETURN v_result;
END;
$function$;

CREATE FUNCTION public.academy_admin_advance_inquiry(p_id uuid,p_actor_id uuid,p_expected text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $function$
DECLARE v_status text; v_next text; v_at timestamptz;
BEGIN
  IF p_id IS NULL OR p_actor_id IS NULL OR p_expected IS NULL OR p_expected NOT IN ('received','in_progress') THEN
    RETURN jsonb_build_object('result','unavailable'); END IF;
  SELECT status INTO v_status FROM academy.inquiries WHERE id=p_id FOR UPDATE;
  IF NOT FOUND OR v_status <> p_expected THEN RETURN jsonb_build_object('result','conflict'); END IF;
  v_next := CASE WHEN v_status='received' THEN 'in_progress' ELSE 'completed' END;
  UPDATE academy.inquiries SET status=v_next WHERE id=p_id;
  INSERT INTO academy.inquiry_events(inquiry_id,actor_id,kind,from_status,to_status)
    VALUES(p_id,p_actor_id,'status_changed',v_status,v_next) RETURNING created_at INTO v_at;
  RETURN jsonb_build_object('result',v_next,'changed_at',v_at,'actor_id',p_actor_id);
END;
$function$;
REVOKE ALL ON FUNCTION public.academy_submit_inquiry(uuid,text,text,text,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.academy_admin_search_inquiries(text,timestamptz,uuid,integer) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.academy_admin_read_inquiry(uuid,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.academy_admin_advance_inquiry(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.academy_submit_inquiry(uuid,text,text,text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.academy_admin_search_inquiries(text,timestamptz,uuid,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.academy_admin_read_inquiry(uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.academy_admin_advance_inquiry(uuid,uuid,text) TO service_role;
