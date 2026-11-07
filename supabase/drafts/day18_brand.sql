-- 18일차 검토 초안: 개발/운영 DB에 적용하지 않음.
CREATE TABLE academy.brand_settings (
 id boolean PRIMARY KEY DEFAULT true CHECK (id),
 name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 80),
 slogan text NOT NULL CHECK (length(btrim(slogan)) BETWEEN 1 AND 160),
 email text CHECK (email IS NULL OR (length(email)<=254 AND email ~ '^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$')),
 phone text CHECK (phone IS NULL OR (length(phone) BETWEEN 6 AND 30 AND phone ~ '^[0-9+() -]+$')),
 address text CHECK (address IS NULL OR length(btrim(address)) BETWEEN 1 AND 200),
 is_public boolean NOT NULL DEFAULT false,
 revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE academy.brand_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON academy.brand_settings FROM PUBLIC,anon,authenticated,service_role;
GRANT USAGE ON SCHEMA academy TO anon,authenticated,service_role;
GRANT SELECT (name,slogan,email,phone,address,is_public) ON academy.brand_settings TO anon,authenticated;
CREATE POLICY brand_settings_select_public ON academy.brand_settings FOR SELECT TO anon,authenticated USING (is_public);
CREATE VIEW public.published_brand_settings WITH (security_invoker=true) AS
 SELECT name,slogan,email,phone,address FROM academy.brand_settings WHERE is_public;
REVOKE ALL ON public.published_brand_settings FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.published_brand_settings TO anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON academy.brand_settings TO service_role;
CREATE TABLE academy.brand_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_id uuid NOT NULL,
 revision integer NOT NULL CHECK (revision>0), created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE academy.brand_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON academy.brand_events FROM PUBLIC,anon,authenticated,service_role;
GRANT INSERT,SELECT ON academy.brand_events TO service_role;
CREATE FUNCTION public.academy_admin_get_brand() RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $fn$
 SELECT to_jsonb(b) FROM academy.brand_settings b WHERE id=true;
$fn$;
CREATE FUNCTION public.academy_admin_save_brand(p_revision integer,p_name text,p_slogan text,p_email text,p_phone text,p_address text,p_public boolean,p_actor uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE v_revision integer;
BEGIN
 IF p_revision IS NULL OR p_revision<0 OR p_actor IS NULL OR p_public IS NULL OR p_name IS NULL OR length(btrim(p_name)) NOT BETWEEN 1 AND 80 OR p_slogan IS NULL OR length(btrim(p_slogan)) NOT BETWEEN 1 AND 160 OR (p_email IS NOT NULL AND (length(p_email)>254 OR p_email !~ '^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$')) OR (p_phone IS NOT NULL AND (length(p_phone) NOT BETWEEN 6 AND 30 OR p_phone !~ '^[0-9+() -]+$')) OR (p_address IS NOT NULL AND length(btrim(p_address)) NOT BETWEEN 1 AND 200) THEN RETURN jsonb_build_object('result','invalid'); END IF;
 IF p_revision=0 THEN
  INSERT INTO academy.brand_settings(id,name,slogan,email,phone,address,is_public) VALUES(true,btrim(p_name),btrim(p_slogan),p_email,p_phone,btrim(p_address),p_public) ON CONFLICT (id) DO NOTHING RETURNING revision INTO v_revision;
 ELSE
  UPDATE academy.brand_settings SET name=btrim(p_name),slogan=btrim(p_slogan),email=p_email,phone=p_phone,address=btrim(p_address),is_public=p_public,revision=revision+1,updated_at=now() WHERE id=true AND revision=p_revision RETURNING revision INTO v_revision;
 END IF;
 IF v_revision IS NULL THEN RETURN jsonb_build_object('result','conflict'); END IF;
 INSERT INTO academy.brand_events(actor_id,revision) VALUES(p_actor,v_revision);
 RETURN jsonb_build_object('result','saved','revision',v_revision);
END;
$fn$;
REVOKE ALL ON FUNCTION public.academy_admin_get_brand() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.academy_admin_save_brand(integer,text,text,text,text,text,boolean,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.academy_admin_get_brand() TO service_role;
GRANT EXECUTE ON FUNCTION public.academy_admin_save_brand(integer,text,text,text,text,text,boolean,uuid) TO service_role;
