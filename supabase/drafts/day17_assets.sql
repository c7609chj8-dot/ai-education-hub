-- 17일차 검토용 초안. 실제 DB나 Storage에 적용하지 않습니다.
-- Storage 버킷 academy-assets는 비공개로 별도 생성·검증해야 합니다.
CREATE TABLE academy.assets (
 id uuid PRIMARY KEY,
 kind text NOT NULL CHECK (kind IN ('resource','outcome')),
 title text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 200),
 description text NOT NULL CHECK (length(btrim(description)) BETWEEN 1 AND 1000),
 mime text NOT NULL CHECK (mime IN ('application/pdf','image/png','image/jpeg','image/webp')),
 byte_size integer NOT NULL CHECK (byte_size BETWEEN 1 AND 2097152),
 object_key text GENERATED ALWAYS AS ('assets/' || id::text || CASE mime WHEN 'application/pdf' THEN '.pdf' WHEN 'image/png' THEN '.png' WHEN 'image/jpeg' THEN '.jpg' WHEN 'image/webp' THEN '.webp' END) STORED UNIQUE,
 is_public boolean NOT NULL DEFAULT false,
 revision integer NOT NULL DEFAULT 1 CHECK (revision>0),
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK (kind <> 'outcome' OR mime <> 'application/pdf')
);
CREATE INDEX assets_created_idx ON academy.assets(created_at DESC,id DESC);
ALTER TABLE academy.assets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON academy.assets FROM PUBLIC,anon,authenticated,service_role;
GRANT USAGE ON SCHEMA academy TO anon,authenticated,service_role;
GRANT SELECT (id,kind,title,description,mime,byte_size,is_public,created_at) ON academy.assets TO anon,authenticated;
CREATE POLICY assets_select_public ON academy.assets FOR SELECT TO anon,authenticated USING (is_public);
CREATE VIEW public.published_assets WITH (security_invoker=true) AS SELECT id,kind,title,description,mime,byte_size,created_at FROM academy.assets WHERE is_public;
REVOKE ALL ON public.published_assets FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.published_assets TO anon,authenticated;
GRANT SELECT (id,kind,title,description,mime,byte_size,object_key,is_public,revision,created_at),
 INSERT (id,kind,title,description,mime,byte_size), UPDATE (title,description,is_public,revision) ON academy.assets TO service_role;
CREATE TABLE academy.asset_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),asset_id uuid NOT NULL REFERENCES academy.assets(id) ON DELETE RESTRICT,
 actor_id uuid NOT NULL,revision integer NOT NULL CHECK (revision>0),created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX asset_events_asset_idx ON academy.asset_events(asset_id,created_at DESC,id DESC);
ALTER TABLE academy.asset_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON academy.asset_events FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT (id,asset_id,actor_id,revision,created_at),INSERT (asset_id,actor_id,revision) ON academy.asset_events TO service_role;

-- 파일 업로드 성공을 서버가 확인한 뒤에만 호출합니다. 함수는 Storage 객체를 직접 검증하지 않습니다.
CREATE FUNCTION public.academy_admin_add_asset(p_id uuid,p_kind text,p_title text,p_description text,p_mime text,p_size integer,p_actor uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $function$
BEGIN
 IF p_id IS NULL OR p_actor IS NULL OR p_kind IS NULL OR p_kind NOT IN ('resource','outcome') OR p_title IS NULL OR length(btrim(p_title)) NOT BETWEEN 1 AND 200 OR p_description IS NULL OR length(btrim(p_description)) NOT BETWEEN 1 AND 1000 OR p_mime IS NULL OR p_mime NOT IN ('application/pdf','image/png','image/jpeg','image/webp') OR (p_kind='outcome' AND p_mime='application/pdf') OR p_size IS NULL OR p_size NOT BETWEEN 1 AND 2097152 THEN RETURN jsonb_build_object('result','invalid');END IF;
 INSERT INTO academy.assets(id,kind,title,description,mime,byte_size) VALUES(p_id,p_kind,btrim(p_title),btrim(p_description),p_mime,p_size);
 INSERT INTO academy.asset_events(asset_id,actor_id,revision) VALUES(p_id,p_actor,1);
 RETURN jsonb_build_object('result','saved','id',p_id,'revision',1);
END;
$function$;
CREATE FUNCTION public.academy_admin_update_asset(p_id uuid,p_revision integer,p_title text,p_description text,p_public boolean,p_actor uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $function$
DECLARE v_revision integer;
BEGIN
 IF p_id IS NULL OR p_actor IS NULL OR p_revision IS NULL OR p_revision<1 OR p_title IS NULL OR length(btrim(p_title)) NOT BETWEEN 1 AND 200 OR p_description IS NULL OR length(btrim(p_description)) NOT BETWEEN 1 AND 1000 OR p_public IS NULL THEN RETURN jsonb_build_object('result','invalid');END IF;
 UPDATE academy.assets SET title=btrim(p_title),description=btrim(p_description),is_public=p_public,revision=revision+1 WHERE id=p_id AND revision=p_revision RETURNING revision INTO v_revision;
 IF v_revision IS NULL THEN RETURN jsonb_build_object('result','conflict');END IF;
 INSERT INTO academy.asset_events(asset_id,actor_id,revision) VALUES(p_id,p_actor,v_revision);
 RETURN jsonb_build_object('result','saved','id',p_id,'revision',v_revision);
END;
$function$;
CREATE FUNCTION public.academy_admin_list_assets(p_before_at timestamptz,p_before_id uuid,p_limit integer)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $function$
 WITH selected AS (SELECT id,kind,title,description,mime,byte_size,is_public,revision,created_at FROM academy.assets
 WHERE (p_before_at IS NULL AND p_before_id IS NULL) OR (p_before_at IS NOT NULL AND p_before_id IS NOT NULL AND (created_at,id)<(p_before_at,p_before_id))
 ORDER BY created_at DESC,id DESC LIMIT least(greatest(coalesce(p_limit,20),1),51))
 SELECT jsonb_build_object('items',coalesce(jsonb_agg(to_jsonb(selected) ORDER BY created_at DESC,id DESC),'[]'::jsonb)) FROM selected;
$function$;
-- 다운로드 서버만 사용합니다. 비공개 객체 키를 반환하지 않습니다.
CREATE FUNCTION public.academy_public_asset_lookup(p_id uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $function$
 SELECT jsonb_build_object('id',id,'kind',kind,'mime',mime,'byte_size',byte_size,'object_key',object_key) FROM academy.assets WHERE id=p_id AND is_public;
$function$;
REVOKE ALL ON FUNCTION public.academy_admin_add_asset(uuid,text,text,text,text,integer,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.academy_admin_update_asset(uuid,integer,text,text,boolean,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.academy_admin_list_assets(timestamptz,uuid,integer) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.academy_public_asset_lookup(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.academy_admin_add_asset(uuid,text,text,text,text,integer,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.academy_admin_update_asset(uuid,integer,text,text,boolean,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.academy_admin_list_assets(timestamptz,uuid,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.academy_public_asset_lookup(uuid) TO service_role;
